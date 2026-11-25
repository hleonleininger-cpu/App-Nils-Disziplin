// Lernsystem: Themenwahl, Wissensstand, Sitzungsaufbau, Abendabfrage.
import { rng, shuffle, hashStr } from '../lib/util.js';
import { addDays, diffDays } from '../lib/dates.js';
import { FORMATS_OF_DAY } from '../data/texts.js';

export function newProgress() {
  return { k: 0, sessions: 0, runDays: 0, daysStudied: 0, lastDate: null, firstDate: null, teachPassed: 0, seen: [], gaps: [], paused: false, lastRunDate: null };
}
export const progressOf = (learn, id) => ({ ...newProgress(), ...(learn.topics?.[id] || {}) });

export function statusOf(p) {
  if (!p.sessions) return 'neu';
  if (p.k >= 70 && p.teachPassed >= 1 && p.sessions >= 2) return 'grundlage';
  return 'lernt';
}
export const STATUS_TEXT = { neu: 'Neu', lernt: 'Noch Lücken', grundlage: 'Grundlage sitzt' };

export function applyScore(p, score01) {
  const target = score01 * 100;
  p.k = p.sessions === 0 ? Math.round(target * 0.7) : Math.round(p.k + (target - p.k) * 0.35);
  return p;
}

export function packsFor(topicId, packs) {
  return packs.filter((p) => p.topic === topicId).sort((a, b) => (a.level || 1) - (b.level || 1) || a.title.localeCompare(b.title));
}

/** Wählt das Thema für einen Tag. Reine Funktion. */
export function pickTopic({ date, learn, topics, packs, settings }) {
  const fixed = learn.plan?.[date];
  if (fixed && topics.find((t) => t.id === fixed)) return fixed;
  const min = settings?.topicDays?.min ?? 3;
  const max = settings?.topicDays?.max ?? 10;
  const usable = topics.filter((t) => !progressOf(learn, t.id).paused && packsFor(t.id, packs).length > 0);
  if (!usable.length) return topics[0]?.id || null;
  const cur = learn.current;
  if (cur && usable.find((t) => t.id === cur)) {
    const p = progressOf(learn, cur);
    const st = statusOf(p);
    const stay = p.runDays < min || (st !== 'grundlage' && p.runDays < max);
    if (stay) return cur;
  }
  const others = usable.filter((t) => t.id !== cur);
  const pool = others.length ? others : usable;
  const scored = pool.map((t, i) => {
    const p = progressOf(learn, t.id);
    const age = p.lastDate ? diffDays(p.lastDate, date) : 9999;
    return { id: t.id, age, k: p.k, i };
  });
  scored.sort((a, b) => b.age - a.age || a.k - b.k || a.i - b.i);
  return scored[0].id;
}

// ---------- Aufgaben-Items ----------
function itemsOf(pack) {
  const items = [];
  pack.quiz?.forEach((q, i) => items.push({ id: `${pack.id}|q|${i}`, type: 'mc', q: q.q, options: q.options, answer: q.answer, explain: q.explain, packId: pack.id, uncertain: q.uncertain }));
  pack.flashcards?.forEach((c, i) => items.push({ id: `${pack.id}|c|${i}`, type: 'card', q: c.q, a: c.a, packId: pack.id, uncertain: c.uncertain }));
  pack.questions?.forEach((q, i) => items.push({ id: `${pack.id}|o|${i}`, type: 'open', q: q.q, keyPoints: q.keyPoints || [], packId: pack.id, uncertain: q.uncertain }));
  return items;
}
export const itemsFromPacks = (packs) => packs.flatMap(itemsOf);

export function formatOfDay(date) {
  return FORMATS_OF_DAY[hashStr(date) % FORMATS_OF_DAY.length];
}

/**
 * Baut eine Lernsitzung als Liste von Schritten.
 * opts: { topic, packs (des Themas), progress, date, mini }
 */
export function buildSession({ topic, packs, progress, date, mini = false }) {
  const r = rng(`${date}|${topic?.id}|${progress.sessions}`);
  const steps = [];
  const fod = formatOfDay(date);
  if (!packs.length) {
    steps.push({ kind: 'free', title: 'Eigenes Vorwissen', nominalMin: 5 });
    return { steps, pack: null, fod };
  }
  // Paket wählen: erst ungesehene (wenn Wissen halbwegs sitzt), sonst wiederholen
  const unseen = packs.filter((p) => !progress.seen.includes(p.id));
  let pack;
  if (!progress.sessions) pack = packs[0];
  else if (unseen.length && progress.k >= 40) pack = unseen[0];
  else {
    const lastSeen = progress.seen[progress.seen.length - 1];
    pack = packs.find((p) => p.id === lastSeen) || packs[0];
  }
  const deeper = !progress.seen.includes(pack.id);
  const seenPacks = packs.filter((p) => progress.seen.includes(p.id));

  // 1) Wissenscheck bei Wiederkehr
  if (!mini && progress.sessions > 0 && seenPacks.length) {
    const pool = itemsFromPacks(seenPacks).filter((it) => it.type !== 'card' || true);
    const gapItems = pool.filter((it) => progress.gaps.includes(it.id));
    const rest = shuffle(pool.filter((it) => !progress.gaps.includes(it.id)), `${date}|chk`);
    const items = [...gapItems, ...rest].slice(0, 3);
    if (items.length) steps.push({ kind: 'check', title: 'Wissenscheck: Was weißt du noch?', items, nominalMin: 3 });
  }
  // 2) Erklärung
  if (!mini && (deeper || progress.sessions === 0 || progress.k < 60) && pack.explain?.length) {
    steps.push({ kind: 'read', title: deeper ? 'Neues Wissen' : 'Nochmal lesen', pack, nominalMin: 4 });
  }
  // 3) Übungsformate
  const pool = itemsOf(pack);
  const gapPool = itemsFromPacks(packs).filter((it) => progress.gaps.includes(it.id));
  const formats = [];
  if (pack.flashcards?.length >= 2) formats.push('cards');
  if (pack.quiz?.length) formats.push('quiz');
  if (pack.questions?.length) formats.push('quick');
  if (pack.questions?.length) formats.push('voice');
  if (pack.scenarios?.length) formats.push('scenario');
  if (pack.cases?.length) formats.push('detective');
  if (pack.teachBack?.prompt) formats.push('teach');
  let order = shuffle(formats, `${date}|${pack.id}|fmt`);
  const f = fod.id;
  if (order.includes(f)) order = [f, ...order.filter((x) => x !== f)];
  // teach nicht als Erstes, wenn neues Wissen
  if (order[0] === 'teach' && order.length > 1) order = [...order.slice(1), 'teach'];
  const count = mini ? 2 : Math.min(order.length, 4);
  if (mini) order = ['cards', 'quiz'].filter((x) => formats.includes(x)).concat(order.filter((x) => !['cards', 'quiz'].includes(x))).slice(0, 2);
  for (const fmt of order.slice(0, count)) {
    if (fmt === 'cards') {
      let cards = shuffle(pool.filter((i) => i.type === 'card'), `${date}|cards`);
      cards = [...gapPool.filter((i) => i.type === 'card'), ...cards].slice(0, mini ? 3 : 5);
      steps.push({ kind: 'cards', title: 'Karteikarten', items: cards, nominalMin: 3 });
    } else if (fmt === 'quiz') {
      let qs = shuffle(pool.filter((i) => i.type === 'mc'), `${date}|quiz`);
      qs = [...gapPool.filter((i) => i.type === 'mc'), ...qs].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i).slice(0, mini ? 2 : 4);
      steps.push({ kind: 'quiz', title: 'Mini-Quiz', items: qs, nominalMin: 3 });
    } else if (fmt === 'quick') {
      steps.push({ kind: 'quick', title: 'Kurze Frage, kurze Antwort', items: shuffle(pool.filter((i) => i.type === 'open'), `${date}|quick`).slice(0, 2), nominalMin: 4 });
    } else if (fmt === 'voice') {
      steps.push({ kind: 'voice', title: 'Mündliche Abfrage', items: shuffle(pool.filter((i) => i.type === 'open'), `${date}|voice`).slice(0, 1), nominalMin: 3 });
    } else if (fmt === 'scenario') {
      const s = pack.scenarios[Math.floor(r() * pack.scenarios.length)];
      steps.push({ kind: 'scenario', title: 'Was würdest du tun?', scenario: s, scenarioIndex: pack.scenarios.indexOf(s), packId: pack.id, nominalMin: 3 });
    } else if (fmt === 'detective') {
      const c = pack.cases[Math.floor(r() * pack.cases.length)];
      steps.push({ kind: 'detective', title: c.type === 'detektiv' ? 'Detektivaufgabe' : 'Fallrätsel', case: c, caseIndex: pack.cases.indexOf(c), packId: pack.id, nominalMin: 4 });
    } else if (fmt === 'teach') {
      steps.push({ kind: 'teach', title: 'Erklär es einem Freund', teach: pack.teachBack, packId: pack.id, nominalMin: 5 });
    }
  }
  // Die Praxisaufgabe steht am Ende jeder normalen Lektion (nicht in Mini-Lektionen)
  if (!mini && pack.practice?.task) steps.push({ kind: 'practice', title: 'Praxisaufgabe', practice: pack.practice, packId: pack.id, nominalMin: 2 });
  return { steps, pack, fod };
}

/** Drei Fragen für die Abendabfrage zum Tagesthema. */
export function buildEveningQuiz({ topicId, packs, progress, date }) {
  const mine = packsFor(topicId, packs);
  const seen = mine.filter((p) => progress.seen.includes(p.id));
  const base = seen.length ? seen : mine;
  const pool = itemsFromPacks(base).filter((i) => i.type !== 'card' || true);
  if (!pool.length) return [];
  const gap = pool.filter((i) => progress.gaps.includes(i.id));
  const rest = shuffle(pool.filter((i) => !progress.gaps.includes(i.id)), `${date}|eve`);
  return [...gap, ...rest].slice(0, 3);
}

/** Wie viele Stichwörter einer Antwort stecken im Text? Grobe Hilfe, der Nutzer bestätigt selbst. */
export function matchKeyPoints(text, keyPoints) {
  const t = (text || '').toLowerCase();
  return keyPoints.map((k) => {
    const stem = k.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, '').trim();
    if (!stem) return false;
    if (t.includes(stem)) return true;
    const words = stem.split(' ').filter((w) => w.length > 3);
    return words.length > 0 && words.some((w) => t.includes(w.slice(0, Math.max(4, w.length - 2))));
  });
}
export function countTerms(text, terms) {
  const t = (text || '').toLowerCase();
  return terms.map((x) => t.includes(x.toLowerCase().slice(0, Math.max(4, x.length - 2))));
}
export { addDays };
