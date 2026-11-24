import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../src/core/store.js';
import * as A from '../src/core/actions.js';
import { setSimulated, resetClock, todayStr } from '../src/lib/clock.js';
import { addDays } from '../src/lib/dates.js';
import { computeStreak } from '../src/engine/discipline.js';

const day = (d, sec = 900) => store.updateDay(d, (D) => { D.learnSec = sec; });
function boot(date, time = '10:00') {
  store.resetAll();
  setSimulated(date, time);
  A.startFresh();
  A.rollover();
}

beforeEach(() => resetClock());

describe('Tageswechsel und verpasster Tag', () => {
  it('reißt die Kette, meldet "missed" und startet den Wiedereinstieg', () => {
    boot('2026-11-20');
    store.updateMeta((m) => (m.startDate = '2026-11-10'));
    for (let i = 10; i <= 18; i++) day(`2026-11-${i}`); // 9 Tage
    // 19. nichts, 20. nichts: Heute ist der 21.
    setSimulated('2026-11-21', '08:00');
    A.rollover();
    const m = store.getMeta();
    const al = m.alerts.filter((a) => a.type === 'missed');
    expect(al.length).toBe(1);
    expect(al[0].date).toBe('2026-11-20');
    expect(m.recovery.need).toBe(3);
    expect(m.recovery.prevStreak).toBe(0); // 19. war schon weg
    expect(A.streakNow()).toBe(0);
  });

  it('drei Mini-Lektionen stellen die halbe Kette wieder her', () => {
    boot('2026-11-20');
    store.updateMeta((m) => (m.startDate = '2026-11-10'));
    for (let i = 10; i <= 19; i++) day(`2026-11-${i}`); // 10 Tage Streak
    setSimulated('2026-11-22', '08:00'); // 20. und 21. fehlen? -> nur 20. und 21.
    A.rollover();
    let m = store.getMeta();
    expect(m.recovery.missDate).toBe('2026-11-21');
    expect(m.recovery.prevStreak).toBe(0);
  });

  it('Wiedereinstieg am Folgetag: Streak 10, ein Tag fehlt, drei Lektionen holen 5 zurück', () => {
    boot('2026-11-20');
    store.updateMeta((m) => (m.startDate = '2026-11-10'));
    for (let i = 10; i <= 19; i++) day(`2026-11-${i}`); // 10 Tage
    // 20. fehlt, wir sind am 21.
    setSimulated('2026-11-21', '09:00');
    A.rollover();
    let m = store.getMeta();
    expect(m.recovery.missDate).toBe('2026-11-20');
    expect(m.recovery.prevStreak).toBe(10);
    A.recordLesson('2026-11-21');
    A.recordLesson('2026-11-21');
    expect(store.getMeta().restores['2026-11-20']).toBeUndefined();
    const r = A.recordLesson('2026-11-21');
    expect(r.finished).toBe(true);
    m = store.getMeta();
    expect(m.restores['2026-11-20']).toBe(5);
    expect(m.alerts.some((a) => a.type === 'restored')).toBe(true);
    day('2026-11-21'); // heute gelernt
    expect(computeStreak(store.allDays(), '2026-11-21', m)).toBe(6);
  });

  it('Lektionen nach dem Wiedereinstiegsfenster zählen nicht', () => {
    boot('2026-11-20');
    store.updateMeta((m) => (m.startDate = '2026-11-10'));
    for (let i = 10; i <= 18; i++) day(`2026-11-${i}`);
    setSimulated('2026-11-21', '09:00');
    A.rollover();
    setSimulated('2026-11-23', '09:00');
    const r = A.recordLesson('2026-11-23');
    expect(r).toBeNull();
  });
});

describe('Begründung (eine pro Woche)', () => {
  it('die zweite in derselben Woche wird abgelehnt', () => {
    boot('2026-11-23', '22:00'); // Montag
    expect(A.submitExcuse('2026-11-23', { cat: 'krank', text: 'Ich hatte Fieber und lag den ganzen Tag im Bett.' }).ok).toBe(true);
    setSimulated('2026-11-25', '22:00');
    const v = A.submitExcuse('2026-11-25', { cat: 'familie', text: 'Wir waren den ganzen Tag bei meiner Oma im Krankenhaus.' });
    expect(v.ok).toBe(false);
    expect(v.msg).toMatch(/diese Woche/);
    setSimulated('2026-12-01', '22:00'); // nächste Woche geht wieder
    expect(A.submitExcuse('2026-12-01', { cat: 'krank', text: 'Ich hatte wieder Fieber und lag im Bett, Arzt war da.' }).ok).toBe(true);
  });
});

describe('Begründung', () => {
  it('plausible Begründung rettet den Tag und gibt Ausgleich für morgen', () => {
    boot('2026-11-24', '22:00');
    const v = A.submitExcuse('2026-11-24', { cat: 'krank', text: 'Ich hatte Fieber und lag den ganzen Tag im Bett.' });
    expect(v.ok).toBe(true);
    const m = store.getMeta();
    expect(m.comps['2026-11-25']).toMatchObject({ freeMinus: 15, extraPages: 1 });
    setSimulated('2026-11-25', '12:00');
    const plan = A.planFor('2026-11-25');
    const comp = plan.blocks.find((b) => b.id === 'comp');
    expect(comp.dur).toBe(15); // Ausgleich kommt vor die Freizeit
    // Tag zählt als entschuldigt, Streak bleibt
    expect(A.streakNow()).toBe(0);
    setSimulated('2026-11-26', '08:00');
    A.rollover();
    expect(store.getMeta().alerts.filter((a) => a.type === 'missed')).toHaveLength(1); // nur der 25., nicht der 24.
  });
  it('faule Begründung zählt nicht, der Tag ist verloren', () => {
    boot('2026-11-24', '22:00');
    const v = A.submitExcuse('2026-11-24', { cat: 'sonst', text: 'Ich hatte einfach keinen Bock auf gar nichts heute.' });
    expect(v.ok).toBe(false);
    setSimulated('2026-11-25', '08:00');
    A.rollover();
    expect(store.getMeta().alerts.some((a) => a.type === 'missed' && a.date === '2026-11-24')).toBe(true);
  });
});

describe('Freizeit', () => {
  it('15 Minuten Freizeit gehen nur, solange danach alles in den Tag passt', () => {
    boot('2026-11-24', '16:00');
    store.updateDay('2026-11-24', (D) => { D.wake = 420; D.done = { lunch: { start: 790, end: 800, min: 10 } }; });
    const r1 = A.requestFree('2026-11-24');
    expect(r1.ok).toBe(true);
    let n = 1;
    while (A.requestFree('2026-11-24').ok && n < 40) n++;
    expect(n).toBeGreaterThan(1);
    const p = A.planFor('2026-11-24');
    expect(p.overflow.filter((o) => o.carryable)).toEqual([]); // nichts ist aus dem Plan gefallen
    const r = A.requestFree('2026-11-24');
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/nicht mehr|Plan/);
  });
  it('Freizeit wird mit der echten Zeit verrechnet', () => {
    boot('2026-11-24', '16:00');
    store.updateDay('2026-11-24', (D) => { D.wake = 420; D.done = { lunch: { start: 790, end: 800, min: 10 } }; });
    A.requestFree('2026-11-24');
    const free = A.planFor('2026-11-24').blocks.find((b) => b.kind === 'free');
    A.finishBlock('2026-11-24', free, { minutes: 12 });
    expect(A.planFor('2026-11-24').free.takenMin).toBe(12);
  });
});

describe('Hausaufgaben (Aktionen)', () => {
  it('Eintragen, einplanen, abhaken zieht Restzeit ab und zählt als Lernzeit', () => {
    boot('2026-11-24', '16:00');
    store.updateDay('2026-11-24', (D) => { D.wake = 420; D.done = { lunch: { start: 790, end: 800, min: 10 } }; });
    const id = A.addHomework({ subject: 'Mathe', title: 'Blatt', effort: 120 });
    const b = A.planFor('2026-11-24').blocks.find((x) => x.kind === 'hw');
    expect(b.dur).toBe(60);
    A.finishBlock('2026-11-24', b, { minutes: 60 });
    expect(store.get('hw:' + id).remaining).toBe(60);
    expect(store.getDay('2026-11-24').learnSec).toBe(3600);
    expect(A.streakNow()).toBe(1);
    const b2 = A.planFor('2026-11-24').blocks.filter((x) => x.kind === 'hw');
    expect(b2.map((x) => x.status)).toEqual(['done', 'pending']);
  });
});

describe('Bücher', () => {
  it('die beiden aktuellen Bücher sind vorangelegt', () => {
    boot('2026-11-24', '16:00');
    A.ensureDefaultBooks();
    const t = store.getBooks().map((b) => b.title);
    expect(t).toEqual(['Die 1 %-Methode', 'Think and Grow Rich']);
    A.ensureDefaultBooks();
    expect(store.getBooks()).toHaveLength(2);
  });
});

describe('Nachholen', () => {
  it('Unerledigtes wandert auf den nächsten Tag', () => {
    boot('2026-11-24', '12:00');
    store.updateDay('2026-11-24', (D) => { D.wake = 420; D.learnSec = 600; });
    setSimulated('2026-11-25', '07:30');
    A.rollover();
    const carry = store.getMeta().carry;
    expect(carry.length).toBeGreaterThan(0);
    expect(carry.some((c) => c.kind === 'learn')).toBe(true);
    const plan = A.planFor('2026-11-25');
    expect(plan.blocks.some((b) => b.carried)).toBe(true);
  });
});

describe('Lernsitzung', () => {
  it('speichert Wissensstand, Lücken und zählt als Lektion', () => {
    boot('2026-11-24', '16:00');
    A.ensureTopicPlan('2026-11-24');
    const topic = A.topicFor('2026-11-24');
    A.finishLearnSession('2026-11-24', { topicId: topic.id, packId: 'x', steps: [{ kind: 'quiz', score: 0.5, wrong: ['x|q|0'], right: ['x|q|1'] }], sec: 600, mini: true });
    const p = store.getLearn().topics[topic.id];
    expect(p.sessions).toBe(1);
    expect(p.gaps).toContain('x|q|0');
    expect(p.k).toBeGreaterThan(0);
    expect(store.getDay('2026-11-24').lessons).toBe(1);
  });
  it('5 Minuten Lernzeit sichern den Streak, 4 nicht', () => {
    boot('2026-11-24', '16:00');
    A.addLearnSeconds('2026-11-24', 240);
    expect(A.streakNow()).toBe(0);
    A.addLearnSeconds('2026-11-24', 60);
    expect(A.streakNow()).toBe(1);
  });
});

describe('Wasser', () => {
  it('Wasserziel gibt einmal Punkte', () => {
    boot('2026-11-24', '16:00');
    const before = store.getMeta().points;
    for (let i = 0; i < 6; i++) A.addWater('2026-11-24', 500);
    A.addWater('2026-11-24', 500);
    expect(store.getMeta().points - before).toBeGreaterThanOrEqual(20);
    expect(store.getDay('2026-11-24').water).toBe(3500);
  });
});
