// Erinnerungen. Kapselt alles, was Benachrichtigungen betrifft, damit später eine native App
// nur dieses Modul ersetzen muss. Siehe README "Benachrichtigungen auf iOS".
import * as store from './store.js';
import { nowMin, todayStr, nowTs } from '../lib/clock.js';
import { fmt, hm } from '../lib/dates.js';
import { planFor, statsFor, addWater, setAckHandler } from './actions.js';
import { toast } from '../ui/fx.js';
import { play } from '../lib/sound.js';
import { getClient, isLoggedIn, cloudConfigured } from './sync.js';

export const pushSupported = () => 'Notification' in window && 'serviceWorker' in navigator;
export const permission = () => (pushSupported() ? Notification.permission : 'unsupported');
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function requestPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.requestPermission();
}

/** Liste der Erinnerungen für einen Tag. cond() prüft zur Auslösezeit, ob sie noch gebraucht wird. */
export function buildReminders(date) {
  const S = store.getSettings();
  const plan = planFor(date, { now: null });
  const out = [];
  const D = () => store.getDay(date);
  const weekend = plan.weekend;
  out.push({ id: 'wake', at: plan.planWake, tag: 'wake', title: 'Aufstehen, Nils.', body: 'Es ist Zeit. Los.', hard: 'Du liegst noch. Aufstehen. Jetzt. Disziplin schlägt Motivation.', cond: () => D().wake == null });
  const waterTimes = weekend ? ['11:00', '13:30', '16:00', '18:30', '21:00'] : ['09:30', '12:00', '14:30', '17:00', '19:30'];
  waterTimes.forEach((t, i) => {
    out.push({
      id: 'water' + i, at: hm(t), tag: 'water', title: 'Schon getrunken?', body: `Bisher ${((D().water || 0) / 1000).toFixed(2).replace('.', ',')} von ${S.waterGoal / 1000} Litern.`,
      hard: `Nils. Wasser. ${Math.max(0, ((S.waterGoal - (D().water || 0)) / 1000)).toFixed(2).replace('.', ',')} Liter fehlen noch. Trink jetzt ein Glas.`,
      actions: [{ label: '+250 ml', run: () => addWater(date, 250) }, { label: '+500 ml', run: () => addWater(date, 500) }],
      cond: () => (D().water || 0) < S.waterGoal * (0.2 * (i + 1)),
    });
  });
  const firstOf = (kind) => plan.blocks.find((b) => b.kind === kind && !b.fixed && b.status === 'pending');
  const l = firstOf('learn');
  if (l) out.push({ id: 'learn', at: l.start, tag: 'learn', title: `Lernblock: ${l.title.replace(/^Lernen: /, '')}`, body: `${l.dur} Minuten. Anfangen reicht.`, hard: 'Lernblock läuft nicht. Fünf Minuten starten, mehr nicht. Jetzt.', cond: () => (D().learnSec || 0) < 600 });
  const sp = firstOf('sport');
  if (sp) out.push({ id: 'sport', at: sp.start, tag: 'sport', title: `${sp.title} steht an`, body: `${sp.dur} Minuten.`, hard: 'Sport ist nicht passiert. Zieh die Schuhe an. Jetzt.', cond: () => !D().done?.sport });
  const rd = firstOf('read');
  if (rd) out.push({ id: 'read', at: rd.start, tag: 'read', title: 'Lesen', body: `${rd.dur} Minuten, ein paar Seiten.`, hard: 'Das Buch wartet. Zehn Minuten, dann ist es erledigt.', cond: () => !D().done?.read && !(D().pages > 0) });
  const eve = plan.eveStart;
  out.push({ id: 'streakwarn', at: Math.min(eve - 90, hm('20:00')), tag: 'learn', title: 'Dein Streak hängt', body: 'Du hast heute noch keine 5 Minuten gelernt. Das reicht schon.', hard: 'Nils. Der Tag ist bald vorbei. Fünf Minuten Lernen retten die Streak. Mach es jetzt.', cond: () => (D().learnSec || 0) < 300 });
  out.push({ id: 'eve-pre', at: eve - 15, tag: 'evening', title: 'In 15 Minuten: Abendcheck', body: 'Beende, was du angefangen hast. Handy gleich aus.', hard: 'Abendcheck steht gleich an. Rückblick, Gebet, Worte. Sei pünktlich.', cond: () => !D().evening?.done });
  out.push({ id: 'eve', at: eve, tag: 'evening', title: 'Abendcheck', body: `Es ist ${fmt(eve)}. Feierabend.`, hard: 'Du hast den Abendcheck nicht gemacht. Ohne Rückblick bleibt der Tag offen.', cond: () => !D().evening?.done });
  return out;
}

const FIRED = 'disziplin.fired';
function firedMap() {
  try {
    return JSON.parse(localStorage.getItem(FIRED) || '{}');
  } catch {
    return {};
  }
}
function saveFired(m) {
  try {
    // alte Tage wegräumen
    const keep = {};
    Object.entries(m).forEach(([k, v]) => k.startsWith(todayStr()) && (keep[k] = v));
    localStorage.setItem(FIRED, JSON.stringify(keep));
  } catch {}
}
const pending = new Map(); // fired id -> { reminder, ts, hard }

async function showNative(title, body, tag) {
  if (permission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(title, { body, tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: './#/heute' } });
      return true;
    }
  } catch {}
  return false;
}

function fire(r, hard = false) {
  const S = store.getSettings();
  const title = hard ? 'Nils.' : r.title;
  const body = hard ? r.hard : r.body;
  if (document.visibilityState === 'visible') {
    toast(`${title} ${body}`, {
      kind: hard ? 'hard' : 'info', ms: hard ? 9000 : 7000,
      actions: [...(r.actions || []), { label: 'Okay', run: () => ack(r.tag) }],
    });
  } else showNative(title, body, r.id + (hard ? '-h' : ''));
  if (S.sound) play(hard ? 'warn' : 'ding');
  try {
    navigator.vibrate?.(hard ? [200, 100, 200] : 120);
  } catch {}
}

export function ack(tag) {
  for (const [k, v] of pending) if (v.r.tag === tag) pending.delete(k);
  // Server-Push: Reaktion melden, damit keine zweite harte Nachricht kommt
  if (cloudConfigured && isLoggedIn()) {
    getClient()?.from('reminders').update({ acked: true }).eq('tag', tag).eq('sent', true).then(() => {}, () => {});
  }
}
setAckHandler(ack);

/** Wird alle 20 Sekunden aufgerufen, solange die App offen ist. */
export function tickReminders() {
  const today = todayStr();
  const now = nowMin();
  const fired = firedMap();
  for (const r of buildReminders(today)) {
    const key = `${today}|${r.id}`;
    if (now >= r.at && now < r.at + 25 && !fired[key]) {
      fired[key] = nowTs();
      if (r.cond()) {
        fire(r, false);
        pending.set(key, { r, at: now });
      }
    }
  }
  const hardDelay = 10;
  for (const [key, v] of [...pending]) {
    if (now >= v.at + hardDelay) {
      pending.delete(key);
      if (v.r.cond() && store.getSettings().hardTone) fire(v.r, true);
    }
  }
  saveFired(fired);
}

/** Beim Tippen irgendwo in der App gelten offene Erinnerungen als gesehen. */
export function ackAllOnInteraction() {
  pending.clear();
}

// ---------- Server-Push (Grundgerüst, siehe README) ----------
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
export async function enableServerPush() {
  if (!VAPID || !cloudConfigured || !isLoggedIn()) throw new Error('Server-Push braucht Cloud-Login und VITE_VAPID_PUBLIC_KEY.');
  const perm = await requestPermission();
  if (perm !== 'granted') throw new Error('Benachrichtigungen nicht erlaubt.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) }));
  const c = getClient();
  const { data } = await c.auth.getUser();
  await c.from('push_subscriptions').upsert({ user_id: data.user.id, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: 'endpoint' });
  return true;
}
/** Legt die Erinnerungen der nächsten 24 Stunden in der Cloud ab, damit eine Edge Function sie senden kann. */
export async function syncReminders() {
  if (!cloudConfigured || !isLoggedIn() || !VAPID) return;
  const c = getClient();
  const { data } = await c.auth.getUser();
  const today = todayStr();
  const rows = buildReminders(today).map((r) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return { user_id: data.user.id, rid: `${today}|${r.id}`, fire_at: new Date(d.getTime() + r.at * 60000).toISOString(), title: r.title, body: r.body, hard_body: r.hard, tag: r.tag };
  });
  await c.from('reminders').upsert(rows, { onConflict: 'user_id,rid' });
}
