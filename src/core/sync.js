// Cloud-Sync über Supabase (kostenloser Tarif). Ohne Umgebungsvariablen läuft die App lokal.
// Tabelle: records(user_id, key, data, updated_at) mit Row Level Security. Siehe supabase/schema.sql.
import { createClient } from '@supabase/supabase-js';
import * as store from './store.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(URL && KEY);

let client = null;
let session = null;
let status = { state: cloudConfigured ? 'offline' : 'local', last: null, error: null };
const listeners = new Set();
let pushTimer = null;
let busy = false;

export const syncStatus = () => ({ ...status, user: session?.user?.email || null });
export function onSyncStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(patch) {
  status = { ...status, ...patch };
  listeners.forEach((f) => f(syncStatus()));
}

export function getClient() {
  if (!cloudConfigured) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export async function initAuth() {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  session = data.session;
  c.auth.onAuthStateChange((_e, s) => {
    session = s;
    setStatus({});
    if (s) syncNow();
  });
  setStatus({ state: session ? 'idle' : 'offline' });
  return session;
}
export const isLoggedIn = () => Boolean(session);

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session;
  return data;
}
export async function signUp(email, password) {
  const { data, error } = await getClient().auth.signUp({ email, password });
  if (error) throw error;
  session = data.session;
  return data;
}
export async function sendCode(email) {
  const { error } = await getClient().auth.signInWithOtp({ email });
  if (error) throw error;
}
export async function verifyCode(email, token) {
  const { data, error } = await getClient().auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  session = data.session;
  return data;
}
export async function signOut() {
  await getClient()?.auth.signOut();
  session = null;
  setStatus({ state: 'offline' });
}

export async function syncNow() {
  const c = getClient();
  if (!c || !session || busy) return;
  busy = true;
  setStatus({ state: 'syncing', error: null });
  try {
    // 1) holen
    const since = new Date(store.getLastPull() || 0).toISOString();
    const { data: rows, error } = await c.from('records').select('key,data,updated_at').gt('updated_at', since).limit(5000);
    if (error) throw error;
    let changed = false;
    let maxU = store.getLastPull();
    for (const r of rows || []) {
      const u = new Date(r.updated_at).getTime();
      maxU = Math.max(maxU, u);
      if (store.applyRemote(r.key, r.data?.v ?? null, u)) changed = true;
    }
    // 2) senden
    const keys = store.dirtyKeys();
    if (keys.length) {
      const payload = keys.map((k) => {
        const e = store.rawEntry(k);
        return { user_id: session.user.id, key: k, data: { v: e?.v ?? null }, updated_at: new Date(e?.u || Date.now()).toISOString() };
      });
      for (let i = 0; i < payload.length; i += 200) {
        const { error: e2 } = await c.from('records').upsert(payload.slice(i, i + 200), { onConflict: 'user_id,key' });
        if (e2) throw e2;
      }
      payload.forEach((p) => store.markClean(p.key, new Date(p.updated_at).getTime()));
    }
    store.setLastPull(maxU || Date.now() - 1000);
    setStatus({ state: 'idle', last: Date.now() });
    if (changed) store.notifyAll();
  } catch (e) {
    console.warn('Sync-Fehler', e);
    setStatus({ state: 'error', error: e.message || String(e) });
  } finally {
    busy = false;
  }
}

export function schedulePush() {
  if (!cloudConfigured || !session) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 1500);
}

export function startAutoSync() {
  if (!cloudConfigured) return;
  store.onChange(() => schedulePush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  window.addEventListener('online', syncNow);
  setInterval(() => {
    if (document.visibilityState === 'visible') syncNow();
  }, 60000);
  syncNow();
}
