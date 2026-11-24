import { describe, it, expect } from 'vitest';
import { computeStreak, dayStatus, validateExcuse, levelFor, titleFor, bestStreak } from '../src/engine/discipline.js';

const meta = { startDate: '2026-11-10', restores: {} };
const done = { learnSec: 600 };
const days = (o) => o;

describe('Streak', () => {
  it('zählt zusammenhängende Tage mit mindestens 5 Minuten', () => {
    const d = days({ '2026-11-20': done, '2026-11-21': done, '2026-11-22': done });
    expect(computeStreak(d, '2026-11-23', meta)).toBe(3);
    d['2026-11-23'] = done;
    expect(computeStreak(d, '2026-11-23', meta)).toBe(4);
  });
  it('4 Minuten zählen nicht', () => {
    expect(dayStatus({ learnSec: 240 }, '2026-11-20', '2026-11-23', meta)).toBe('missed');
    expect(dayStatus({ learnSec: 300 }, '2026-11-20', '2026-11-23', meta)).toBe('done');
  });
  it('verpasster Tag reißt die Kette', () => {
    const d = days({ '2026-11-19': done, '2026-11-20': done, '2026-11-22': done });
    expect(computeStreak(d, '2026-11-23', meta)).toBe(1);
  });
  it('akzeptierte Begründung hält die Kette, zählt aber nicht', () => {
    const d = days({ '2026-11-20': done, '2026-11-21': { excuse: { accepted: true } }, '2026-11-22': done });
    expect(computeStreak(d, '2026-11-23', meta)).toBe(2);
  });
  it('Wiedereinstieg stellt die halbe Kette wieder her', () => {
    const d = days({});
    for (let i = 10; i <= 19; i++) d[`2026-11-${i}`] = done; // 10 Tage
    // 20.11. verpasst, 21. + 22. gelernt
    d['2026-11-21'] = done;
    d['2026-11-22'] = done;
    const m = { ...meta, restores: { '2026-11-20': 5 } };
    expect(computeStreak(d, '2026-11-23', m)).toBe(2 + 5);
    expect(computeStreak(d, '2026-11-23', meta)).toBe(2);
    expect(bestStreak(d, '2026-11-23', meta)).toBe(10);
  });
  it('heute offen bricht nichts ab', () => {
    const d = days({ '2026-11-22': done });
    expect(computeStreak(d, '2026-11-23', meta)).toBe(1);
  });
});

describe('Begründung', () => {
  it('lehnt dünne und faule Begründungen ab', () => {
    expect(validateExcuse({ cat: 'krank', text: 'krank' }, 0).ok).toBe(false);
    expect(validateExcuse({ cat: 'sonst', text: 'Ich hatte einfach keinen Bock heute auf irgendwas.' }, 0).ok).toBe(false);
    expect(validateExcuse({ cat: '', text: 'Ich war den ganzen Tag im Krankenhaus bei Oma.' }, 0).ok).toBe(false);
  });
  it('nimmt plausible an, aber nur eine pro Woche', () => {
    const t = 'Ich hatte Fieber und lag den ganzen Tag im Bett.';
    expect(validateExcuse({ cat: 'krank', text: t }, 0).ok).toBe(true);
    expect(validateExcuse({ cat: 'krank', text: t }, 1).ok).toBe(false);
  });
});

describe('Level', () => {
  it('Schwellen', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(300)).toBe(3);
    expect(titleFor(1)).toBe('Stufe I');
    expect(titleFor(5)).toBe('Verlässlich');
  });
});
