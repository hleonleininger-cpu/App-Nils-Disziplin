import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as L from '../engine/learning.js';
import { PACK_SPEC, MD_SPEC } from '../engine/importer.js';
import { PROMPT_TEMPLATE } from '../data/texts.js';
import { todayStr } from '../lib/clock.js';
import { addDays, niceDate } from '../lib/dates.js';
import { esc, copyText, slug } from '../lib/util.js';
import { bar, pageHead } from './components.js';
import { icon } from './icons.js';
import { ACT, go } from './nav.js';
import { modal, toast } from './fx.js';

export function promptFor(topicId) {
  const t = A.topicInfo(topicId);
  const existing = L.packsFor(topicId, A.getPacks());
  const level = existing.length ? Math.max(...existing.map((p) => p.level || 1)) + (existing.length >= 2 ? 1 : 0) : 1;
  const prog = L.progressOf(store.getLearn(), topicId);
  let extra = `\nThema-ID im Feld "topic": "${topicId}". Gewünschtes Niveau (level): ${level}.`;
  if (existing.length) extra += `\nBereits vorhandene Lektionen (nicht wiederholen, darauf aufbauen): ${existing.map((p) => p.title).join('; ')}.`;
  if (prog.gaps.length) extra += `\nNils hat noch Lücken bei einzelnen Fragen, wiederhole die Kernideen mit anderen Formulierungen.`;
  return PROMPT_TEMPLATE(t?.name || topicId, PACK_SPEC) + extra + '\nMindestens: 3 Erklärabschnitte (je mit refs), 5 Fachbegriffe, 6 Karteikarten, 5 Quizfragen, 2 offene Fragen, 1 teachBack, 1 practice, 1 Szenario oder Fall, Quellen mit Links.';
}

export default {
  route: 'lernen',
  live: true,
  render() {
    const today = todayStr();
    const topic = A.topicFor(today);
    const learn = store.getLearn();
    const packs = A.getPacks();
    const tomorrowId = A.topicIdFor(addDays(today, 1));
    const tomorrow = A.topicInfo(tomorrowId);
    const D = store.getDay(today);
    const p = L.progressOf(learn, topic.id);
    const fod = L.formatOfDay(today);
    return `${pageHead('Lernen', 'Eine Sache nach der anderen, bis sie sitzt.')}
    <div class="topic today" style="--c:${topic.color}"><span class="em">${icon(topic.icon || 'book', 26)}</span><div class="grow"><small>Heute · ${fod.name}</small><b style="font-size:18px">${esc(topic.name)}</b><div style="margin-top:6px">${bar(p.k / 100, topic.color)}</div><small>${L.STATUS_TEXT[L.statusOf(p)]} · Wissen ${p.k}% · ${Math.round((D.learnSec || 0) / 60)} Min heute</small></div></div>
    <div class="btns"><a class="btn primary" href="#/session">Lektion starten</a><a class="btn" href="#/session?mini=1">5-Min-Mini</a></div>
    <div class="card"><div class="row sp"><b>Morgen: ${tomorrow ? esc(tomorrow.name) : '?'}</b></div>
      <p class="muted" style="margin-top:6px">Lass Claude Code das Thema vorab recherchieren. Kopiere den Auftrag, schick ihn ab, importiere das Ergebnis.</p>
      <div class="btns"><button class="btn" data-act="l-copy" data-topic="${esc(tomorrowId)}">${icon('clip', 16)} Auftrag kopieren</button><a class="btn" href="#/import">${icon('download', 16)} Paket importieren</a></div></div>
    <div class="sec-title"><h2>Themen</h2><button class="link" data-act="l-add">+ Thema</button></div>
    ${A.getTopics().map((t) => {
      const pr = L.progressOf(learn, t.id);
      const n = L.packsFor(t.id, packs).length;
      return `<div class="topic ${t.id === topic.id ? 'today' : ''}" style="--c:${t.color};${pr.paused ? 'opacity:.55' : ''}"><span class="em">${icon(t.icon || 'star', 24)}</span><div class="grow"><b>${esc(t.name)}</b><div style="margin:6px 0">${bar(pr.k / 100, t.color)}</div><small>${L.STATUS_TEXT[L.statusOf(pr)]} · ${pr.k}% · ${n} Paket${n === 1 ? '' : 'e'}${pr.paused ? ' · pausiert' : ''}</small>${n && L.packsFor(t.id, packs).every((x) => x.placeholder) ? ' <span class="chip" style="--c:#f0524f">Platzhalter</span>' : ''}
        <div class="row" style="margin-top:8px;gap:8px"><button class="btn sm" data-act="l-now" data-id="${esc(t.id)}">Heute dieses</button><button class="btn sm" data-act="l-pause" data-id="${esc(t.id)}">${pr.paused ? 'Fortsetzen' : 'Pausieren'}</button><button class="btn sm" data-act="l-copy" data-topic="${esc(t.id)}" title="Auftrag kopieren">${icon('clip', 14)}</button></div></div></div>`;
    }).join('')}
    <div class="btns"><a class="btn" href="#/buecher">Bücher</a><a class="btn" href="#/hausaufgaben">Hausaufgaben</a><a class="btn" href="#/import">Importieren</a></div>`;
  },
};

ACT['l-copy'] = async (el) => {
  const ok = await copyText(promptFor(el.dataset.topic));
  toast(ok ? 'Auftrag kopiert. In Claude Code einfügen.' : 'Kopieren hat nicht geklappt.', { kind: ok ? 'good' : 'warn' });
};
ACT['l-now'] = (el) => {
  A.forceTopic(todayStr(), el.dataset.id);
  toast('Heute ist dieses Thema dran.', { kind: 'good' });
};
ACT['l-pause'] = (el) => {
  const paused = L.progressOf(store.getLearn(), el.dataset.id).paused;
  A.setTopicPaused(el.dataset.id, !paused);
};
ACT['l-add'] = () => {
  modal(`<h2>Neues Thema</h2><label class="f">Name</label><input type="text" id="tn" placeholder="z. B. Rhetorik"><label class="f">Farbe</label><input type="color" id="tc" value="#ff9a1f" style="height:46px"><label class="f">Kurzbeschreibung</label><input type="text" id="th">
    <div class="btns"><button class="btn" data-close>Abbrechen</button><button class="btn primary" id="ok">Anlegen</button></div>`, {
    onMount: (m, close) => (m.querySelector('#ok').onclick = () => {
      const name = m.querySelector('#tn').value.trim();
      if (!name) return;
      const list = store.getCustomTopics();
      list.push({ id: slug(name) || 'thema-' + list.length, name, icon: 'star', color: m.querySelector('#tc').value, hint: m.querySelector('#th').value, custom: true });
      store.set('topics', list);
      close();
      toast('Thema angelegt. Importiere jetzt ein Paket dafür.', { kind: 'good' });
    }),
  });
};
