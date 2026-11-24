// Cloud-Sync über Supabase (kostenloser Tarif). Ohne Umgebungsvariablen läuft die App lokal.
// Tabelle: records(user_id, key, data, updated_at) mit Row Level Security. Siehe supabase/schema.sql.
import { createClient } from '@supabase/supabase-js';
import * as store from './store.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(URL && KEY);

let client = null;
let session = null;
let status = { state: cloudConfigured ? 'offline' : 'local', last: null, error: null };
const listeners = new Set();
let pushTimer = null;
let busy = false;

// Zuordnung: lokaler Schlüssel -> Tabelle und Schlüsselspalten (siehe supabase/migrations/0001_disziplin.sql)
export const TABLES = [
  { t: 'settings', cols: ['key'], match: (k) => k === 'settings' || k === 'timetable', to: (k) => ({ key: k }), from: (r) => r.key },
  { t: 'day_log', cols: ['day'], match: (k) => k.startsWith('day:'), to: (k) => ({ day: k.slice(4) }), from: (r) => 'day:' + r.day },
  { t: 'streak', cols: [], match: (k) => k === 'meta', to: () => ({}), from: () => 'meta' },
  { t: 'books', cols: [], match: (k) => k === 'books', to: () => ({}), from: () => 'books' },
  { t: 'topics', cols: ['key'], match: (k) => k === 'topics' || k === 'learn', to: (k) => ({ key: k }), from: (r) => r.key },
  { t: 'packs', cols: ['id'], match: (k) => k.startsWith('pack:'), to: (k) => ({ id: k.slice(5) }), from: (r) => 'pack:' + r.id },
  { t: 'excuses', cols: ['day'], match: (k) => k.startsWith('excuse:'), to: (k) => ({ day: k.slice(7) }), from: (r) => 'excuse:' + r.day },
  { t: 'homework', cols: ['id'], match: (k) => k.startsWith('hw:'), to: (k) => ({ id: k.slice(3) }), from: (r) => 'hw:' + r.id },
  { t: 'tasks', cols: ['id'], match: (k) => k.startsWith('task:'), to: (k) => ({ id: k.slice(5) }), from: (r) => 'task:' + r.id },
];
export function routeKey(key) {
  const r = TABLES.find((x) => x.match(key));
  // Unbekannte Schlüssel landen in "settings" (key-Spalte), damit nichts verloren geht
  return r || { ...TABLES[0], to: (k) => ({ key: k }) };
}
const onConflict = (r) => ['user_id', ...r.cols].join(',');

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
export async function signUp(email, password, inviteCode = '') {
  const { data, error } = await getClient().auth.signUp({ email, password });
  if (error) throw error;
  session = data.session;
  // Grundlage für Einladungen: Code einlösen, wenn einer mitgegeben wurde. Noch nicht erzwungen.
  if (session && inviteCode) await getClient().rpc('redeem_invite', { p_code: inviteCode }).then(() => {}, () => {});
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
    // 1) holen: je Tabelle alles, was neuer ist als der letzte Abruf
    const since = new Date(store.getLastPull() || 0).toISOString();
    let changed = false;
    let maxU = store.getLastPull();
    for (const tb of TABLES) {
      const { data: rows, error } = await c.from(tb.t).select(['data', 'updated_at', ...tb.cols].join(',')).gt('updated_at', since).limit(5000);
      if (error) throw error;
      for (const r of rows || []) {
        const u = new Date(r.updated_at).getTime();
        maxU = Math.max(maxU, u);
        if (store.applyRemote(tb.from(r), r.data?.v ?? null, u)) changed = true;
      }
    }
    // 2) senden: lokale Änderungen, gruppiert je Tabelle
    const keys = store.dirtyKeys();
    if (keys.length) {
      const byTable = new Map();
      for (const k of keys) {
        const e = store.rawEntry(k);
        const rt = routeKey(k);
        const row = { user_id: session.user.id, ...rt.to(k), data: { v: e?.v ?? null }, updated_at: new Date(e?.u || Date.now()).toISOString() };
        if (!byTable.has(rt)) byTable.set(rt, []);
        byTable.get(rt).push({ k, row });
      }
      for (const [rt, items] of byTable) {
        for (let i = 0; i < items.length; i += 200) {
          const part = items.slice(i, i + 200);
          const { error } = await c.from(rt.t).upsert(part.map((x) => x.row), { onConflict: onConflict(rt) });
          if (error) throw error;
          part.forEach((x) => store.markClean(x.k, new Date(x.row.updated_at).getTime()));
        }
      }
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
