import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import { parseImport, PACK_SPEC, MD_SPEC } from '../engine/importer.js';
import { esc, copyText } from '../lib/util.js';
import { pageHead } from './components.js';
import { ACT } from './nav.js';
import { toast } from './fx.js';
import { promptFor } from './lernen.js';

let last = null;

export default {
  route: 'import',
  live: false,
  render() {
    const imported = store.allPacks();
    const topics = A.getTopics();
    return `${pageHead('Inhalte importieren', 'Pakete von Claude als JSON oder Markdown einfügen.', '#/lernen')}
    <div class="card"><label class="f" style="margin-top:0">Paket einfügen</label><textarea id="imp" style="min-height:190px" placeholder='{"topic":"finanzen","title":"..."}  oder Markdown'></textarea>
      <div class="row" style="margin-top:8px"><input type="file" id="file" accept=".json,.md,.txt,text/markdown,application/json" style="flex:1"></div>
      <div class="btns"><button class="btn primary" data-act="i-check">Prüfen</button></div><div id="res"></div></div>
    <div class="card"><b>Auftrag an Claude kopieren</b><p class="muted" style="margin:6px 0">Für ein Thema. Der Auftrag enthält das Format und den Hinweis auf verlässliche Quellen.</p>
      <select id="ptopic">${topics.map((t) => `<option value="${esc(t.id)}">${t.emoji} ${esc(t.name)}</option>`).join('')}</select>
      <div class="btns"><button class="btn" data-act="i-prompt">📋 Auftrag kopieren</button></div></div>
    <div class="card"><b>Importierte Pakete (${imported.length})</b>${imported.map((p) => `<div class="list-item"><div class="grow"><b>${esc(p.title)}</b><br><small>${esc(p.topic)} · Level ${p.level || 1}</small></div><button class="btn sm danger" data-act="i-del" data-id="${esc(p.id)}">Löschen</button></div>`).join('') || '<div class="empty">Noch nichts importiert. Eingebaut sind Platzhalter-Inhalte.</div>'}</div>
    <details class="card"><summary>Format: JSON</summary><pre class="code">${esc(PACK_SPEC)}</pre><button class="btn sm" data-act="i-copyspec" data-w="json">Format kopieren</button></details>
    <details class="card"><summary>Format: Markdown</summary><pre class="code">${esc(MD_SPEC)}</pre><p class="muted">Mehrere Pakete in einer Datei trennt eine Zeile mit <span class="kbd">---</span>. Szenarien und Fallrätsel gibt es nur im JSON-Format.</p><button class="btn sm" data-act="i-copyspec" data-w="md">Format kopieren</button></details>`;
  },
  mount(root) {
    const f = root.querySelector('#file');
    f.onchange = async () => {
      const file = f.files[0];
      if (!file) return;
      root.querySelector('#imp').value = await file.text();
      ACT['i-check'](root.querySelector('[data-act="i-check"]'));
    };
  },
};

ACT['i-check'] = (el) => {
  const root = document.getElementById('view');
  const text = root.querySelector('#imp').value;
  const r = parseImport(text);
  last = r;
  const out = root.querySelector('#res');
  if (r.fatal) return (out.innerHTML = `<p class="err">${esc(r.fatal)}</p>`);
  out.innerHTML = r.results.map((x, i) => `<div class="card tight" style="margin-top:10px"><b>${x.ok ? '✅' : '❌'} ${esc(x.pack?.title || 'Paket ' + (i + 1))}</b>
    ${x.pack ? `<br><small>Thema: ${esc(x.pack.topic)} · ${x.pack.explain.length} Abschnitte · ${x.pack.flashcards.length} Karten · ${x.pack.quiz.length} Quizfragen · ${x.pack.questions.length} offene Fragen${x.pack.teachBack ? ' · Erklär-es' : ''}${x.pack.scenarios.length ? ' · ' + x.pack.scenarios.length + ' Szenarien' : ''}${x.pack.cases.length ? ' · ' + x.pack.cases.length + ' Fälle' : ''}</small>` : ''}
    ${x.errors.map((e) => `<div class="err">${esc(e)}</div>`).join('')}${x.warnings.map((e) => `<div class="warn">${esc(e)}</div>`).join('')}</div>`).join('') +
    (r.results.some((x) => x.ok) ? `<div class="btns"><button class="btn primary" data-act="i-do">${r.results.filter((x) => x.ok).length} Paket(e) importieren</button></div>` : '');
};
ACT['i-do'] = () => {
  if (!last) return;
  const topicIds = A.getTopics().map((t) => t.id);
  let n = 0;
  const unknown = new Set();
  for (const x of last.results) {
    if (!x.ok) continue;
    store.set('pack:' + x.pack.id, x.pack);
    if (!topicIds.includes(x.pack.topic)) unknown.add(x.pack.topic);
    n++;
  }
  // unbekannte Themen automatisch anlegen
  if (unknown.size) {
    const list = store.getCustomTopics();
    unknown.forEach((id) => list.push({ id, name: id.replace(/-/g, ' '), emoji: '⭐', color: '#ff9a1f', hint: 'Automatisch angelegt', custom: true }));
    store.set('topics', list);
  }
  last = null;
  toast(`${n} Paket(e) importiert.${unknown.size ? ' Neue Themen angelegt: ' + [...unknown].join(', ') : ''}`, { kind: 'good' });
  location.hash = '#/lernen';
};
ACT['i-del'] = (el) => {
  store.remove('pack:' + el.dataset.id);
  toast('Paket gelöscht.');
  location.hash = '#/import';
  document.dispatchEvent(new Event('app-refresh'));
};
ACT['i-prompt'] = async () => {
  const id = document.getElementById('ptopic').value;
  const ok = await copyText(promptFor(id));
  toast(ok ? 'Auftrag kopiert.' : 'Kopieren hat nicht geklappt.', { kind: ok ? 'good' : 'warn' });
};
ACT['i-copyspec'] = async (el) => {
  const ok = await copyText(el.dataset.w === 'md' ? MD_SPEC : PACK_SPEC);
  toast(ok ? 'Format kopiert.' : 'Kopieren hat nicht geklappt.', { kind: ok ? 'good' : 'warn' });
};
