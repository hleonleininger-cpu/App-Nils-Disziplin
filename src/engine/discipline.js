// Disziplin-System: Streak, Tagesstatus, Begründungen, Punkte, Level, Tagesziele, Wochenherausforderungen.
import { addDays, mondayOf, weekdayIdx } from '../lib/dates.js';
import { buildDay } from './plan.js';
import { hashStr } from '../lib/util.js';

export const STREAK_MIN = 5; // Minuten Lernen, damit der Tag zählt
export const FUTURE_MIN = 15; // tägliche Mindestmenge Zukunftswissen

export const learnMinutes = (D) => (D.learnSec || 0) / 60;

/** done | excused | missed | open | none */
export function dayStatus(D, date, today, meta) {
  if (learnMinutes(D || {}) >= STREAK_MIN) return 'done';
  if (D?.excuse?.accepted) return 'excused';
  if (meta?.startDate && date < meta.startDate) return 'none';
  if (date < today) return 'missed';
  if (date === today) return 'open';
  return 'none';
}

export function computeStreak(days, today, meta) {
  let n = 0;
  let d = today;
  for (let i = 0; i < 900; i++) {
    const st = dayStatus(days[d], d, today, meta);
    if (st === 'done') n++;
    else if (st === 'excused' || st === 'open') {
      /* hält die Kette, zählt aber nicht */
    } else if (st === 'missed') {
      n += meta?.restores?.[d] || 0;
      break;
    } else break;
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(days, today, meta) {
  if (!meta?.startDate) return 0;
  let run = 0;
  let best = 0;
  for (let d = meta.startDate; d <= today; d = addDays(d, 1)) {
    const st = dayStatus(days[d], d, today, meta);
    if (st === 'done') run++;
    else if (st === 'missed') run = meta.restores?.[d] || 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Streak-Wert pro Tag der letzten n Tage (für Diagramme). */
export function streakSeries(days, today, meta, n = 28) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ date: d, value: computeStreak(days, d, meta), status: dayStatus(days[d], d, today, meta) });
  }
  return out;
}

// --- Begründungen ---
export const EXCUSE_CATS = [
  { id: 'krank', label: 'Krank' },
  { id: 'schule', label: 'Schule / Termin' },
  { id: 'familie', label: 'Familie' },
  { id: 'notfall', label: 'Notfall' },
  { id: 'sonst', label: 'Etwas anderes' },
];
/** Akzeptierte Begründungen in derselben Kalenderwoche (Mo bis So), ohne den Tag selbst. */
export function acceptedExcusesInWeek(days, date) {
  let n = 0;
  for (const d of weekDates(date)) if (d !== date && days[d]?.excuse?.accepted) n++;
  return n;
}
export function validateExcuse({ cat, text }, recent, max = 1) {
  const t = (text || '').trim();
  if (!cat) return { ok: false, msg: 'Such dir einen Grund aus.' };
  if (t.length < 20 || t.split(/\s+/).length < 4) return { ok: false, msg: 'Zu dünn. Schreib ausführlich, was los war: mindestens ein bis zwei vollständige Sätze.' };
  if (/\b(kein(e|en)? (bock|lust)|faul|vergessen|nicht gewollt|hatte keine zeit)\b/i.test(t)) return { ok: false, msg: '"Kein Bock", "vergessen" oder "keine Zeit" ist kein Grund. Das ist genau das, wogegen Disziplin da ist.' };
  if (recent >= max) return { ok: false, msg: `Du hattest diese Woche schon ${recent === 1 ? 'eine akzeptierte Begründung' : recent + ' akzeptierte Begründungen'}. Pro Woche gibt es ${max === 1 ? 'eine' : max}. Dieser Tag zählt als verloren, wenn du nicht noch 5 Minuten lernst.` };
  return { ok: true };
}

// --- Punkte und Level ---
export const POINTS = { learnBase: 10, learnPer15: 10, sport: 30, sd: 20, read: 15, lunch: 0, water: 20, evening: 25, task: 10, recoveryLesson: 10, quiz: 2, weeklyChallenge: 100, streakDay: 5, goalsAll: 30 };
export const threshold = (L) => 50 * L * (L - 1);
export function levelFor(p) {
  let L = 1;
  while (p >= threshold(L + 1)) L++;
  return L;
}
export function levelProgress(p) {
  const L = levelFor(p);
  const a = threshold(L);
  const b = threshold(L + 1);
  return { level: L, into: p - a, need: b - a, frac: (p - a) / (b - a) };
}
export const TITLES = [
  [1, 'Stufe I'], [3, 'Konsequent'], [5, 'Verlässlich'], [8, 'Hartnäckig'], [12, 'Souverän'], [16, 'Eisern'], [21, 'Meister'], [27, 'Elite'], [34, 'Unbeugsam'], [42, 'Legende'],
];
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
}

// --- Tagesstatistik und Ziele ---
export function dayStats({ date, S, TT, D, comp, now, carry = [], homework = [], topic = null }) {
  const plan = buildDay({ date, S, TT, D, comp, now, carry, homework, topic });
  const learnMin = learnMinutes(D);
  const futureMin = (D.futureSec || 0) / 60; // Zukunftswissen = Schule und Finanzen
  const doneKind = (k) => plan.blocks.some((b) => b.kind === k && b.status === 'done');
  const learnTarget = plan.weekend ? S.learnTarget.we : S.learnTarget.wk;
  const water = D.water || 0;
  const goals = [
    { id: 'learn', label: 'Lernen', icon: 'book', frac: Math.min(1, learnMin / learnTarget), text: `${Math.round(learnMin)} / ${learnTarget} Min` },
    { id: 'sport', label: 'Sport', icon: 'dumbbell', frac: plan.sportDone ? 1 : 0, text: plan.sportDone ? 'erledigt' : 'offen' },
    { id: 'water', label: 'Wasser', icon: 'drop', frac: Math.min(1, water / S.waterGoal), text: `${(water / 1000).toFixed(2).replace('.', ',')} / ${(S.waterGoal / 1000).toString().replace('.', ',')} L` },
    { id: 'sd', label: 'Selbstverteidigung', icon: 'shield', frac: doneKind('sd') ? 1 : 0, text: doneKind('sd') ? 'erledigt' : 'offen' },
    { id: 'read', label: 'Lesen', icon: 'read', frac: doneKind('read') || (D.pages || 0) > 0 ? 1 : 0, text: (D.pages || 0) > 0 ? `${D.pages} Seiten` : 'offen' },
    { id: 'future', label: 'Zukunftswissen', icon: 'brain', frac: Math.min(1, futureMin / FUTURE_MIN), text: `${Math.round(futureMin)} / ${FUTURE_MIN} Min` },
  ];
  const frac = goals.reduce((a, g) => a + g.frac, 0) / goals.length;
  return { plan, learnMin, futureMin, water, goals, frac, allDone: goals.every((g) => g.frac >= 1), sport: plan.sportDone, sd: doneKind('sd'), read: doneKind('read') || (D.pages || 0) > 0, pages: D.pages || 0 };
}

// --- Wochenherausforderungen ---
export const CHALLENGES = [
  { id: 'learn30', title: 'Fünf starke Lerntage', desc: 'An 5 Tagen mindestens 30 Minuten lernen.', target: 5, unit: 'Tage', measure: (ds) => ds.filter((s) => s.learnMin >= 30).length },
  { id: 'water', title: 'Wasser-Woche', desc: 'An 6 Tagen die 3 Liter schaffen.', target: 6, unit: 'Tage', measure: (ds) => ds.filter((s) => s.goals.find((g) => g.id === 'water').frac >= 1).length },
  { id: 'sport', title: 'Kein Sporttag ausgelassen', desc: 'Jeden Tag Sport. 7 von 7.', target: 7, unit: 'Tage', measure: (ds) => ds.filter((s) => s.sport).length },
  { id: 'sd', title: 'Schattenboxen-Woche', desc: 'An 5 Tagen Selbstverteidigung.', target: 5, unit: 'Tage', measure: (ds) => ds.filter((s) => s.sd).length },
  { id: 'pages', title: 'Seitenfresser', desc: '120 Seiten lesen.', target: 120, unit: 'Seiten', measure: (ds) => ds.reduce((a, s) => a + s.pages, 0) },
  { id: 'future', title: 'Zukunftswissen täglich', desc: 'An 7 Tagen die 15 Minuten Zukunftswissen.', target: 7, unit: 'Tage', measure: (ds) => ds.filter((s) => s.goals.find((g) => g.id === 'future').frac >= 1).length },
  { id: 'allgoals', title: 'Perfekter Tag', desc: 'Mindestens 2 Tage mit allen sechs Zielen.', target: 2, unit: 'Tage', measure: (ds) => ds.filter((s) => s.allDone).length },
];
export function challengeFor(weekMonday, weeklyPages = 120) {
  const c = CHALLENGES[hashStr(weekMonday) % CHALLENGES.length];
  return c.id === 'pages' ? { ...c, target: weeklyPages, desc: `${weeklyPages} Seiten lesen.` } : c;
}

export function weekDates(anyDate) {
  const m = mondayOf(anyDate);
  return Array.from({ length: 7 }, (_, i) => addDays(m, i));
}

export function weekdayName(date) {
  return ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][weekdayIdx(date)];
}
