// Import von Inhaltspaketen (JSON oder Markdown) mit Validierung.
import { slug } from '../lib/util.js';

export const PACK_FORMAT = 'disziplin-pack/1';

export const PACK_SPEC = `{
  "format": "disziplin-pack/1",
  "topic": "finanzen",                // ID des Themas: finanzen, investieren, programmieren, gespraech, mentalist, sherlock, buecher, schule, selbstverteidigung (oder eigenes)
  "title": "Titel der Lektion",
  "level": 1,                          // 1 = Einstieg, 2 = tiefer, 3 = Vertiefung
  "summary": "2-3 Sätze: worum geht es",
  "sources": [{ "title": "Quelle", "url": "https://..." }],
  "explain": [{ "heading": "Überschrift", "text": "Erklärung in kurzen Absätzen" }],
  "terms": [{ "term": "Fachbegriff", "def": "Definition in einem Satz" }],
  "flashcards": [{ "q": "Frage", "a": "Antwort" }],
  "quiz": [{ "q": "Frage", "options": ["A", "B", "C", "D"], "answer": 1, "explain": "Warum" }],
  "questions": [{ "q": "Offene Frage", "keyPoints": ["Stichwort 1", "Stichwort 2"] }],
  "teachBack": { "prompt": "Erkläre einem Freund in 3 Minuten ...", "mustInclude": ["Fachbegriff 1", "Fachbegriff 2"], "followUps": ["Nachfrage 1", "Nachfrage 2"] },
  "scenarios": [{ "situation": "Was würdest du tun?", "options": [{ "text": "Option", "feedback": "Rückmeldung", "best": true }] }],
  "cases": [{ "type": "fall", "title": "Fallrätsel", "story": "Geschichte", "question": "Frage", "solution": "Lösung" }]
}`;

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

## Quellen
- Titel | https://...`;

const str = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : v == null ? '' : String(v).slice(0, max));
const arr = (v) => (Array.isArray(v) ? v : []);

/** Prüft und bereinigt ein Paket. */
export function validatePack(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Kein Objekt.'], warnings, pack: null };
  const topic = slug(str(raw.topic, 60));
  const title = str(raw.title, 120);
  if (!topic) errors.push('Feld "topic" fehlt.');
  if (!title) errors.push('Feld "title" fehlt.');
  const pack = {
    format: PACK_FORMAT,
    id: slug(str(raw.id, 80)) || slug(`${topic}-${title}`),
    topic,
    title,
    level: Math.max(1, Math.min(5, Number(raw.level) || 1)),
    summary: str(raw.summary, 1200),
    sources: arr(raw.sources).map((s) => (typeof s === 'string' ? { title: str(s, 200) } : { title: str(s?.title, 200), url: /^https?:\/\//.test(s?.url || '') ? str(s.url, 500) : undefined })).filter((s) => s.title),
    explain: arr(raw.explain).map((e) => ({ heading: str(e?.heading, 160), text: str(e?.text, 6000) })).filter((e) => e.text),
    terms: arr(raw.terms).map((t) => ({ term: str(t?.term, 120), def: str(t?.def, 600) })).filter((t) => t.term && t.def),
    flashcards: arr(raw.flashcards).map((c) => ({ q: str(c?.q, 500), a: str(c?.a, 1000) })).filter((c) => c.q && c.a),
    quiz: [],
    questions: arr(raw.questions).map((q) => ({ q: str(q?.q, 600), keyPoints: arr(q?.keyPoints).map((k) => str(k, 120)).filter(Boolean) })).filter((q) => q.q),
    teachBack: null,
    scenarios: [],
    cases: [],
    placeholder: Boolean(raw.placeholder),
  };
  arr(raw.quiz).forEach((q, i) => {
    const options = arr(q?.options).map((o) => str(o, 300)).filter(Boolean);
    const answer = Number(q?.answer);
    if (!q?.q || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      warnings.push(`Quiz-Frage ${i + 1} übersprungen (Frage, mindestens 2 Optionen und gültiger "answer"-Index nötig).`);
      return;
    }
    pack.quiz.push({ q: str(q.q, 600), options, answer, explain: str(q.explain, 800) });
  });
  if (raw.teachBack && (raw.teachBack.prompt || typeof raw.teachBack === 'string')) {
    const t = typeof raw.teachBack === 'string' ? { prompt: raw.teachBack } : raw.teachBack;
    pack.teachBack = { prompt: str(t.prompt, 800), mustInclude: arr(t.mustInclude).map((x) => str(x, 80)).filter(Boolean), followUps: arr(t.followUps).map((x) => str(x, 300)).filter(Boolean) };
  }
  arr(raw.scenarios).forEach((s, i) => {
    const options = arr(s?.options).map((o) => ({ text: str(o?.text, 400), feedback: str(o?.feedback, 600), best: Boolean(o?.best) })).filter((o) => o.text);
    if (!s?.situation || options.length < 2) return warnings.push(`Szenario ${i + 1} übersprungen.`);
    if (!options.some((o) => o.best)) warnings.push(`Szenario ${i + 1} hat keine "best"-Option.`);
    pack.scenarios.push({ situation: str(s.situation, 800), options });
  });
  arr(raw.cases).forEach((c, i) => {
    if (!c?.story || !c?.solution) return warnings.push(`Fall ${i + 1} übersprungen (story und solution nötig).`);
    pack.cases.push({ type: c.type === 'detektiv' ? 'detektiv' : 'fall', title: str(c.title, 160) || `Fall ${i + 1}`, story: str(c.story, 3000), question: str(c.question, 600) || 'Was schließt du daraus?', solution: str(c.solution, 3000) });
  });
  const content = pack.explain.length + pack.flashcards.length + pack.quiz.length + pack.questions.length + pack.scenarios.length + pack.cases.length + (pack.teachBack ? 1 : 0);
  if (!content) errors.push('Das Paket enthält keine Inhalte (explain, flashcards, quiz, questions, teachBack, scenarios oder cases).');
  if (!pack.sources.length) warnings.push('Keine Quellen angegeben. Für verlässliche Inhalte sollten Quellen dabei sein.');
  if (pack.quiz.length < 2 && pack.flashcards.length < 3) warnings.push('Wenig Übungsmaterial: lieber mindestens 3 Quiz-Fragen oder 4 Karteikarten.');
  return { ok: errors.length === 0, errors, warnings, pack };
}

const splitList = (s) => s.split(/[;；]/).map((x) => x.trim()).filter(Boolean);

export function parseMarkdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const raw = { explain: [], terms: [], flashcards: [], quiz: [], questions: [], sources: [] };
  let section = '';
  let cur = null; // aktueller Unterpunkt (explain-Abschnitt oder Quiz-Frage)
  let teach = null;
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
      } else if (/quelle/.test(h)) section = 'sources';
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
    } else if (section === 'sources') {
      if ((m = line.match(/^[-*]\s+(.+?)\s*\|\s*(https?:\/\/\S+)/))) raw.sources.push({ title: m[1], url: m[2] });
      else if ((m = line.match(/^[-*]\s+(.+)/))) raw.sources.push({ title: m[1] });
    }
  }
  flushCur();
  raw.summary = summary.join(' ');
  if (teach && teach.prompt) raw.teachBack = teach;
  return raw;
}

/** Nimmt Text (JSON oder Markdown) und liefert eine Liste geprüfter Pakete. */
export function parseImport(text) {
  const t = String(text || '').trim();
  if (!t) return { results: [], fatal: 'Nichts eingefügt.' };
  let raws = [];
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const j = JSON.parse(t);
      raws = Array.isArray(j) ? j : Array.isArray(j.packs) ? j.packs : [j];
    } catch (e) {
      return { results: [], fatal: 'JSON ist ungültig: ' + e.message };
    }
  } else {
    // Mehrere Markdown-Pakete: durch eine Zeile "---" getrennt
    raws = t.split(/\n-{3,}\s*\n/).filter((x) => x.trim()).map(parseMarkdown);
  }
  return { results: raws.map(validatePack), fatal: null };
}
