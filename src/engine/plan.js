// Plan-Engine: baut aus Stundenplan, festen Terminen, Tageszustand und flexiblen Aufgaben
// die Zeitleiste eines Tages. Reine Funktion, keine UI, keine Speicherzugriffe.
import { weekdayIdx, weekType, hm, fmt } from '../lib/dates.js';
import { PERIODS, subjectName, subjectCode } from '../data/timetable.js';

export const COLORS = {
  school: '#7C8CF8',
  morning: '#E8B04A',
  lunch: '#8A93A6',
  bock: '#FF6B2C',
  sport: '#F0524F',
  sd: '#E8744F',
  read: '#D9779F',
  free: '#3CC4B0',
  project: '#4DA3E8',
  evening: '#8E7CF0',
  learn: '#FF6B2C',
  hw: '#E8B04A',
  comp: '#D9534F',
  travel: '#8A93A6',
};
export const SPORT_INFO = {
  gym: { title: 'Gym', icon: 'dumbbell' },
  jog: { title: 'Joggen', icon: 'run' },
  handball: { title: 'Handball', icon: 'ball' },
};
export const FREE_SLOT = 15; // Minuten pro Druck auf "15 Minuten Freizeit"
export const HANDBALL_TRAVEL = 20; // Minuten Hin- und Rückweg

/** Tageszeit-Wort für Beschreibungen, richtet sich nach der Uhrzeit des Blocks. */
export function daypart(startMin) {
  if (startMin < 12 * 60) return 'Vormittag';
  if (startMin < 17 * 60) return 'Nachmittag';
  if (startMin < 21 * 60) return 'Abend';
  return 'Spät am Abend';
}

/** Handball gibt es nur Montag (0) und Freitag (4). Alles andere wird als "kein Sport" behandelt. */
export function sportOf(S, wd) {
  const sp = S.sport?.[wd] || { type: 'none' };
  if (sp.type === 'handball' && wd !== 0 && wd !== 4) return { type: 'none' };
  return sp;
}

const ceil5 = (x) => Math.ceil(x / 5) * 5;

function freeGaps(occ, from, to) {
  const sorted = [...occ].sort((a, b) => a.start - b.start);
  const gaps = [];
  let cur = from;
  for (const o of sorted) {
    if (o.end <= cur) continue;
    if (o.start >= to) break;
    if (o.start > cur) gaps.push([cur, Math.min(o.start, to)]);
    cur = Math.max(cur, o.end);
    if (cur >= to) break;
  }
  if (cur < to) gaps.push([cur, to]);
  return gaps;
}

function placeTask(occ, from, to, dur, min, anchor = null) {
  const gaps = freeGaps(occ, from, to);
  // Beginnt eine Lücke genau jetzt, startet die Aufgabe jetzt (nicht erst auf die nächste 5 Minuten gerundet)
  const snap = (a) => (anchor != null && a <= anchor + 0.001 ? Math.ceil(a) : ceil5(a));
  for (const [a, b] of gaps) {
    const s = snap(a);
    if (b - s >= dur) return { start: s, dur };
  }
  if (min < dur) {
    for (const [a, b] of gaps) {
      const s = snap(a);
      if (b - s >= min) return { start: s, dur: Math.min(dur, Math.floor((b - s) / 5) * 5 || b - s) };
    }
  }
  return null;
}

/** Selbstverteidigung: jeden Tag gleich lang (Standard 15 Minuten), auch an Gym-Tagen. */
export function sdMinutes(S) {
  return [15, 20, 30].includes(Number(S.sdMinutes)) ? Number(S.sdMinutes) : 15;
}
export function sdSub(min) {
  const parts = { 15: [3, 7, 5], 20: [4, 10, 6], 30: [5, 15, 10] }[min] || [3, 7, 5];
  return `${parts[0]} Min Aufwärmen · ${parts[1]} Min Schattenboxen · ${parts[2]} Min Seilspringen`;
}

/** Freizeit: kein festes Limit mehr. Jeder Druck auf "15 Minuten Freizeit" erhöht freeSlots. */
export function freeInfo(D) {
  const slots = D.freeSlots || 0;
  const log = D.freeLog || [];
  const taken = log.reduce((a, b) => a + (b.min || 0), 0);
  return { slots, takenMin: taken, doneCount: log.length, pending: Math.max(0, slots - log.length) };
}

/** Zerlegt den Schultag in Unterrichtsblöcke und freie Fenster. */
export function schoolOf(date, S, TT, D) {
  const wd = weekdayIdx(date);
  const wt = weekType(date, S.weekFlip);
  if (wd > 4) return { wt, wd, periods: [], lessons: [], runs: [] };
  const pairs = TT[wt]?.[wd] || [];
  const cancelled = new Set(D.cancelled || []);
  const periods = [];
  for (let p = 0; p < 8; p++) {
    const cell = pairs[Math.floor(p / 2)] || '';
    periods.push({ p: p + 1, cell, cancelled: cancelled.has(p + 1), scheduled: Boolean(cell) });
  }
  const isLesson = (x) => x.cell && !x.cancelled;
  const lessons = [];
  const runs = [];
  let i = 0;
  while (i < 8) {
    let j = i;
    if (isLesson(periods[i])) {
      while (j + 1 < 8 && j !== 5 && periods[j + 1].cell === periods[i].cell && !periods[j + 1].cancelled) j++;
      lessons.push({ i, j, cell: periods[i].cell });
    } else {
      while (j + 1 < 8 && !isLesson(periods[j + 1])) j++;
      runs.push({ i, j, cancelled: periods.slice(i, j + 1).some((x) => x.cancelled), scheduledFree: periods.slice(i, j + 1).every((x) => !x.cell) });
    }
    i = j + 1;
  }
  return { wt, wd, periods, lessons, runs };
}

export function windowOptions(win, ctx) {
  const { S, wd, sportBlockDone } = ctx;
  const out = [];
  const sp = sportOf(S, wd);
  if (win.minutes >= 25) out.push({ kind: 'learn', label: 'Lernblock', dur: win.minutes, reason: `${win.minutes} Min Lernen` });
  // Gym liegt immer abends (ab 19:00), deshalb nur Joggen als Vorschlag für eine Lücke tagsüber
  if (sp.type === 'jog' && !sportBlockDone) {
    const d = S.sportDur?.jog || 45;
    if (win.minutes >= d) out.push({ kind: 'sport', label: 'Joggen', dur: d, reason: `Joggen passt hier rein (${d} Min)` });
  }
  const sdm = sdMinutes(S);
  if (win.minutes >= sdm) out.push({ kind: 'sd', label: 'Selbstverteidigung', dur: sdm, reason: `${sdm} Min Selbstverteidigung` });
  if (win.minutes >= (S.readMinutes || 20)) out.push({ kind: 'read', label: 'Lesen', dur: S.readMinutes || 20, reason: 'Lesen' });
  return out;
}

export function buildDay(ctx) {
  const { date, S, TT, D = {}, carry = [], comp = null, now = null, topic = null, book = null, homework = [] } = ctx;
  const wd = weekdayIdx(date);
  const weekend = wd >= 5;
  const done = D.done || {};
  const skipped = D.skipped || {};
  const started = D.started || {};
  const blocks = [];
  const occ = []; // belegte Intervalle
  const overflow = [];
  const add = (b) => {
    b.fixed = Boolean(b.fixed);
    b.end = b.start + b.dur;
    blocks.push(b);
    occ.push({ start: b.start, end: b.end });
    return b;
  };

  const planWake = hm(weekend ? S.wake.we : S.wake.wk);
  const wake = D.wake ?? planWake;
  const morningEnd = wake + 30;
  const eveStart = hm(weekend ? S.evening.we : S.evening.wk);
  const limitEnd = eveStart - 5;

  const timeStatus = (start, end) => {
    if (now == null) return 'pending';
    if (now < start) return 'pending';
    if (now < end) return 'running';
    return 'done';
  };
  const flexStatus = (id, end, isWindow) => {
    if (done[id]) return 'done';
    if (skipped[id]) return 'skipped';
    if (started[id]) return 'running';
    if (isWindow && now != null && now >= end) return 'missed';
    return 'pending';
  };

  // Aufstehen (wird nach 2 Stunden ohne Bestätigung stillschweigend als erledigt gewertet)
  const morningAuto = D.wake == null && now != null && now > planWake + 120;
  add({
    id: 'morning', kind: 'morning', title: D.wake != null ? 'Aufgestanden' : 'Aufstehen',
    sub: D.wake != null && D.wake !== planWake ? `Geplant ${fmt(planWake)}, tatsächlich ${fmt(D.wake)}` : 'Wasser, fertig machen, los',
    start: wake, dur: 30, color: COLORS.morning, icon: 'clock', status: D.wake != null || morningAuto ? 'done' : 'pending', fixed: true,
  });

  // Schule
  const school = schoolOf(date, S, TT, D);
  let schoolEnd = null;
  const windows = [];
  for (const L of school.lessons) {
    const start = PERIODS[L.i][0];
    const end = PERIODS[L.j][1];
    const slept = D.wake != null && D.wake > start;
    add({
      id: `school-${start}`, kind: 'school', title: subjectName(L.cell), sub: `${subjectCode(L.cell)} · ${L.i + 1}.${L.j > L.i ? '–' + (L.j + 1) + '.' : ''} Stunde`.replace(' · ', subjectCode(L.cell) ? ' · ' : ''),
      start, dur: end - start, color: COLORS.school, icon: 'school', fixed: true, periods: [L.i + 1, L.j + 1],
      status: slept ? 'slept' : timeStatus(start, end),
    });
    schoolEnd = Math.max(schoolEnd ?? 0, end);
  }
  // Freie Fenster zwischen Unterricht (Freistunden und Ausfälle)
  const firstLesson = school.lessons[0];
  const lastLesson = school.lessons[school.lessons.length - 1];
  for (const r of school.runs) {
    if (!firstLesson) break;
    if (r.i > lastLesson.j) continue; // nach Schulschluss: kein Fenster, sondern früherer Feierabend
    let start = PERIODS[r.i][0];
    const end = PERIODS[r.j][1];
    if (r.i < firstLesson.i) start = Math.max(start, morningEnd);
    const minutes = end - start;
    if (minutes < 25) continue;
    const key = `w${PERIODS[r.i][0]}`;
    windows.push({ key, start, end, minutes, source: r.cancelled ? 'ausfall' : 'frei', periods: [r.i + 1, r.j + 1], assigned: D.assign?.[key] || 'learn' });
  }

  const sp = sportOf(S, wd);
  let sportInWindow = false;
  const wantedKinds = {};
  let sportDoneAny = false;

  for (const w of windows) {
    const opts = windowOptions(w, { S, D, comp, wd, sportBlockDone: Boolean(done.sport) });
    w.options = opts;
    let kind = w.assigned;
    if (!opts.find((o) => o.kind === kind)) kind = 'learn';
    w.kind = kind;
    const opt = opts.find((o) => o.kind === kind) || { dur: w.minutes };
    const dur = kind === 'learn' ? w.minutes : Math.min(opt.dur, w.minutes);
    const id = `win-${w.start}-${kind}`;
    const b = {
      id, kind: kind === 'learn' ? 'learn' : kind, window: true, winKey: w.key,
      title: kind === 'learn' ? `Lernblock (${w.source === 'ausfall' ? 'Ausfall' : 'Freistunde'})` : kind === 'sport' ? SPORT_INFO[sp.type]?.title || 'Sport' : kind === 'sd' ? 'Selbstverteidigung' : kind === 'read' ? 'Lesen' : 'Freizeit',
      sub: `${w.periods[0]}.–${w.periods[1]}. Stunde${kind === 'learn' && topic ? ' · ' + topic.name : ''}`,
      start: w.start, dur, color: kind === 'learn' ? topic?.color || COLORS.learn : COLORS[kind] || COLORS.learn,
      icon: kind === 'learn' ? topic?.icon || 'book' : kind === 'sport' ? SPORT_INFO[sp.type]?.icon : kind === 'sd' ? 'shield' : 'book',
      topicId: kind === 'learn' ? topic?.id : null, minDur: dur, optional: false,
    };
    b.status = flexStatus(id, b.start + b.dur, true);
    add(b);
    if (kind === 'sport') {
      sportInWindow = true;
      wantedKinds.sport = true;
    }
    if (kind === 'sd') wantedKinds.sd = true;
    if (kind === 'read') wantedKinds.read = true;
    // Rest des Fensters mit Lernblock füllen
    const rest = w.minutes - dur;
    if (kind !== 'learn' && rest >= 25) {
      const id2 = `win-${w.start + dur}-learn`;
      const b2 = {
        id: id2, kind: 'learn', window: true, winKey: w.key, title: 'Lernblock (Rest der Lücke)', sub: topic?.name || '',
        start: w.start + dur, dur: rest, color: topic?.color || COLORS.learn, icon: topic?.icon || 'book', topicId: topic?.id,
      };
      b2.status = flexStatus(id2, b2.start + b2.dur, true);
      add(b2);
    }
  }

  // Ende der Schulzeit, danach Mittag
  const noSchool = schoolEnd == null;
  const afterMorning = morningEnd;
  let lunchEnd = null;
  if (!noSchool) {
    const ls = Math.max(schoolEnd, afterMorning);
    const lend = done.lunch?.end != null ? Math.max(ls + 1, Math.min(ls + 30, done.lunch.end)) : ls + 30;
    const b = add({
      id: 'lunch', kind: 'lunch', title: 'Essen & runterkommen', sub: 'Kurz abschalten, dann geht es los', start: ls, dur: lend - ls,
      color: COLORS.lunch, icon: 'cup', fixed: true, status: done.lunch ? 'done' : timeStatus(ls, lend),
    });
    lunchEnd = b.end;
  } else if (!weekend) {
    // Schultag komplett ausgefallen/frei
    lunchEnd = afterMorning;
  } else {
    lunchEnd = afterMorning;
  }
  const bockStart = lunchEnd;
  add({
    id: 'bock', kind: 'bock', title: 'Worauf hast du Bock?', sub: 'Lernen, Lesen oder Freizeit', start: bockStart, dur: 0,
    color: COLORS.bock, icon: 'bolt', status: D.choice ? 'done' : 'pending',
  });

  // Fester Sport (Handball)
  let fixedSportBlock = null;
  if (sp.type === 'handball') {
    const start = hm(sp.start), end = hm(sp.end);
    const gone = skipped.handball;
    fixedSportBlock = add({
      id: 'handball', kind: 'sport', fixedSport: true, title: 'Handball', sub: `${sp.start}–${sp.end}`, start, dur: end - start,
      color: COLORS.sport, icon: 'ball', fixed: true, status: gone ? 'skipped' : done.handball ? 'done' : timeStatus(start, end),
    });
    sportDoneAny = fixedSportBlock.status === 'done';
    if (!gone) {
      add({ id: 'handball-hin', kind: 'travel', title: 'Hinweg zum Handball', sub: `${HANDBALL_TRAVEL} Min`, start: start - HANDBALL_TRAVEL, dur: HANDBALL_TRAVEL, color: COLORS.travel, icon: 'run', fixed: true, status: timeStatus(start - HANDBALL_TRAVEL, start) });
      add({ id: 'handball-rueck', kind: 'travel', title: 'Rückweg vom Handball', sub: `${HANDBALL_TRAVEL} Min`, start: end, dur: HANDBALL_TRAVEL, color: COLORS.travel, icon: 'run', fixed: true, status: timeStatus(end, end + HANDBALL_TRAVEL) });
    }
  }

  // Bereits erledigte oder laufende Aufgaben (feste Position)
  const flexDefs = [];
  const learnTarget = weekend ? S.learnTarget.we : S.learnTarget.wk;
  const learnedMin = (D.learnSec || 0) / 60;
  const pendingWindowLearn = blocks.filter((b) => b.window && b.kind === 'learn' && (b.status === 'pending' || b.status === 'running')).reduce((a, b) => a + b.dur, 0);
  const needLearn = Math.max(0, learnTarget - learnedMin - pendingWindowLearn);
  const dayword = (start) => (start < 12 * 60 ? 'Training am Vormittag' : start < 17 * 60 ? 'Training am Nachmittag' : start < 21 * 60 ? 'Training am Abend' : 'Training spät am Abend');
  // Gym: die 75 Minuten enthalten Hin- und Rückweg. Es gibt nur diese eine Zahl, die Beschreibung nennt sie nicht.
  const gymLabel = (start) => `${dayword(start)}, inklusive Hin- und Rückweg`;
  const learnDef = (id, dur) => ({ id, kind: 'learn', title: topic ? `Lernen: ${topic.name}` : 'Lernen', sub: topic?.hint || 'Wissenscheck, dann tiefer', dur, min: 15, color: topic?.color || COLORS.learn, icon: topic?.icon || 'book', topicId: topic?.id, carryable: true });

  // 1) Freizeit-Blöcke, die Nils sich per Knopf genommen hat (je 15 Minuten, ganz vorn)
  const fr = freeInfo(D);
  for (let n = 1; n <= fr.slots; n++) {
    flexDefs.push({ id: `free-${n}`, kind: 'free', title: 'Freizeit', sub: 'Danach geht es sofort weiter', dur: FREE_SLOT, min: FREE_SLOT, color: COLORS.free, icon: 'pause', optional: true });
  }
  // 2) Hausaufgaben (nach Fälligkeit), in Stücken von höchstens 60 Minuten
  [...homework].sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999')).forEach((h) => {
    const chunks = D.hwChunks?.[h.id] || 0;
    const mk = (n, dur) => ({ id: `hw-${h.id}-${n}`, kind: 'hw', hwId: h.id, title: `Hausaufgabe: ${h.subject}`, sub: h.title + (h.due ? ` · fällig ${h.due.slice(8, 10)}.${h.due.slice(5, 7)}.` : ''), dur, min: Math.min(15, dur), color: COLORS.hw, icon: 'pencil', carryable: false });
    for (let n = 1; n <= chunks; n++) flexDefs.push(mk(n, 30));
    if ((h.remaining || 0) > 0 && !h.done) flexDefs.push(mk(chunks + 1, Math.min(60, h.remaining)));
  });
  // 3) Lernen (Ziel nach Wochentag)
  for (let i = 1; i <= 4; i++) {
    const id = i === 1 ? 'learn' : `learn-${i}`;
    if (done[id] || started[id]) {
      flexDefs.push(learnDef(id, Math.min(Math.max(needLearn, 15), 60)));
      continue;
    }
    if (needLearn >= 15) flexDefs.push(learnDef(id, Math.min(Math.round(needLearn), 60)));
    break;
  }
  // 4) Ausgleich nach einer akzeptierten Begründung (ersetzt die früheren "15 Minuten weniger Freizeit")
  if (comp?.freeMinus) {
    flexDefs.push({ id: 'comp', kind: 'comp', title: 'Ausgleich für gestern', sub: `${comp.freeMinus} Min extra${comp.extraPages ? ` und ${comp.extraPages} Seite mehr lesen` : ''}`, dur: comp.freeMinus, min: comp.freeMinus, color: COLORS.comp, icon: 'bolt', carryable: false });
  }
  carry.slice(0, 2).forEach((c) => {
    const kind = c.kind;
    flexDefs.push({
      id: `carry-${c.id}`, kind, carryId: c.id, title: `Nachholen: ${kind === 'learn' ? 'Lernen' : kind === 'read' ? 'Lesen' : kind === 'sd' ? 'Selbstverteidigung' : 'Sport'}`,
      sub: `Von ${c.from} liegengeblieben`, dur: c.min, min: Math.min(15, c.min), color: kind === 'learn' ? topic?.color || COLORS.learn : COLORS[kind] || COLORS.learn,
      icon: kind === 'learn' ? 'book' : kind === 'read' ? 'book' : kind === 'sd' ? 'shield' : 'run', topicId: kind === 'learn' ? topic?.id : null, carried: true, carryable: false,
    });
  });
  // 5) Selbstverteidigung: jeden Tag, vor Sport und Lesen eingeplant, damit sie nie aus dem Plan fällt
  if (!wantedKinds.sd) {
    const m = sdMinutes(S);
    flexDefs.push({ id: 'sd', kind: 'sd', title: 'Selbstverteidigung', sub: sdSub(m), dur: m, min: m, color: COLORS.sd, icon: 'shield', carryable: true, must: true });
  }
  // 6) Sport: Gym ab 19:00 (eine feste Dauer), Joggen flexibel ab 16:00
  if (!sportInWindow && (sp.type === 'gym' || sp.type === 'jog')) {
    const d = S.sportDur?.[sp.type] || (sp.type === 'gym' ? 75 : 45);
    flexDefs.push({ id: 'sport', kind: 'sport', title: SPORT_INFO[sp.type].title, sub: '', subFn: sp.type === 'gym' ? gymLabel : dayword, dur: d, min: d, earliest: hm(sp.type === 'gym' ? S.gymEarliest || '19:00' : S.sportEarliest || '16:00'), color: COLORS.sport, icon: SPORT_INFO[sp.type].icon, carryable: true });
  }
  if (!wantedKinds.read) {
    const extra = comp?.extraPages ? ` · +${comp.extraPages} Seite Ausgleich` : '';
    flexDefs.push({ id: 'read', kind: 'read', title: 'Lesen', sub: (book ? book.title : 'Buch') + extra, dur: S.readMinutes || 20, min: 10, color: COLORS.read, icon: 'book', carryable: true });
  }
  if (S.project) flexDefs.push({ id: 'project', kind: 'project', title: `Projekt: ${S.project}`, sub: '30 Min dranbleiben', dur: 30, min: 15, color: COLORS.project, icon: 'wrench', optional: true });

  // Wahl "Worauf hast du Bock?" bevorzugt
  let ordered = flexDefs;
  let chosenDef = null;
  const choice = D.choice?.kind;
  if (choice) {
    const cid = D.choice?.id;
    const idx = cid
      ? flexDefs.findIndex((f) => f.id === cid && !done[f.id])
      : flexDefs.findIndex((f) => f.kind === choice && !done[f.id] && !f.carried);
    if (idx >= 0) {
      chosenDef = flexDefs[idx];
      if (idx > 0) ordered = [flexDefs[idx], ...flexDefs.filter((_, i) => i !== idx)];
    }
  }

  // Erledigte/laufende zuerst fest einplanen
  const pendingDefs = [];
  for (const f of ordered) {
    const d = done[f.id];
    const st = started[f.id];
    if (d) {
      add({ ...f, start: d.start ?? Math.max(afterMorning, (d.end ?? 0) - (d.min || f.dur)), dur: Math.max(1, d.min || f.dur), status: 'done', actual: true });
    } else if (skipped[f.id]) {
      add({ ...f, start: bockStart, dur: 0, status: 'skipped' });
      blocks[blocks.length - 1].end = bockStart;
    } else if (st) {
      const startMin = st.min;
      const dur = Math.max(f.dur, (now ?? startMin) - startMin);
      add({ ...f, start: startMin, dur, status: 'running' });
    } else pendingDefs.push(f);
  }
  const base = Math.max(bockStart, now == null ? 0 : now);
  for (const f of pendingDefs) {
    const from = Math.max(base, f === chosenDef ? 0 : f.earliest || 0); // bewusste Wahl hebt "frühestens" auf
    const spot = placeTask(occ, from, limitEnd, f.dur, f.min, now == null ? null : now);
    if (!spot) {
      if (!f.optional) overflow.push({ id: f.id, kind: f.kind, min: f.dur, title: f.title, carryable: f.carryable, carried: f.carried });
      continue;
    }
    add({ ...f, start: spot.start, dur: spot.dur, status: 'pending', shrunk: spot.dur < f.dur });
  }

  for (const b of blocks) if (b.subFn) b.sub = b.subFn(b.start);

  // Abendcheck: keine feste Uhrzeit. Die Zeit wird nach dem letzten Block reserviert (frühestens zur Richtzeit).
  // Nils startet ihn selbst per Knopf. Er wird nie automatisch als verpasst gewertet.
  {
    const lastEnd = Math.max(0, ...blocks.filter((b) => b.dur > 0 && b.status !== 'skipped' && b.kind !== 'bock' && b.kind !== 'morning').map((b) => b.end));
    const start = Math.max(eveStart, lastEnd);
    blocks.push({
      id: 'evening', kind: 'evening', title: 'Abendcheck', sub: 'Du startest ihn selbst, sobald du zu Hause bist', start, dur: 30, end: start + 30,
      color: COLORS.evening, icon: 'moon', fixed: false, soft: true, status: D.evening?.done ? 'done' : 'pending',
    });
  }
  blocks.sort((a, b) => a.start - b.start || (a.kind === 'bock' ? -1 : 0));

  // Aktuell und Nächstes
  let current = null;
  let next = null;
  const isActionable = (b) => b.status === 'pending' || b.status === 'running';
  if (now != null) {
    const evening = blocks.find((b) => b.id === 'evening');
    const pend = blocks.filter(isActionable);
    const running = pend.find((b) => b.status === 'running' && !b.fixed);
    const lesson = pend.find((b) => b.kind === 'school' && b.status === 'running');
    if (evening.status === 'pending' && now >= evening.start) current = evening;
    else if (running) current = running;
    else if (blocks.find((b) => b.id === 'morning').status === 'pending' && now >= planWake - 120 && !(school.lessons.length && now >= PERIODS[school.lessons[0].i][0] && D.wake == null && false)) current = blocks.find((b) => b.id === 'morning');
    else if (lesson) current = lesson;
    else {
      const c = pend.filter((b) => b.kind !== 'evening').sort((a, b) => a.start - b.start)[0];
      current = c || (evening.status === 'pending' ? evening : null);
    }
    if (current) {
      const rest = pend.filter((b) => b !== current && b.start >= current.start).sort((a, b) => a.start - b.start);
      next = rest[0] || null;
    }
  }
  const nextFixed = now == null ? null : blocks.filter((b) => b.fixed && (b.kind === 'school' || b.kind === 'sport') && b.start > now && b.status === 'pending').sort((a, b) => a.start - b.start)[0] || null;

  return {
    date, wd, weekend, weekType: school.wt, blocks, windows, overflow, current, next, nextFixed,
    wake, planWake, morningEnd, schoolEnd, eveStart: (blocks.find((b) => b.id === 'evening') || { start: eveStart }).start, eveTarget: eveStart, limitEnd, lessons: school.lessons, periods: school.periods,
    free: fr, sport: sp, sportDone: sportDoneAny || blocks.some((b) => b.kind === 'sport' && b.status === 'done'), noSchool,
    bockStart,
  };
}

/** Übersicht für die Ausfall-Eingabe: was fällt aus, welche Fenster entstehen. */
export function cancellationPreview(date, S, TT, D, comp) {
  const day = buildDay({ date, S, TT, D, comp, now: null });
  return day.windows;
}
