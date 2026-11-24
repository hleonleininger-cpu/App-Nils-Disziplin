// Lokaler Speicher mit Schlüssel/Wert-Struktur. Jeder Schlüssel hat einen Zeitstempel,
// damit die Cloud-Synchronisierung pro Schlüssel (z. B. pro Tag) zusammenführen kann.
import { DEFAULT_SETTINGS, DEFAULT_META, DEFAULT_LEARN } from './defaults.js';
import { DEFAULT_TIMETABLE } from '../data/timetable.js';
import { clone } from '../lib/util.js';

const LS = 'disziplin.v1';
let data = {}; // key -> { v, u }
let dirty = new Set();
let lastPull = 0;
const subs = new Set();
let saveTimer = null;

function load() {
  try {
    const j = JSON.parse(localStorage.getItem(LS) || 'null');
    if (j) {
      data = j.data || {};
      dirty = new Set(j.dirty || []);
      lastPull = j.lastPull || 0;
    }
  } catch {}
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}
export function flush() {
  try {
    localStorage.setItem(LS, JSON.stringify({ data, dirty: [...dirty], lastPull }));
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
  }
}
load();
if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);

export function onChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
function notify(key) {
  subs.forEach((f) => {
    try {
      f(key);
    } catch (e) {
      console.error(e);
    }
  });
}

export function get(key, def = null) {
  const e = data[key];
  if (!e || e.v === undefined || e.v === null) return def === null ? null : clone(def);
  return clone(e.v);
}
export function has(key) {
  return !!data[key] && data[key].v != null;
}
export function set(key, v, opts = {}) {
  data[key] = { v: clone(v), u: opts.u ?? Date.now() };
  if (!opts.fromRemote) dirty.add(key);
  persist();
  if (!opts.silent) notify(key);
}
export function remove(key) {
  data[key] = { v: null, u: Date.now() };
  dirty.add(key);
  persist();
  notify(key);
}
export function keys(prefix = '') {
  return Object.keys(data).filter((k) => k.startsWith(prefix) && data[k].v != null);
}
export function stamp(key) {
  return data[key]?.u || 0;
}

// --- Sync-Schnittstelle ---
export function dirtyKeys() {
  return [...dirty];
}
export function rawEntry(key) {
  return data[key];
}
export function markClean(key, u) {
  if (!data[key] || data[key].u <= u) dirty.delete(key);
  persist();
}
export function applyRemote(key, v, u) {
  const cur = data[key];
  if (cur && cur.u >= u) return false;
  data[key] = { v, u };
  dirty.delete(key);
  persist();
  return true;
}
export function getLastPull() {
  return lastPull;
}
export function setLastPull(t) {
  lastPull = t;
  persist();
}
export function notifyAll() {
  notify('*');
}

// --- Typisierte Helfer ---
function merge(base, over) {
  if (over == null || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(over)) {
    out[k] =
      base && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof over[k] === 'object' && over[k] !== null && !Array.isArray(over[k])
        ? merge(base[k], over[k])
        : over[k];
  }
  return out;
}
export const getSettings = () => merge(clone(DEFAULT_SETTINGS), get('settings', {}));
export const setSettings = (s) => set('settings', s);
export function updateSettings(fn) {
  const s = getSettings();
  fn(s);
  setSettings(s);
  return s;
}
export const getMeta = () => ({ ...clone(DEFAULT_META), ...get('meta', {}) });
export function updateMeta(fn) {
  const m = getMeta();
  fn(m);
  set('meta', m);
  return m;
}
export const getLearn = () => ({ ...clone(DEFAULT_LEARN), ...get('learn', {}) });
export function updateLearn(fn) {
  const l = getLearn();
  fn(l);
  set('learn', l);
  return l;
}
export const getTimetable = () => get('timetable', DEFAULT_TIMETABLE);
export const getDay = (date) => get('day:' + date, {});
export function updateDay(date, fn, opts) {
  const d = getDay(date);
  fn(d);
  set('day:' + date, d, opts);
  return d;
}
export function allDays() {
  const out = {};
  for (const k of keys('day:')) out[k.slice(4)] = data[k].v;
  return out;
}
export const getBooks = () => get('books', []);
export function allHomework() {
  return keys('hw:').map((k) => data[k].v);
}
export const setBooks = (b) => set('books', b);
export const getCustomTopics = () => get('topics', []);
export const getPack = (id) => get('pack:' + id, null);
export function allPacks() {
  return keys('pack:').map((k) => data[k].v);
}

export function exportAll() {
  const out = {};
  for (const k of Object.keys(data)) if (data[k].v != null) out[k] = data[k].v;
  return { app: 'nils-disziplin', version: 1, exportedAt: new Date().toISOString(), data: out };
}
export function importAll(obj) {
  if (!obj || obj.app !== 'nils-disziplin' || !obj.data) throw new Error('Keine gültige Sicherung.');
  for (const [k, v] of Object.entries(obj.data)) set(k, v, { silent: true });
  notifyAll();
}
export function resetAll({ keepSettings = false } = {}) {
  const keep = keepSettings ? { settings: data['settings'], timetable: data['timetable'] } : {};
  const old = Object.keys(data);
  data = {};
  dirty = new Set();
  for (const k of old) {
    // Tombstones, damit der Reset auch in die Cloud geht
    data[k] = { v: null, u: Date.now() };
    dirty.add(k);
  }
  for (const [k, e] of Object.entries(keep)) if (e) data[k] = e;
  persist();
  notifyAll();
}
