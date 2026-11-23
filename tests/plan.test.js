import { describe, it, expect } from 'vitest';
import { weekType, isoWeek, weekdayIdx } from '../src/lib/dates.js';
import { buildDay } from '../src/engine/plan.js';
import { DEFAULT_SETTINGS } from '../src/core/defaults.js';
import { DEFAULT_TIMETABLE } from '../src/data/timetable.js';

const S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
const TT = DEFAULT_TIMETABLE;
const m = (h, mi = 0) => h * 60 + mi;

describe('Wochentyp', () => {
  it('KW46 B, KW47 A, KW48 B', () => {
    expect(isoWeek('2026-11-17').week).toBe(47);
    expect(weekType('2026-11-09')).toBe('B');
    expect(weekType('2026-11-16')).toBe('A');
    expect(weekType('2026-11-22')).toBe('A');
    expect(weekType('2026-11-23')).toBe('B');
    expect(weekType('2026-11-30')).toBe('A');
  });
  it('läuft über den Jahreswechsel fortlaufend weiter', () => {
    // 2026 hat KW 53; die Folgewoche ab 4.1.2027 muss B sein, weil 28.12. A ist
    expect(weekType('2026-12-28')).toBe('A');
    expect(weekType('2027-01-04')).toBe('B');
  });
  it('Flip dreht um', () => {
    expect(weekType('2026-11-23', true)).toBe('A');
  });
  it('Wochentage', () => {
    expect(weekdayIdx('2026-11-23')).toBe(0);
  });
});

describe('Plan Woche B, Montag 23.11.', () => {
  const date = '2026-11-23';
  it('hat Deutsch, Erdkunde, Freistunde 5/6 und Englisch', () => {
    const d = buildDay({ date, S, TT, now: null });
    const school = d.blocks.filter((b) => b.kind === 'school').map((b) => b.title);
    expect(school).toEqual(['Deutsch', 'Erdkunde', 'Englisch']);
    expect(d.windows).toHaveLength(1);
    expect(d.windows[0].start).toBe(m(11, 35));
    expect(d.windows[0].end).toBe(m(13, 10));
    const win = d.blocks.find((b) => b.window);
    expect(win.kind).toBe('learn');
    expect(win.dur).toBe(95);
  });
  it('Handball fest 18:30 bis 20:15, Abendcheck 21:30', () => {
    const d = buildDay({ date, S, TT, now: null });
    const h = d.blocks.find((b) => b.id === 'handball');
    expect([h.start, h.end]).toEqual([m(18, 30), m(20, 15)]);
    expect(d.blocks.find((b) => b.id === 'evening').start).toBe(m(21, 30));
  });
  it('kein Block überlappt einen festen Termin', () => {
    const d = buildDay({ date, S, TT, now: m(15, 30) });
    const fixed = d.blocks.filter((b) => b.fixed && b.dur > 0);
    for (const b of d.blocks.filter((x) => !x.fixed && x.dur > 0 && x.status === 'pending')) {
      for (const f of fixed) expect(b.start < f.end && f.start < b.end).toBe(false);
    }
  });
});

describe('Plan Woche A, Montag 16.11.', () => {
  it('keine Freistunde, Schule bis 15:20', () => {
    const d = buildDay({ date: '2026-11-16', S, TT, now: null });
    expect(d.windows).toHaveLength(0);
    expect(d.schoolEnd).toBe(m(15, 20));
  });
});

describe('Ausfall', () => {
  it('Ausfall der 3./4. Stunde an einem Dienstag (A) macht ein Fenster mit Gym-Vorschlag', () => {
    const d = buildDay({ date: '2026-11-17', S, TT, D: { cancelled: [3, 4] }, now: null });
    expect(d.windows).toHaveLength(1);
    const w = d.windows[0];
    expect(w.start).toBe(m(9, 40));
    expect(w.minutes).toBe(95);
    expect(w.options.map((o) => o.kind)).toEqual(expect.arrayContaining(['learn', 'sport']));
    expect(w.source).toBe('ausfall');
  });
  it('Ausfall wird übernommen: Gym im Fenster, kein zweites Gym am Nachmittag', () => {
    // Do 26.11. (Woche A) hat 5/6 Physik; Ausfall von 5/6 gibt 11:35-13:10 = 95 Min; Do = Gym
    const D = { cancelled: [5, 6], assign: { w695: 'sport' } };
    const d = buildDay({ date: '2026-11-26', S, TT, D, now: null });
    const sports = d.blocks.filter((b) => b.kind === 'sport');
    expect(sports).toHaveLength(1);
    expect(sports[0].window).toBe(true);
    expect(sports[0].dur).toBe(75);
  });
  it('Schulschluss rückt vor, wenn die letzte Stunde ausfällt', () => {
    const d = buildDay({ date: '2026-11-16', S, TT, D: { cancelled: [7, 8] }, now: null });
    expect(d.schoolEnd).toBe(m(13, 10));
  });
});

describe('Verschlafen', () => {
  it('Wochenende: alles verschiebt sich', () => {
    const date = '2026-11-28'; // Samstag
    const d1 = buildDay({ date, S, TT, now: null });
    const d2 = buildDay({ date, S, TT, D: { wake: m(11, 0), done: {} }, now: null });
    expect(d1.blocks.find((b) => b.id === 'morning').start).toBe(m(10));
    expect(d2.blocks.find((b) => b.id === 'morning').start).toBe(m(11));
    expect(d2.bockStart).toBe(m(11, 30));
  });
  it('Schulstunden vor der tatsächlichen Aufstehzeit werden als verschlafen markiert', () => {
    const d = buildDay({ date: '2026-11-23', S, TT, D: { wake: m(9, 0) }, now: m(9, 5) });
    const first = d.blocks.find((b) => b.kind === 'school');
    expect(first.status).toBe('slept');
  });
});

describe('Freizeitlimit', () => {
  it('Limit minus Ausgleich und verbrauchte Zeit', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, comp: { freeMinus: 15 }, D: { freeLog: [{ min: 20 }] }, now: m(15) });
    expect(d.free.limit).toBe(45);
    expect(d.free.remaining).toBe(25);
  });
  it('verbraucht = kein Freizeitblock mehr', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: { freeLog: [{ min: 60 }] }, now: m(15) });
    expect(d.blocks.find((b) => b.kind === 'free')).toBeUndefined();
  });
});

describe('Aktuell', () => {
  it('um 7:00 ist Aufstehen dran', () => {
    const d = buildDay({ date: '2026-11-23', S, TT, now: m(7, 0) });
    expect(d.current.id).toBe('morning');
  });
  it('nach dem Mittag kommt zuerst "Worauf hast du Bock?"', () => {
    const D = { wake: m(7), done: { lunch: { start: 790, end: 820, min: 30 } } };
    const d = buildDay({ date: '2026-11-24', S, TT, D, now: m(13, 40) });
    expect(d.current.id).toBe('bock');
  });
  it('mit Wahl "lernen" beginnt die Lernaufgabe sofort', () => {
    const D = { wake: m(7), done: { lunch: { start: 790, end: 820, min: 30 } }, choice: { kind: 'learn' } };
    const d = buildDay({ date: '2026-11-24', S, TT, D, now: m(13, 45) });
    expect(d.current.kind).toBe('learn');
    expect(d.current.start).toBe(m(13, 45));
  });
  it('ab 21:30 ist der Abendcheck dran', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: { wake: m(7) }, now: m(21, 40) });
    expect(d.current.id).toBe('evening');
  });
  it('Aufgaben, die nicht mehr passen, landen im Overflow', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: { wake: m(7), choice: { kind: 'free' } }, now: m(21, 0) });
    expect(d.overflow.length).toBeGreaterThan(0);
  });
});

describe('Regressionen aus dem E2E-Lauf', () => {
  it('verpasste Freistunde ersetzt nicht den Lernblock am Nachmittag', () => {
    // Mo 23.11. (Woche B): 5/6 frei, es ist 15:40 und nichts gelernt
    const D = { wake: m(7), choice: { kind: 'learn' }, done: { lunch: { start: 15 * 60 + 20, end: 15 * 60 + 35, min: 15 } } };
    const d = buildDay({ date: '2026-11-23', S, TT, D, now: m(15, 40) });
    expect(d.blocks.find((b) => b.window).status).toBe('missed');
    expect(d.current.kind).toBe('learn');
  });
  it('vorzeitig abgehaktes Mittag bringt die Bock-Frage nach vorn', () => {
    const D = { wake: m(7), done: { lunch: { start: 15 * 60 + 20, end: 15 * 60 + 35, min: 15 } } };
    const d = buildDay({ date: '2026-11-23', S, TT, D, now: m(15, 40) });
    expect(d.current.id).toBe('bock');
  });
  it('wer nach 2 Stunden nicht aufgestanden meldet, bleibt nicht im Aufsteh-Block hängen', () => {
    const d = buildDay({ date: '2026-11-28', S, TT, now: m(14, 0) });
    expect(d.current.id).not.toBe('morning');
  });
  it('nach einer kurzen Lernsitzung kommt weiteres Lernen dran, bis das Ziel erreicht ist', () => {
    const D = { wake: m(7), learnSec: 6 * 60, done: { learn: { start: 900, end: 906, min: 6 }, lunch: { start: 900, end: 905, min: 5 } }, choice: { kind: 'learn' } };
    const d = buildDay({ date: '2026-11-24', S, TT, D, now: m(16) });
    expect(d.blocks.some((b) => b.id === 'learn-2' && b.status === 'pending')).toBe(true);
  });
});

describe('Tauschen über Block-ID', () => {
  it('wählt den regulären Sport-Block, auch wenn ein Nachhol-Sport existiert', () => {
    const D = { wake: m(7), choice: { kind: 'sport', id: 'sport' }, done: { lunch: { start: 790, end: 800, min: 10 } } };
    const carry = [{ id: 'abc', kind: 'sport', min: 30, from: '2026-11-23' }];
    const d = buildDay({ date: '2026-12-01', S, TT, D, carry, now: m(15) });
    expect(d.current.id).toBe('sport');
    expect(d.blocks.some((b) => b.id === 'carry-abc')).toBe(true);
  });
});
