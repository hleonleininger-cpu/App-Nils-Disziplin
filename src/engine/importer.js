// Import von Inhaltspaketen (JSON oder Markdown) mit Validierung.
import { slug } from '../lib/util.js';

export const PACK_FORMAT = 'disziplin-pack/1';

export const PACK_SPEC = `{
  "format": "disziplin-pack/1",
  "topic": "finanzen",                // ID des Themas: finanzen, investieren, programmieren, gespraech, mentalist, sherlock, buecher, schule, selbstverteidigung, gentleman, rhetorik, selbstorganisation, kleidung (oder eigenes)
  "title": "Titel der Lektion",
  "level": 1,                          // 1 = Einstieg, 2 = tiefer, 3 = Vertiefung
  "summary": "2-3 Sätze: worum geht es",
  "sources": [                         // PFLICHT. Ohne Quellen lehnt die App das Paket ab.
    { "title": "BGB § 488 (Darlehensvertrag)", "url": "https://www.gesetze-im-internet.de/bgb/__488.html" },
    { "title": "Autor, Titel, Ausgabe, Jahr" }
  ],
  "uncertain": ["Aussage, die sich nicht sicher belegen lässt"],   // unbelegbare Aussagen, die App zeigt sie sichtbar als unsicher
  "explain": [{ "heading": "Überschrift", "text": "Erklärung in kurzen Absätzen", "refs": ["BGB § 488"], "uncertain": false }],
  "terms": [{ "term": "Fachbegriff", "def": "Definition in einem Satz" }],
  "flashcards": [{ "q": "Frage", "a": "Antwort" }],
  "quiz": [{ "q": "Frage", "options": ["A", "B", "C", "D"], "answer": 1, "explain": "Warum" }],
  "questions": [{ "q": "Offene Frage", "keyPoints": ["Stichwort 1", "Stichwort 2"] }],
  "teachBack": { "prompt": "Erkläre einem Freund in 3 Minuten ...", "mustInclude": ["Fachbegriff 1", "Fachbegriff 2"], "followUps": ["Nachfrage 1", "Nachfrage 2"] },
  "practice": { "task": "Alltagsaufgabe für heute", "how": "So gehst du vor", "check": "Woran du merkst, dass es geklappt hat" },
  "scenarios": [{ "situation": "Was würdest du tun?", "options": [{ "text": "Option", "feedback": "Rückmeldung", "best": true }] }],
  "cases": [{ "type": "fall", "title": "Fallrätsel", "story": "Geschichte", "question": "Frage", "solution": "Lösung" }]
}
// Bei explain, terms, flashcards, quiz und questions kannst du "uncertain": true setzen, wenn die Aussage nicht belegbar ist.`;

export const MD_SPEC = `# Titel der Lektion
topic: finanzen
level: 1

## Zusammenfassung
Ein bis drei Sätze.

## Erklärung
### Überschrift 1
Text zu Überschrift 1.
### Überschrift 2
Text zu Überschrift 2.

## Fachbegriffe
- Begriff: Definition

## Karteikarten
- Frage? => Antwort

## Quiz
### Frage?
- [ ] falsche Antwort
- [x] richtige Antwort
- [ ] falsche Antwort
Erklärung: Warum die Antwort stimmt.

## Fragen
- Offene Frage? || Stichwort 1; Stichwort 2

## Erkläre es einem Freund
Aufgabe: Erkläre in 3 Minuten ...
Begriffe: Begriff 1; Begriff 2
Nachfragen: Frage 1; Frage 2

## Praxisaufgabe
Aufgabe: Alltagsaufgabe für heute
So geht's: So gehst du vor
Check: Woran du merkst, dass es geklappt hat

## Unsicher
- Aussage, die sich nicht sicher belegen lässt

## Quellen (PFLICHT)
- Titel, Autor, Ausgabe | https://...`;

// Texte werden unverändert übernommen (nur Leerraum am Rand entfällt). Zu lange Texte werden gemeldet, nicht gekürzt.
const MAX_LEN = 20000;
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const PLACEHOLDER_SRC = /^(platzhalter|quelle|quellen|source|n\.?\s?a\.?|unbekannt|keine|tbd|todo)\b/i;

/**
 * Prüft ein Paket. Der Inhalt wird unverändert übernommen. Fehlerhafte Teile werden gemeldet und führen zur
 * Ablehnung, sie werden nicht stillschweigend weggelassen oder gekürzt.
 * strict (Import): Quellen sind Pflicht, Platzhalter-Quellen zählen nicht, "placeholder" wird nicht übernommen.
 */
export function validatePack(raw, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['Kein Objekt.'], warnings, pack: null };
  const long = [];
  const S = (v, where) => {
    const t = str(v);
    if (t.length > MAX_LEN) long.push(where);
    return t;
  };
  const topic = slug(str(raw.topic));
  const title = S(raw.title, 'title');
  if (!topic) errors.push('Feld "topic" fehlt.');
  if (!title) errors.push('Feld "title" fehlt.');
  const flag = (x) => Boolean(x?.uncertain || x?.unsicher);
  const pack = {
    format: PACK_FORMAT,
    id: slug(str(raw.id)) || slug(`${topic}-${title}`),
    topic,
    title,
    level: Math.max(1, Math.min(5, Number(raw.level) || 1)),
    summary: S(raw.summary, 'summary'),
    sources: arr(raw.sources).map((x) => (typeof x === 'string' ? { title: S(x, 'sources') } : { title: S(x?.title, 'sources'), url: /^https?:\/\//.test(x?.url || '') ? str(x.url) : undefined })).filter((x) => x.title),
    uncertain: arr(raw.uncertain).map((x) => S(x, 'uncertain')).filter(Boolean),
    explain: arr(raw.explain).map((e, i) => ({ heading: S(e?.heading, `explain ${i + 1}`), text: S(e?.text, `explain ${i + 1}`), refs: arr(e?.refs).map((r) => str(r)).filter(Boolean), uncertain: flag(e) })).filter((e) => e.text),
    terms: arr(raw.terms).map((t) => ({ term: S(t?.term, 'terms'), def: S(t?.def, 'terms'), uncertain: flag(t) })).filter((t) => t.term && t.def),
    flashcards: arr(raw.flashcards).map((c) => ({ q: S(c?.q, 'flashcards'), a: S(c?.a, 'flashcards'), uncertain: flag(c) })).filter((c) => c.q && c.a),
    quiz: [],
    questions: arr(raw.questions).map((q) => ({ q: S(q?.q, 'questions'), keyPoints: arr(q?.keyPoints).map((k) => S(k, 'questions')).filter(Boolean), uncertain: flag(q) })).filter((q) => q.q),
    teachBack: null,
    practice: null,
    scenarios: [],
    cases: [],
    placeholder: strict ? false : Boolean(raw.placeholder),
  };
  arr(raw.quiz).forEach((q, i) => {
    const options = arr(q?.options).map((o) => S(o, 'quiz')).filter(Boolean);
    const answer = Number(q?.answer);
    if (!q?.q || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      errors.push(`Quiz-Frage ${i + 1} ist unvollständig (Frage, mindestens 2 Optionen und ein gültiger "answer"-Index von 0 bis ${Math.max(0, options.length - 1)} sind nötig).`);
      return;
    }
    pack.quiz.push({ q: S(q.q, 'quiz'), options, answer, explain: S(q.explain, 'quiz'), uncertain: flag(q) });
  });
  if (raw.teachBack && (raw.teachBack.prompt || typeof raw.teachBack === 'string')) {
    const t = typeof raw.teachBack === 'string' ? { prompt: raw.teachBack } : raw.teachBack;
    pack.teachBack = { prompt: S(t.prompt, 'teachBack'), mustInclude: arr(t.mustInclude).map((x) => str(x)).filter(Boolean), followUps: arr(t.followUps).map((x) => S(x, 'teachBack')).filter(Boolean) };
  }
  if (raw.practice && (raw.practice.task || typeof raw.practice === 'string')) {
    const pr = typeof raw.practice === 'string' ? { task: raw.practice } : raw.practice;
    pack.practice = { task: S(pr.task, 'practice'), how: S(pr.how, 'practice'), check: S(pr.check, 'practice') };
  }
  arr(raw.scenarios).forEach((sc, i) => {
    const options = arr(sc?.options).map((o) => ({ text: S(o?.text, 'scenarios'), feedback: S(o?.feedback, 'scenarios'), best: Boolean(o?.best) })).filter((o) => o.text);
    if (!sc?.situation || options.length < 2) return errors.push(`Szenario ${i + 1} ist unvollständig (situation und mindestens 2 Optionen nötig).`);
    if (!options.some((o) => o.best)) warnings.push(`Szenario ${i + 1} hat keine "best"-Option.`);
    pack.scenarios.push({ situation: S(sc.situation, 'scenarios'), options });
  });
  arr(raw.cases).forEach((c, i) => {
    if (!c?.story || !c?.solution) return errors.push(`Fall ${i + 1} ist unvollständig (story und solution nötig).`);
    pack.cases.push({ type: c.type === 'detektiv' ? 'detektiv' : 'fall', title: S(c.title, 'cases') || `Fall ${i + 1}`, story: S(c.story, 'cases'), question: S(c.question, 'cases') || 'Was schließt du daraus?', solution: S(c.solution, 'cases') });
  });
  if (long.length) errors.push(`Zu langer Text in: ${[...new Set(long)].join(', ')} (mehr als ${MAX_LEN} Zeichen). Das Paket wird nicht gekürzt, bitte teilen.`);
  const content = pack.explain.length + pack.flashcards.length + pack.quiz.length + pack.questions.length + pack.scenarios.length + pack.cases.length + (pack.teachBack ? 1 : 0) + (pack.practice ? 1 : 0);
  if (!content) errors.push('Das Paket enthält keine Inhalte (explain, flashcards, quiz, questions, teachBack, practice, scenarios oder cases).');
  // Quellen sind Pflicht
  const realSources = pack.sources.filter((x) => !PLACEHOLDER_SRC.test(x.title));
  if (strict) {
    if (!pack.sources.length) errors.push('Keine Quellen: Das Feld "sources" fehlt oder ist leer. Ein Paket ohne Quellen wird abgelehnt. Trage Gesetze (mit Paragraph), Fachbücher (Autor, Ausgabe) oder offizielle Seiten (z. B. Bundesbank, EZB, Bundesregierung) ein.');
    else if (!realSources.length) errors.push('Keine echten Quellen: Es steht nur ein Platzhalter im Feld "sources". Trage Gesetze (mit Paragraph), Fachbücher (Autor, Ausgabe) oder offizielle Seiten ein.');
  } else if (!pack.sources.length) errors.push('Keine Quellen im Paket.');
  if (pack.explain.some((e) => !e.refs.length) && pack.explain.length) warnings.push(`${pack.explain.filter((e) => !e.refs.length).length} Erklärabschnitt(e) ohne "refs" (Bezug zu einer Quelle). Jede Aussage soll einer Quelle zugeordnet sein.`);
  if (pack.quiz.length < 2 && pack.flashcards.length < 3) warnings.push('Wenig Übungsmaterial: lieber mindestens 3 Quiz-Fragen oder 4 Karteikarten.');
  return { ok: errors.length === 0, errors, warnings, pack };
}

const splitList = (s) => s.split(/[;；]/).map((x) => x.trim()).filter(Boolean);

export function parseMarkdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const raw = { explain: [], terms: [], flashcards: [], quiz: [], questions: [], sources: [], uncertain: [] };
  let section = '';
  let cur = null; // aktueller Unterpunkt (explain-Abschnitt oder Quiz-Frage)
  let teach = null;
  let practice = null;
  const summary = [];
  const flushCur = () => {
    if (cur && section === 'explain') raw.explain.push({ heading: cur.heading, text: cur.lines.join('\n').trim() });
    if (cur && section === 'quiz' && cur.q) raw.quiz.push({ q: cur.q, options: cur.options, answer: cur.answer, explain: cur.explain });
    cur = null;
  };
  for (const line0 of lines) {
    const line = line0.trimEnd();
    let m;
    if ((m = line.match(/^#\s+(.+)/)) && !line.startsWith('##')) {
      raw.title = m[1].trim();
      continue;
    }
    if ((m = line.match(/^##\s+(.+)/)) && !line.startsWith('###')) {
      flushCur();
      const h = m[1].trim().toLowerCase();
      if (/zusammenfassung/.test(h)) section = 'summary';
      else if (/erkl(ä|ae)rung/.test(h) && !/freund/.test(h)) section = 'explain';
      else if (/fachbegriff|begriffe/.test(h)) section = 'terms';
      else if (/karteikarte/.test(h)) section = 'cards';
      else if (/quiz/.test(h)) section = 'quiz';
      else if (/fragen/.test(h)) section = 'questions';
      else if (/freund|teach/.test(h)) {
        section = 'teach';
        teach = teach || {};
      } else if (/praxis/.test(h)) {
        section = 'practice';
        practice = practice || {};
      } else if (/unsicher/.test(h)) section = 'uncertain';
      else if (/quelle/.test(h)) section = 'sources';
      else section = '';
      continue;
    }
    if (!section) {
      if ((m = line.match(/^topic:\s*(.+)/i))) raw.topic = m[1].trim();
      else if ((m = line.match(/^level:\s*(\d+)/i))) raw.level = Number(m[1]);
      else if ((m = line.match(/^id:\s*(.+)/i))) raw.id = m[1].trim();
      continue;
    }
    if (section === 'summary') {
      if (line) summary.push(line);
    } else if (section === 'explain') {
      if ((m = line.match(/^###\s+(.+)/))) {
        flushCur();
        cur = { heading: m[1].trim(), lines: [] };
      } else if (line) {
        if (!cur) cur = { heading: '', lines: [] };
        cur.lines.push(line);
      }
    } else if (section === 'terms') {
      if ((m = line.match(/^[-*]\s+(.+?)\s*:\s+(.+)/))) raw.terms.push({ term: m[1], def: m[2] });
    } else if (section === 'cards') {
      if ((m = line.match(/^[-*]\s+(.+?)\s*(?:=>|→|\|\|)\s*(.+)/))) raw.flashcards.push({ q: m[1], a: m[2] });
    } else if (section === 'quiz') {
      if ((m = line.match(/^###\s+(.+)/))) {
        flushCur();
        cur = { q: m[1].trim(), options: [], answer: -1, explain: '' };
      } else if (cur && (m = line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)/))) {
        if (m[1].toLowerCase() === 'x') cur.answer = cur.options.length;
        cur.options.push(m[2].trim());
      } else if (cur && (m = line.match(/^(?:Erkl(?:ä|ae)rung|Warum):\s*(.+)/i))) cur.explain = m[1].trim();
    } else if (section === 'questions') {
      if ((m = line.match(/^[-*]\s+(.+?)\s*\|\|\s*(.+)/))) raw.questions.push({ q: m[1], keyPoints: splitList(m[2]) });
      else if ((m = line.match(/^[-*]\s+(.+)/))) raw.questions.push({ q: m[1], keyPoints: [] });
    } else if (section === 'teach') {
      if ((m = line.match(/^(?:Aufgabe|Prompt):\s*(.+)/i))) teach.prompt = m[1].trim();
      else if ((m = line.match(/^Begriffe:\s*(.+)/i))) teach.mustInclude = splitList(m[1]);
      else if ((m = line.match(/^Nachfragen:\s*(.+)/i))) teach.followUps = splitList(m[1]);
    } else if (section === 'practice') {
      if ((m = line.match(/^Aufgabe:\s*(.+)/i))) practice.task = m[1].trim();
      else if ((m = line.match(/^So geht'?s:\s*(.+)/i))) practice.how = m[1].trim();
      else if ((m = line.match(/^Check:\s*(.+)/i))) practice.check = m[1].trim();
    } else if (section === 'uncertain') {
      if ((m = line.match(/^[-*]\s+(.+)/))) raw.uncertain.push(m[1].trim());
    } else if (section === 'sources') {
      if ((m = line.match(/^[-*]\s+(.+?)\s*\|\s*(https?:\/\/\S+)/))) raw.sources.push({ title: m[1], url: m[2] });
      else if ((m = line.match(/^[-*]\s+(.+)/))) raw.sources.push({ title: m[1] });
    }
  }
  flushCur();
  raw.summary = summary.join(' ');
  if (teach && teach.prompt) raw.teachBack = teach;
  if (practice && practice.task) raw.practice = practice;
  return raw;
}

/** Entfernt Code-Zäune und Text drumherum, damit auch "```json ... ```" oder eine Antwort mit Einleitung funktioniert. */
export function extractJsonText(text) {
  let x = String(text || '').replace(/^\uFEFF/, '').trim();
  const fence = x.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) x = fence[1].trim();
  if (!/^[\[{]/.test(x) && !/^#\s/m.test(x) && !/^\s*"[\w-]+"\s*:/.test(x)) {
    const i = x.search(/[\[{]/);
    if (i >= 0) x = x.slice(i);
  }
  return x;
}

/** Erklärt einen JSON-Fehler verständlich: Zeile, Spalte und fehlende Klammern. */
export function describeJsonError(src, err) {
  let line = null;
  let col = null;
  const m1 = String(err.message).match(/line (\d+) column (\d+)/);
  const m2 = String(err.message).match(/position (\d+)/);
  if (m1) {
    line = Number(m1[1]);
    col = Number(m1[2]);
  } else if (m2) {
    const before = src.slice(0, Number(m2[1]));
    line = before.split('\n').length;
    col = before.length - before.lastIndexOf('\n');
  }
  // Klammern außerhalb von Zeichenketten zählen
  let depthCurly = 0;
  let depthSquare = 0;
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depthCurly++;
    else if (c === '}') depthCurly--;
    else if (c === '[') depthSquare++;
    else if (c === ']') depthSquare--;
  }
  const hints = [];
  if (depthCurly > 0) hints.push(`Es fehlen ${depthCurly} schließende geschweifte Klammer${depthCurly > 1 ? 'n' : ''} }`);
  if (depthCurly < 0) hints.push(`Es sind ${-depthCurly} schließende } zu viel`);
  if (depthSquare > 0) hints.push(`Es fehlen ${depthSquare} schließende eckige Klammer${depthSquare > 1 ? 'n' : ''} ]`);
  if (depthSquare < 0) hints.push(`Es sind ${-depthSquare} schließende ] zu viel`);
  if (inStr) hints.push('Ein Text in Anführungszeichen ist nicht geschlossen');
  return `JSON unvollständig oder fehlerhaft${line ? ` (Zeile ${line}, Spalte ${col})` : ''}. ${hints.length ? hints.join('. ') + '. ' : 'Prüfe Kommas und Anführungszeichen. '}Das Paket wurde nicht gelesen, deshalb gibt es keine Feldfehler.`;
}

/** Nimmt Text (JSON oder Markdown) und liefert eine Liste geprüfter Pakete. */
export function parseImport(text) {
  const t = extractJsonText(text);
  if (!t) return { results: [], fatal: 'Nichts eingefügt.' };
  // JSON ohne öffnende geschweifte Klammer ("topic": "x", ...) nicht als Markdown missverstehen
  if (/^\s*"[\w-]+"\s*:/.test(t) && !/^#\s/m.test(t)) {
    return { results: [], fatal: 'JSON unvollständig oder fehlerhaft: Am Anfang fehlt die öffnende geschweifte Klammer {' + (/\}\s*$/.test(t) ? ' (am Ende steht schon eine schließende).' : '.') + ' Das Paket wurde nicht gelesen, deshalb gibt es keine Feldfehler wie "topic fehlt".' };
  }
  let raws = [];
  if (t.startsWith('{') || t.startsWith('[')) {
    let j;
    try {
      j = JSON.parse(t);
    } catch (e) {
      return { results: [], fatal: describeJsonError(t, e) };
    }
    raws = Array.isArray(j) ? j : Array.isArray(j.packs) ? j.packs : [j];
    // Eingepackt in {"pack": {...}} o. Ä. auspacken
    raws = raws.map((r) => {
      if (r && typeof r === 'object' && !r.topic && !r.title) {
        const inner = Object.values(r).find((v) => v && typeof v === 'object' && !Array.isArray(v) && (v.topic || v.title));
        if (inner) return inner;
      }
      return r;
    });
  } else {
    // Mehrere Markdown-Pakete: durch eine Zeile "---" getrennt
    raws = t.split(/\n-{3,}\s*\n/).filter((x) => x.trim()).map(parseMarkdown);
  }
  return { results: raws.map((r) => validatePack(r, { strict: true })), fatal: null };
}
