import * as store from './store.js';
import { nowMin, nowTs, todayStr } from '../lib/clock.js';
import { addDays, diffDays, weekdayIdx } from '../lib/dates.js';
import { rng, uid } from '../lib/util.js';
import { buildDay } from '../engine/plan.js';
import * as disc from '../engine/discipline.js';
import * as learning from '../engine/learning.js';
import { DEFAULT_TOPICS } from '../data/topics.js';
import { BUILTIN_PACKS } from '../data/packs/index.js';
import { SURPRISES } from '../data/texts.js';
import { emit } from './events.js';

// ---------- Daten holen ----------
export const getTopics = () => [...DEFAULT_TOPICS, ...store.getCustomTopics()];
export function getPacks() {
  const map = new Map(BUILTIN_PACKS.map((p) => [p.id, p]));
  store.allPacks().forEach((p) => map.set(p.id, p));
  return [...map.values()];
}
export const topicInfo = (id) => getTopics().find((t) => t.id === id) || null;

export function currentBook() {
  const books = store.getBooks();
  return books.find((b) => !b.finished && b.reading !== false) || null;
}

export function topicIdFor(date) {
  const learn = store.getLearn();
  return learning.pickTopic({ date, learn, topics: getTopics(), packs: getPacks(), settings: store.getSettings() });
}
export function topicFor(date) {
  const id = topicIdFor(date);
  const t = topicInfo(id);
  return t ? { ...t } : null;
}
/** Schreibt die Themenwahl fest (nur bei Aktionen, nie beim Rendern). */
export function ensureTopicPlan(date) {
  const learn = store.getLearn();
  if (learn.plan?.[date]) return learn.plan[date];
  const id = learning.pickTopic({ date, learn, topics: getTopics(), packs: getPacks(), settings: store.getSettings() });
  store.updateLearn((l) => {
    l.plan = l.plan || {};
    l.plan[date] = id;
    if (l.current !== id) {
      l.current = id;
      const p = learning.progressOf(l, id);
      p.runDays = 0;
      l.topics[id] = p;
    }
  });
  return id;
}

export function nowFor(date) {
  const today = todayStr();
  if (date === today) return nowMin();
  return date < today ? 1440 : null;
}

export function planFor(date, opts = {}) {
  const S = store.getSettings();
  const TT = store.getTimetable();
  const D = store.getDay(date);
  const meta = store.getMeta();
  const today = todayStr();
  const now = 'now' in opts ? opts.now : nowFor(date);
  return buildDay({
    date, S, TT, D, now,
    carry: date >= today ? meta.carry : [],
    comp: meta.comps?.[date] || null,
    topic: topicFor(date),
    book: currentBook(),
  });
}
export function statsFor(date, opts = {}) {
  const S = store.getSettings();
  const meta = store.getMeta();
  const D = store.getDay(date);
  const today = todayStr();
  return disc.dayStats({ date, S, TT: store.getTimetable(), D, comp: meta.comps?.[date] || null, now: 'now' in opts ? opts.now : nowFor(date), carry: date >= today ? meta.carry : [] });
}
export function streakNow() {
  const today = todayStr();
  return disc.computeStreak(store.allDays(), today, store.getMeta());
}

// ---------- Punkte ----------
export function award(date, n, why) {
  if (!n) return 0;
  store.updateMeta((m) => {
    m.points += n;
    m.pointsLog.push({ d: date, n, why, t: Date.now() });
    if (m.pointsLog.length > 300) m.pointsLog.splice(0, m.pointsLog.length - 300);
  });
  store.updateDay(date, (d) => {
    d.points = (d.points || 0) + n;
  });
  return n;
}
export function trackUsage(id) {
  store.updateMeta((m) => {
    m.usage[id] = (m.usage[id] || 0) + 1;
  });
}

function maybeSurprise(date, id) {
  const S = store.getSettings();
  if (!S.mechanics.surprise) return null;
  const r = rng(`${date}|${id}|s`)();
  if (r > 0.28) return null;
  const s = SURPRISES[Math.floor(rng(`${date}|${id}|t`)() * SURPRISES.length)];
  if (s.type === 'points') award(date, s.points, 'Überraschung');
  if (s.type === 'free') store.updateDay(date, (d) => (d.freeBonus = (d.freeBonus || 0) + s.free));
  trackUsage('surprise');
  return s;
}

// ---------- Aufstehen ----------
export function confirmWake(date = todayStr()) {
  store.updateDay(date, (d) => {
    d.wake = Math.round(nowMin());
    d.wakeOversleep = false;
  });
}
export function setWake(date, minutes, oversleep = true) {
  store.updateDay(date, (d) => {
    d.wake = Math.round(minutes);
    d.wakeOversleep = oversleep;
  });
}

// ---------- Blöcke ----------
export function startBlock(date, id) {
  store.updateDay(date, (d) => {
    d.started = d.started || {};
    d.started[id] = { min: Math.round(nowMin()), ts: nowTs() };
  });
}
export function cancelStart(date, id) {
  store.updateDay(date, (d) => {
    if (d.started) delete d.started[id];
  });
}
export function skipBlock(date, id) {
  store.updateDay(date, (d) => {
    d.skipped = d.skipped || {};
    d.skipped[id] = true;
    if (d.started) delete d.started[id];
  });
}
export function undoBlock(date, id) {
  store.updateDay(date, (d) => {
    if (d.done) delete d.done[id];
    if (d.skipped) delete d.skipped[id];
    if (d.started) delete d.started[id];
  });
}
export function completeLunch(date = todayStr()) {
  const now = Math.round(nowMin());
  store.updateDay(date, (d) => {
    d.done = d.done || {};
    d.done.lunch = { start: now - 5, end: now, min: 5 };
  });
}

const POINTS_BY_KIND = { sport: disc.POINTS.sport, sd: disc.POINTS.sd, read: disc.POINTS.read, project: 15, free: 0, learn: 0 };

/** Block abhaken. info: { minutes, pages } */
export function finishBlock(date, block, info = {}) {
  const now = Math.round(nowMin());
  const D0 = store.getDay(date);
  const startedAt = D0.started?.[block.id]?.min;
  let minutes = info.minutes ?? (startedAt != null ? Math.max(1, now - startedAt) : block.dur);
  if (block.kind !== 'free' && info.minutes == null) minutes = Math.max(5, Math.min(minutes, block.dur + 30));
  if (block.kind === 'free') minutes = Math.max(1, info.minutes ?? minutes);
  store.updateDay(date, (d) => {
    d.done = d.done || {};
    d.done[block.id] = { start: startedAt ?? now - minutes, end: now, min: minutes };
    if (d.started) delete d.started[block.id];
    if (block.kind === 'free') {
      d.freeLog = d.freeLog || [];
      d.freeLog.push({ start: startedAt ?? now - minutes, end: now, min: minutes });
    }
    if (block.kind === 'read' && info.pages) d.pages = (d.pages || 0) + info.pages;
  });
  if (block.carryId) store.updateMeta((m) => (m.carry = m.carry.filter((c) => c.id !== block.carryId)));
  if (block.kind === 'read' && info.pages) addPagesToBook(info.pages);
  let pts = POINTS_BY_KIND[block.kind] ?? disc.POINTS.task;
  if (block.kind === 'read') pts += Math.min(20, info.pages || 0);
  if (block.kind === 'learn' && !info.fromSession) pts = disc.POINTS.learnBase + Math.floor(minutes / 15) * disc.POINTS.learnPer15;
  if (pts) award(date, pts, block.title);
  const surprise = block.kind === 'free' ? null : maybeSurprise(date, block.id);
  const bonus = checkAllGoals(date);
  emit('celebrate', { points: pts + (bonus || 0), title: block.title, surprise, bonus });
  return { points: pts, surprise };
}
function checkAllGoals(date) {
  const S = store.getSettings();
  if (!S.mechanics.goals) return 0;
  const D = store.getDay(date);
  if (D.bonusAll) return 0;
  const st = statsFor(date);
  if (st.allDone) {
    store.updateDay(date, (d) => (d.bonusAll = true));
    award(date, disc.POINTS.goalsAll, 'Alle Tagesziele');
    trackUsage('goals');
    return disc.POINTS.goalsAll;
  }
  return 0;
}

export function finishFree(date, minutes) {
  const id = planFor(date).blocks.find((b) => b.kind === 'free' && (b.status === 'running' || b.status === 'pending'))?.id || `free-${(store.getDay(date).freeLog || []).length + 1}`;
  return finishBlock(date, { id, kind: 'free', title: 'Freizeit', dur: minutes }, { minutes });
}

export function chooseBock(date, kind, id = null) {
  store.updateDay(date, (d) => {
    d.choice = { kind, ts: nowTs() };
    if (id) d.choice.id = id;
  });
}
export function resetChoice(date) {
  store.updateDay(date, (d) => {
    delete d.choice;
  });
}

// ---------- Wasser ----------
export function addWater(date, ml) {
  const S = store.getSettings();
  let hit = false;
  store.updateDay(date, (d) => {
    const before = d.water || 0;
    d.water = Math.max(0, before + ml);
    if (before < S.waterGoal && d.water >= S.waterGoal && !d.waterAwarded) {
      d.waterAwarded = true;
      hit = true;
    }
    d.waterLog = d.waterLog || [];
    if (ml > 0) d.waterLog.push({ t: Math.round(nowMin()), ml });
  });
  ackReminders('water');
  if (hit) {
    award(date, disc.POINTS.water, 'Wasserziel');
    emit('celebrate', { points: disc.POINTS.water, title: 'Wasserziel geschafft', surprise: maybeSurprise(date, 'water') });
    checkAllGoals(date);
  }
}

// ---------- Ausfall ----------
export function setCancelled(date, periods) {
  store.updateDay(date, (d) => {
    d.cancelled = [...new Set(periods)].sort((a, b) => a - b);
    d.assign = {};
  });
}
export function assignWindow(date, key, kind) {
  store.updateDay(date, (d) => {
    d.assign = d.assign || {};
    d.assign[key] = kind;
  });
}

// ---------- Lernen ----------
export function addLearnSeconds(date, sec, { silent = true, future = true } = {}) {
  let event = null;
  const before = store.getDay(date).learnSec || 0;
  store.updateDay(
    date,
    (d) => {
      d.learnSec = (d.learnSec || 0) + sec;
      if (future) d.futureSec = (d.futureSec || 0) + sec;
    },
    { silent },
  );
  const after = before + sec;
  if (before < disc.STREAK_MIN * 60 && after >= disc.STREAK_MIN * 60) {
    const streak = streakNow();
    const pts = disc.POINTS.streakDay * Math.min(10, streak);
    store.updateDay(date, (d) => (d.streakCounted = true), { silent: true });
    award(date, disc.POINTS.learnBase + pts, 'Streak-Tag');
    event = { streak, points: disc.POINTS.learnBase + pts };
    emit('streak', event);
  }
  return event;
}

export function recordLesson(date) {
  store.updateDay(date, (d) => (d.lessons = (d.lessons || 0) + 1), { silent: true });
  const meta = store.getMeta();
  const rec = meta.recovery;
  if (rec && !rec.restored && date <= rec.until) {
    let finished = false;
    store.updateMeta((m) => {
      m.recovery.done += 1;
      if (m.recovery.done >= m.recovery.need) {
        m.recovery.restored = true;
        const val = Math.ceil(m.recovery.prevStreak / 2);
        m.restores[m.recovery.missDate] = val;
        m.alerts.push({ id: uid(), type: 'restored', value: val, prev: m.recovery.prevStreak, seen: false });
        finished = true;
      }
    });
    award(date, disc.POINTS.recoveryLesson, 'Wiedereinstieg');
    return { recovery: true, finished };
  }
  return null;
}

/** Ergebnis einer Lernsitzung verbuchen. */
export function finishLearnSession(date, res) {
  // res: { topicId, packId, steps: [{kind, score, wrong:[ids], right:[ids]}], teachPassed, sec, blockId, mini }
  const topicId = res.topicId;
  const scored = res.steps.filter((s) => typeof s.score === 'number');
  const score = scored.length ? scored.reduce((a, s) => a + s.score, 0) / scored.length : 0.5;
  store.updateLearn((l) => {
    const p = learning.progressOf(l, topicId);
    if (scored.length) learning.applyScore(p, score);
    p.sessions += 1;
    if (p.lastRunDate !== date) {
      p.daysStudied += 1;
      p.runDays += 1;
      p.lastRunDate = date;
    }
    p.lastDate = date;
    p.firstDate = p.firstDate || date;
    if (res.packId && !p.seen.includes(res.packId)) p.seen.push(res.packId);
    if (res.teachPassed) p.teachPassed += 1;
    res.steps.forEach((s) => {
      (s.wrong || []).forEach((id) => !p.gaps.includes(id) && p.gaps.push(id));
      (s.right || []).forEach((id) => (p.gaps = p.gaps.filter((g) => g !== id)));
    });
    p.gaps = p.gaps.slice(-30);
    l.topics[topicId] = p;
    l.current = topicId;
  });
  store.updateDay(date, (d) => {
    d.sessions = d.sessions || [];
    d.sessions.push({ topicId, packId: res.packId, score: Math.round(score * 100), sec: Math.round(res.sec || 0), mini: Boolean(res.mini), ts: nowTs() });
  });
  const rec = recordLesson(date);
  const minutes = Math.max(1, Math.round((res.sec || 0) / 60));
  const pts = disc.POINTS.learnBase + Math.floor(minutes / 15) * disc.POINTS.learnPer15 + Math.round(score * 10);
  award(date, pts, 'Lernsitzung');
  if (res.blockId && !res.mini) {
    const plan = planFor(date);
    const b = plan.blocks.find((x) => x.id === res.blockId);
    if (b) finishBlock(date, b, { minutes, fromSession: true });
  } else {
    const surprise = maybeSurprise(date, 'sess' + store.getDay(date).sessions.length);
    emit('celebrate', { points: pts, title: res.mini ? 'Mini-Lektion' : 'Lektion geschafft', surprise });
  }
  checkAllGoals(date);
  return { score, points: pts, recovery: rec };
}

export function recordEveningQuiz(date, topicId, steps) {
  const wrong = steps.filter((s) => s.score < 1).map((s) => s.id);
  const right = steps.filter((s) => s.score >= 1).map((s) => s.id);
  const score = steps.length ? steps.reduce((a, s) => a + s.score, 0) / steps.length : 0;
  store.updateLearn((l) => {
    const p = learning.progressOf(l, topicId);
    if (steps.length) {
      p.k = Math.round(p.k + (score * 100 - p.k) * 0.25);
    }
    wrong.forEach((id) => !p.gaps.includes(id) && p.gaps.push(id));
    p.gaps = p.gaps.filter((g) => !right.includes(g)).slice(-30);
    l.topics[topicId] = p;
  });
  store.updateDay(date, (d) => (d.eveQuiz = { score: Math.round(score * 100), n: steps.length }));
  return score;
}

export function setTopicPaused(id, paused) {
  store.updateLearn((l) => {
    const p = learning.progressOf(l, id);
    p.paused = paused;
    l.topics[id] = p;
  });
}
export function forceTopic(date, id) {
  store.updateLearn((l) => {
    l.plan = l.plan || {};
    l.plan[date] = id;
    l.current = id;
    const p = learning.progressOf(l, id);
    l.topics[id] = p;
  });
}

// ---------- Bücher ----------
export function addBook(b) {
  const books = store.getBooks();
  books.push({ id: uid(), title: b.title, author: b.author || '', pages: Number(b.pages) || 0, page: 0, notes: [], quotes: [], finished: false, reading: books.every((x) => x.finished || x.reading === false), added: todayStr() });
  store.setBooks(books);
}
export function updateBook(id, fn) {
  const books = store.getBooks();
  const b = books.find((x) => x.id === id);
  if (b) fn(b);
  store.setBooks(books);
}
function addPagesToBook(n) {
  const cur = currentBook();
  if (!cur) return;
  updateBook(cur.id, (b) => {
    b.page = Math.min(b.pages || 99999, (b.page || 0) + n);
    if (b.pages && b.page >= b.pages) {
      b.finished = true;
      b.reading = false;
    }
  });
}

// ---------- Begründung, Abendcheck ----------
export function submitExcuse(date, { cat, text }) {
  const days = store.allDays();
  const S = store.getSettings();
  const recent = disc.acceptedExcusesLast7(days, date);
  const v = disc.validateExcuse({ cat, text }, recent, S.maxExcuses);
  store.updateDay(date, (d) => {
    d.excuse = { cat, text, accepted: v.ok, msg: v.msg || '', ts: nowTs() };
  });
  if (v.ok) {
    const next = addDays(date, 1);
    store.updateMeta((m) => {
      m.comps[next] = { freeMinus: 15, extraPages: 1, from: date };
    });
  }
  return v;
}

export function saveEvening(date, data) {
  store.updateDay(date, (d) => {
    d.evening = { done: true, at: Math.round(nowMin()), rating: data.rating ?? null, words: data.words || '', prayer: Boolean(data.prayer) };
  });
  award(date, disc.POINTS.evening, 'Abendcheck');
  const tomorrow = addDays(date, 1);
  ensureTopicPlan(tomorrow);
  emit('celebrate', { points: disc.POINTS.evening, title: 'Abendcheck erledigt' });
}

// ---------- Tageswechsel ----------
function leftoversOf(date) {
  const S = store.getSettings();
  const D = store.getDay(date);
  const plan = buildDay({ date, S, TT: store.getTimetable(), D, now: 1440, carry: [], comp: store.getMeta().comps?.[date] || null, topic: topicFor(date), book: currentBook() });
  const out = {};
  const add = (kind, min) => {
    out[kind] = (out[kind] || 0) + min;
  };
  for (const o of plan.overflow) if (o.carryable && !o.carried) add(o.kind, o.min);
  for (const b of plan.blocks) if (b.window && b.status === 'missed' && ['learn', 'sd', 'read', 'sport'].includes(b.kind)) add(b.kind, b.dur);
  const cap = { learn: 45, sd: 15, read: 20, sport: 30 };
  return Object.entries(out).map(([kind, min]) => ({ kind, min: Math.min(cap[kind] || 30, Math.round(min)) }));
}
export function leftoverPreview(date) {
  return leftoversOf(date);
}

export function rollover() {
  const today = todayStr();
  const meta0 = store.getMeta();
  if (!meta0.startDate) {
    store.updateMeta((m) => {
      m.startDate = today;
      m.lastProcessed = addDays(today, -1);
    });
    return;
  }
  let last = meta0.lastProcessed || addDays(meta0.startDate, -1);
  if (last >= addDays(today, -1)) return;
  const days = store.allDays();
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) {
    const m = store.getMeta();
    const D = days[d] || {};
    const st = disc.dayStatus(D, d, today, m);
    const left = d >= m.startDate ? leftoversOf(d) : [];
    store.updateMeta((mm) => {
      // liegen gebliebenes in die Warteschlange (ohne Doppelungen je Art)
      for (const l of left) {
        const ex = mm.carry.find((c) => c.kind === l.kind);
        if (ex) ex.min = Math.min(60, Math.max(ex.min, l.min));
        else mm.carry.push({ id: uid(), kind: l.kind, min: l.min, from: d });
      }
      mm.carry = mm.carry.filter((c) => diffDays(c.from, today) <= 6);
      if (st === 'missed') {
        const prev = disc.computeStreak(days, d, mm); // d selbst zählt nicht (offen)
        const missCount = (days[addDays(d, -1)] && disc.dayStatus(days[addDays(d, -1)], addDays(d, -1), today, mm) === 'missed') ? 2 : 1;
        mm.recovery = { missDate: d, prevStreak: prev, need: 3, done: 0, until: today, restored: false };
        mm.alerts = mm.alerts.filter((a) => a.type !== 'missed' || a.seen);
        mm.alerts.push({ id: uid(), type: 'missed', date: d, prev, seen: false, consecutive: missCount > 1 });
      }
      mm.lastProcessed = d;
    });
  }
  store.updateMeta((m) => (m.lastProcessed = addDays(today, -1)));
  ensureTopicPlan(today);
}

export function markAlertSeen(id) {
  store.updateMeta((m) => {
    const a = m.alerts.find((x) => x.id === id);
    if (a) a.seen = true;
  });
}
export const pendingAlerts = () => store.getMeta().alerts.filter((a) => !a.seen);

// ---------- Wochenherausforderung ----------
export function weekChallengeState(anyDate) {
  const dates = disc.weekDates(anyDate);
  const mon = dates[0];
  const ch = disc.challengeFor(mon);
  const today = todayStr();
  const stats = dates.filter((d) => d <= today).map((d) => statsFor(d));
  const value = ch.measure(stats);
  const meta = store.getMeta();
  return { ch, value, done: value >= ch.target, claimed: Boolean(meta.claimed[mon]), mon };
}
export function claimChallenge(mon) {
  const st = weekChallengeState(mon);
  if (!st.done || st.claimed) return false;
  store.updateMeta((m) => (m.claimed[mon] = true));
  award(todayStr(), disc.POINTS.weeklyChallenge, 'Wochenherausforderung');
  trackUsage('weekly');
  emit('celebrate', { points: disc.POINTS.weeklyChallenge, title: 'Wochenherausforderung geschafft' });
  return true;
}

// ---------- Erinnerungen (Ack) ----------
let ackFn = () => {};
export const setAckHandler = (fn) => (ackFn = fn);
export const ackReminders = (tag) => ackFn(tag);

// ---------- Demo-Daten ----------
export function loadDemoData() {
  const today = todayStr();
  store.resetAll();
  store.updateMeta((m) => {
    m.onboarded = true;
    m.startDate = addDays(today, -14);
    m.lastProcessed = addDays(today, -1);
  });
  const patterns = [1, 1, 1, 'x', 1, 1, 'e', 1, 1, 1, 1, 1, 1, 1]; // 14 Tage: 13.-ter Tag Ausfall, usw.
  for (let i = 14; i >= 1; i--) {
    const d = addDays(today, -i);
    const p = patterns[14 - i];
    store.updateDay(d, (D) => {
      D.wake = 7 * 60 + (i % 3) * 5;
      if (p === 1) {
        D.learnSec = (20 + ((i * 7) % 40)) * 60;
        D.futureSec = Math.min(D.learnSec, (10 + ((i * 3) % 20)) * 60);
        D.water = 2000 + ((i * 250) % 1250);
        D.done = {};
        D.pages = (i * 3) % 12;
        D.evening = { done: true, rating: 3 + (i % 3), words: i % 4 === 0 ? 'Heute war ein guter Tag.' : '' };
      } else if (p === 'e') {
        D.excuse = { cat: 'krank', text: 'Ich hatte Fieber und lag den ganzen Tag im Bett.', accepted: true };
        D.water = 1500;
      } else {
        D.water = 800;
      }
    });
  }
  // demo: Streak 5 nach 'x' vor 11 Tagen, Rest ergibt sich aus dem Verlauf
  store.updateMeta((m) => {
    m.points = 640;
  });
  addBook({ title: 'Beispielbuch: Wie man Freunde gewinnt', author: 'Testdaten', pages: 320 });
  addBook({ title: 'Beispielbuch: Der kluge Geldanleger', author: 'Testdaten', pages: 480 });
  updateBook(store.getBooks()[0].id, (b) => {
    b.page = 87;
    b.quotes.push({ text: 'Interessiere dich ehrlich für andere Menschen.', page: 45 });
  });
  store.updateLearn((l) => {
    l.topics.finanzen = { ...learning.newProgress(), k: 62, sessions: 3, runDays: 3, daysStudied: 3, lastDate: addDays(today, -3), firstDate: addDays(today, -9), seen: ['finanzen-zinseszins'], gaps: ['finanzen-zinseszins|q|0'], lastRunDate: addDays(today, -3) };
    l.topics.programmieren = { ...learning.newProgress(), k: 78, sessions: 4, runDays: 4, daysStudied: 4, lastDate: addDays(today, -6), firstDate: addDays(today, -12), teachPassed: 1, seen: ['programmieren-basics'], lastRunDate: addDays(today, -6) };
    l.current = 'finanzen';
  });
  store.updateSettings((s) => (s.project = 'Euro Wellness: Produktliste anlegen'));
}

export function startFresh() {
  store.resetAll({ keepSettings: true });
  store.updateMeta((m) => {
    m.onboarded = true;
    m.startDate = todayStr();
    m.lastProcessed = addDays(todayStr(), -1);
  });
}
