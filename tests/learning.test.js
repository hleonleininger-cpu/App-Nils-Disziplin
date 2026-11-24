import { describe, it, expect } from 'vitest';
import { parseImport, validatePack } from '../src/engine/importer.js';
import { pickTopic, newProgress, buildSession, statusOf, applyScore, matchKeyPoints, packsFor } from '../src/engine/learning.js';
import { BUILTIN_PACKS } from '../src/data/packs/index.js';
import { DEFAULT_TOPICS } from '../src/data/topics.js';

describe('Import JSON', () => {
  it('gültiges Paket', () => {
    const r = parseImport(JSON.stringify({ topic: 'finanzen', title: 'Test', quiz: [{ q: 'A?', options: ['a', 'b'], answer: 1 }] }));
    expect(r.results[0].ok).toBe(true);
    expect(r.results[0].pack.id).toBe('finanzen-test');
  });
  it('lehnt kaputtes JSON ab', () => {
    expect(parseImport('{ kaputt').fatal).toMatch(/JSON/);
  });
  it('meldet fehlende Felder und falschen Antwortindex', () => {
    const r = validatePack({ title: 'x', quiz: [{ q: 'A?', options: ['a', 'b'], answer: 5 }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/topic/);
    expect(r.warnings.join(' ')).toMatch(/Quiz-Frage 1/);
  });
  it('alle eingebauten Pakete sind gültig', () => {
    for (const p of BUILTIN_PACKS) {
      const r = validatePack(p);
      expect(r.errors, p.id).toEqual([]);
    }
  });
});

describe('Import Markdown', () => {
  const md = `# Zinsen
topic: finanzen
level: 2

## Zusammenfassung
Kurz und knapp.

## Erklärung
### Grundlage
Text eins.

## Fachbegriffe
- Zins: Preis für Geld

## Karteikarten
- Was ist Zins? => Preis für geliehenes Geld

## Quiz
### Was ist 10% von 100?
- [ ] 1
- [x] 10
- [ ] 100
Erklärung: Zehn Prozent.

## Fragen
- Erkläre Zins? || Preis; Geld

## Erkläre es einem Freund
Aufgabe: Erkläre Zins.
Begriffe: Zins; Kredit
Nachfragen: Warum gibt es Zins?

## Quellen
- Bundesbank | https://www.bundesbank.de`;
  it('parst alle Abschnitte', () => {
    const r = parseImport(md).results[0];
    expect(r.errors).toEqual([]);
    const p = r.pack;
    expect(p.topic).toBe('finanzen');
    expect(p.level).toBe(2);
    expect(p.explain[0].heading).toBe('Grundlage');
    expect(p.terms[0].term).toBe('Zins');
    expect(p.flashcards[0].a).toMatch(/Preis/);
    expect(p.quiz[0].answer).toBe(1);
    expect(p.quiz[0].explain).toBe('Zehn Prozent.');
    expect(p.questions[0].keyPoints).toEqual(['Preis', 'Geld']);
    expect(p.teachBack.mustInclude).toEqual(['Zins', 'Kredit']);
    expect(p.sources[0].url).toMatch(/bundesbank/);
  });
});

describe('Themenwahl', () => {
  const topics = DEFAULT_TOPICS;
  const packs = BUILTIN_PACKS;
  const settings = { topicDays: { min: 3, max: 10 } };
  it('wählt am Anfang ein Thema mit Inhalt', () => {
    const id = pickTopic({ date: '2026-11-24', learn: { topics: {}, plan: {} }, topics, packs, settings });
    expect(packsFor(id, packs).length).toBeGreaterThan(0);
  });
  it('bleibt bei Lücken am Thema', () => {
    const p = { ...newProgress(), sessions: 2, runDays: 4, k: 40 };
    const id = pickTopic({ date: '2026-11-25', learn: { current: 'finanzen', topics: { finanzen: p }, plan: {} }, topics, packs, settings });
    expect(id).toBe('finanzen');
  });
  it('wechselt, wenn die Grundlage sitzt', () => {
    const p = { ...newProgress(), sessions: 4, runDays: 4, k: 80, teachPassed: 1 };
    expect(statusOf(p)).toBe('grundlage');
    const id = pickTopic({ date: '2026-11-25', learn: { current: 'finanzen', topics: { finanzen: p }, plan: {} }, topics, packs, settings });
    expect(id).not.toBe('finanzen');
  });
  it('wechselt spätestens nach 10 Tagen', () => {
    const p = { ...newProgress(), sessions: 10, runDays: 10, k: 30 };
    const id = pickTopic({ date: '2026-11-25', learn: { current: 'finanzen', topics: { finanzen: p }, plan: {} }, topics, packs, settings });
    expect(id).not.toBe('finanzen');
  });
});

describe('Sitzung und Wissen', () => {
  it('baut eine Sitzung mit Schritten', () => {
    const packs = packsFor('finanzen', BUILTIN_PACKS);
    const s = buildSession({ topic: { id: 'finanzen' }, packs, progress: newProgress(), date: '2026-11-24' });
    expect(s.steps.length).toBeGreaterThanOrEqual(3);
    expect(s.steps[0].kind).toBe('read');
  });
  it('Wiederkehr beginnt mit Wissenscheck', () => {
    const packs = packsFor('finanzen', BUILTIN_PACKS);
    const p = { ...newProgress(), sessions: 1, seen: [packs[0].id], k: 50 };
    const s = buildSession({ topic: { id: 'finanzen' }, packs, progress: p, date: '2026-11-30' });
    expect(s.steps[0].kind).toBe('check');
  });
  it('Wissensstand steigt und fällt', () => {
    const p = newProgress();
    applyScore(p, 1);
    expect(p.k).toBe(70);
    p.sessions = 1;
    applyScore(p, 0);
    expect(p.k).toBeLessThan(70);
  });
  it('Stichwort-Erkennung', () => {
    const m = matchKeyPoints('Der Zinseszins wächst exponentiell mit der Zeit', ['Zinseszins', 'Zeit', 'exponentiell', 'Banane']);
    expect(m).toEqual([true, true, true, false]);
  });
});

import { routeKey, TABLES } from '../src/core/sync.js';
describe('Sync-Zuordnung', () => {
  it('ordnet Schlüssel den Tabellen zu und zurück', () => {
    const cases = { 'day:2026-11-24': ['day_log', { day: '2026-11-24' }], settings: ['settings', { key: 'settings' }], timetable: ['settings', { key: 'timetable' }], meta: ['streak', {}], books: ['books', {}], learn: ['topics', { key: 'learn' }], 'pack:x-y': ['packs', { id: 'x-y' }], 'excuse:2026-11-24': ['excuses', { day: '2026-11-24' }], 'hw:abc': ['homework', { id: 'abc' }] };
    for (const [k, [t, cols]] of Object.entries(cases)) {
      const r = routeKey(k);
      expect(r.t, k).toBe(t);
      expect(r.to(k)).toEqual(cols);
      expect(r.from(cols), k).toBe(k);
    }
    expect(routeKey('irgendwas').t).toBe('settings');
    expect(TABLES.length).toBe(9);
  });
});

describe('Import: Fehlermeldungen', () => {
  const good = { topic: 'finanzen', title: 'T', quiz: [{ q: 'A?', options: ['a', 'b'], answer: 0 }] };
  it('unvollständiges JSON meldet fehlende Klammer statt Feldfehler', () => {
    const txt = JSON.stringify(good, null, 2).slice(0, -2); // letzte } weg
    const r = parseImport(txt);
    expect(r.fatal).toMatch(/JSON unvollständig oder fehlerhaft/);
    expect(r.fatal).toMatch(/fehlen 1 schließende geschweifte Klammer/);
    expect(r.results).toEqual([]);
  });
  it('Code-Zaun und Einleitung stören nicht', () => {
    const r = parseImport('Hier ist dein Paket:\n```json\n' + JSON.stringify(good) + '\n```\nViel Erfolg');
    expect(r.fatal).toBeNull();
    expect(r.results[0].ok).toBe(true);
  });
  it('JSON mit Text davor ohne Zaun wird nicht als Markdown behandelt', () => {
    const r = parseImport('Paket:\n' + JSON.stringify(good));
    expect(r.results[0].ok).toBe(true);
  });
  it('ausgepackt aus {"pack": {...}}', () => {
    const r = parseImport(JSON.stringify({ pack: good }));
    expect(r.results[0].ok).toBe(true);
  });
  it('nennt Zeile bei Syntaxfehler', () => {
    const r = parseImport('{\n "topic": "x",\n "title": "y"\n "quiz": []\n}');
    expect(r.fatal).toMatch(/Zeile \d/);
  });
});
