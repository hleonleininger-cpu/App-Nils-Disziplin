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
  it('Ausfall der 3./4. Stunde an einem Dienstag (A) macht ein Fenster, aber ohne Gym (Gym liegt abends)', () => {
    const d = buildDay({ date: '2026-12-01', S, TT, D: { cancelled: [3, 4] }, now: null });
    expect(d.windows).toHaveLength(1);
    const w = d.windows[0];
    expect(w.start).toBe(m(9, 40));
    expect(w.minutes).toBe(95);
    expect(w.options.map((o) => o.kind)).toEqual(expect.arrayContaining(['learn', 'sd', 'read']));
    expect(w.options.map((o) => o.kind)).not.toContain('sport');
    expect(w.options.map((o) => o.kind)).not.toContain('free');
    expect(w.source).toBe('ausfall');
  });
  it('Ausfall am Joggen-Tag: Joggen passt ins Fenster und wird dann nicht doppelt geplant', () => {
    // Mi 2.12. (Woche A) = Joggen; 5/6 fällt aus: 11:35-13:10
    const D = { cancelled: [5, 6], assign: { w695: 'sport' } };
    const d = buildDay({ date: '2026-12-02', S, TT, D, now: null });
    const sports = d.blocks.filter((b) => b.kind === 'sport');
    expect(sports).toHaveLength(1);
    expect(sports[0].window).toBe(true);
    expect(sports[0].dur).toBe(45);
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

describe('Freizeit (neues Modell)', () => {
  it('jeder genommene 15-Minuten-Block steht vorn im Plan und schiebt den Rest nach hinten', () => {
    const D = { wake: m(7), done: { lunch: { start: 790, end: 800, min: 10 } } };
    const a = buildDay({ date: '2026-11-24', S, TT, D, now: m(15) });
    const b = buildDay({ date: '2026-11-24', S, TT, D: { ...D, freeSlots: 1 }, now: m(15) });
    const free = b.blocks.find((x) => x.kind === 'free');
    expect(free.dur).toBe(15);
    expect(free.start).toBe(m(15));
    const learnA = a.blocks.find((x) => x.id === 'learn');
    const learnB = b.blocks.find((x) => x.id === 'learn');
    expect(learnB.start).toBe(learnA.start + 15);
  });
  it('ohne Druck gibt es keinen Freizeitblock und kein Limit', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: { wake: m(7) }, now: m(15) });
    expect(d.blocks.find((x) => x.kind === 'free')).toBeUndefined();
  });
});

describe('Selbstverteidigung, Gym, Handball', () => {
  const D0 = { wake: m(7), done: { lunch: { start: 790, end: 800, min: 10 } } };
  it('Selbstverteidigung: jeden Tag 15 Minuten, auch an Gym-Tagen, und fällt nicht aus dem Plan', () => {
    for (const date of ['2026-11-24', '2026-11-26', '2026-11-29', '2026-11-23']) {
      const d = buildDay({ date, S, TT, D: D0, now: m(15) });
      const sd = d.blocks.find((x) => x.kind === 'sd');
      expect(sd, date).toBeDefined();
      expect(sd.dur).toBe(15);
      expect(sd.sub).toMatch(/Seilspringen/);
      expect(d.overflow.some((o) => o.kind === 'sd'), date).toBe(false);
    }
  });
  it('Gym liegt frühestens ab 19:00, hat überall dieselbe Dauer und eine Beschreibung nach Uhrzeit', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: D0, now: m(15) }); // Di = Gym
    const g = d.blocks.find((x) => x.id === 'sport');
    expect(g.title).toBe('Gym');
    expect(g.start).toBeGreaterThanOrEqual(m(19));
    expect(g.dur).toBe(75);
    expect(g.sub).toBe('Training am Abend, inklusive Hin- und Rückweg');
    expect(g.sub).not.toMatch(/Min/);
    const mid = buildDay({ date: '2026-11-24', S, TT, D: D0, now: m(18) });
    expect(mid.blocks.find((x) => x.id === 'sport').sub).toMatch(/^Training am Abend/);
    // Um 20:32 passen 75 Minuten vor den Abendcheck nicht mehr: Gym fällt nicht gekürzt oder falsch beschriftet an, sondern wandert auf morgen
    const late = buildDay({ date: '2026-11-24', S, TT, D: D0, now: m(20, 32) });
    expect(late.blocks.find((x) => x.id === 'sport')).toBeUndefined();
    expect(late.overflow.some((o) => o.id === 'sport')).toBe(true);
  });
  it('Joggen darf schon um 16:00 liegen', () => {
    const d = buildDay({ date: '2026-11-25', S, TT, D: D0, now: m(15) }); // Mi = Joggen
    const j = d.blocks.find((x) => x.id === 'sport');
    expect(j.title).toBe('Joggen');
    expect(j.start).toBeLessThan(m(19));
    expect(j.start).toBeGreaterThanOrEqual(m(16));
  });
  it('Handball: Hin- und Rückweg je 20 Minuten fest eingeplant (Mo und Fr)', () => {
    const mo = buildDay({ date: '2026-11-23', S, TT, now: null });
    const hin = mo.blocks.find((x) => x.id === 'handball-hin');
    const rueck = mo.blocks.find((x) => x.id === 'handball-rueck');
    expect([hin.start, hin.end]).toEqual([m(18, 10), m(18, 30)]);
    expect([rueck.start, rueck.end]).toEqual([m(20, 15), m(20, 35)]);
    const fr = buildDay({ date: '2026-11-27', S, TT, now: null });
    expect(fr.blocks.find((x) => x.id === 'handball-hin').start).toBe(m(17, 40));
  });
  it('Handball an anderen Tagen als Mo/Fr wird ignoriert', () => {
    const S2 = JSON.parse(JSON.stringify(S));
    S2.sport[2] = { type: 'handball', start: '18:00', end: '20:00' };
    const d = buildDay({ date: '2026-11-25', S: S2, TT, now: null });
    expect(d.blocks.find((x) => x.id === 'handball')).toBeUndefined();
  });
});

describe('Hausaufgaben', () => {
  it('werden mit Aufwand eingeplant, in Stücken von höchstens 60 Minuten, vor dem Lernen', () => {
    const hw = [{ id: 'h1', subject: 'Mathe', title: 'Blatt 4', due: '2026-11-26', effort: 120, remaining: 120 }];
    const D = { wake: m(7), done: { lunch: { start: 790, end: 800, min: 10 } } };
    const d = buildDay({ date: '2026-11-24', S, TT, D, homework: hw, now: m(15) });
    const b = d.blocks.find((x) => x.kind === 'hw');
    expect(b.dur).toBe(60);
    expect(b.title).toMatch(/Mathe/);
    expect(b.start).toBeLessThanOrEqual(d.blocks.find((x) => x.id === 'learn').start);
  });
  it('nach einem erledigten Stück kommt das nächste', () => {
    const hw = [{ id: 'h1', subject: 'Mathe', title: 'Blatt 4', effort: 120, remaining: 60 }];
    const D = { wake: m(7), hwChunks: { h1: 1 }, done: { lunch: { start: 790, end: 800, min: 10 }, 'hw-h1-1': { start: 900, end: 960, min: 60 } } };
    const d = buildDay({ date: '2026-11-24', S, TT, D, homework: hw, now: m(16, 5) });
    expect(d.blocks.filter((x) => x.kind === 'hw').map((x) => x.status)).toEqual(['done', 'pending']);
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

describe('Abendcheck ohne feste Uhrzeit, Gym 75 Minuten inklusive Weg', () => {
  const D = { wake: m(7), learnSec: 3600, done: { lunch: { start: 790, end: 800, min: 10 }, learn: { start: 900, end: 960, min: 60 }, sd: { start: 960, end: 975, min: 15 }, read: { start: 975, end: 995, min: 20 } } };
  it('Gym darf auch um 20:10 beginnen und dauert unverändert 75 Minuten', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: { ...D, choice: { kind: 'sport', id: 'sport' } }, now: m(20, 10) });
    const g = d.blocks.find((x) => x.id === 'sport');
    expect(g.start).toBe(m(20, 10));
    expect(g.dur).toBe(75);
    expect(g.end).toBe(m(21, 25));
  });
  it('Heute und Plan zeigen dieselbe Dauer: die Beschreibung enthält keine Minutenzahl', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D, now: m(18) });
    const g = d.blocks.find((x) => x.id === 'sport');
    expect(g.dur).toBe(75);
    expect(g.sub).not.toMatch(/\d/);
  });
  it('der Abendcheck wird nach dem Gym reserviert und startet nicht vor dem Ende des Gym', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D: { ...D, choice: { kind: 'sport', id: 'sport' } }, now: m(20, 10) });
    const e = d.blocks.find((x) => x.id === 'evening');
    expect(e.start).toBeGreaterThanOrEqual(m(21, 25));
    expect(e.fixed).toBe(false);
  });
  it('wird nicht als verpasst gewertet und drängt nicht, bevor Nils zu Hause sein kann', () => {
    // Gym läuft bis 21:25, um 21:30 ist der Abendcheck erst "bereit", Status bleibt offen
    const d = buildDay({ date: '2026-11-24', S, TT, D: { ...D, started: { sport: { min: m(20, 10), ts: 1 } } }, now: m(21, 0) });
    expect(d.current.id).toBe('sport');
    const late = buildDay({ date: '2026-11-24', S, TT, D: { ...D, done: { ...D.done, sport: { start: m(20, 10), end: m(21, 25), min: 75 } } }, now: m(23, 59) });
    expect(late.blocks.find((x) => x.id === 'evening').status).toBe('pending');
  });
  it('der Abendcheck zählt nicht als "nächster fester Termin"', () => {
    const d = buildDay({ date: '2026-11-24', S, TT, D, now: m(18) });
    expect(d.nextFixed?.kind).not.toBe('evening');
  });
});
