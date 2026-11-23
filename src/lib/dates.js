// Datumshelfer. Alle Daten sind lokale Kalendertage als "YYYY-MM-DD".
export const pad = (n) => String(n).padStart(2, '0');

export function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function diffDays(a, b) {
  // b - a in Tagen
  const ua = Date.UTC(...a.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  const ub = Date.UTC(...b.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  return Math.round((ub - ua) / 86400000);
}
/** 0 = Montag ... 6 = Sonntag */
export function weekdayIdx(s) {
  return (parseYmd(s).getDay() + 6) % 7;
}
export function mondayOf(s) {
  return addDays(s, -weekdayIdx(s));
}
export function isoWeek(s) {
  const d = parseYmd(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - yearStart) / 86400000 + 1) / 7) };
}

// Referenz: Woche ab 16.11.2026 (KW 47) ist Woche A (von Nils bestätigt).
// Danach wird fortlaufend abwechselnd gezählt (A, B, A, B ...), auch über den
// Jahreswechsel. Das entspricht ungerade KW = A, gerade KW = B, außer in Jahren mit KW 53.
export const WEEK_REF_MONDAY = '2026-11-16';

export function weekType(s, flip = false) {
  const idx = Math.floor(diffDays(WEEK_REF_MONDAY, mondayOf(s)) / 7);
  let a = ((idx % 2) + 2) % 2 === 0;
  if (flip) a = !a;
  return a ? 'A' : 'B';
}

export const WD_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function niceDate(s) {
  const d = parseYmd(s);
  return `${WD_LONG[weekdayIdx(s)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}
export function shortDate(s) {
  const d = parseYmd(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

export const hm = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
};
export const fmt = (m) => {
  m = Math.round(m);
  const h = ((Math.floor(m / 60) % 24) + 24) % 24;
  const mm = ((m % 60) + 60) % 60;
  return `${pad(h)}:${pad(mm)}`;
};
export function fmtDur(min) {
  min = Math.round(min);
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}
