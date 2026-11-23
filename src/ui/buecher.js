import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import { esc } from '../lib/util.js';
import { bar, pageHead } from './components.js';
import { ACT } from './nav.js';
import { modal, toast } from './fx.js';

export default {
  route: 'buecher',
  live: true,
  render() {
    const books = store.getBooks();
    return `${pageHead('Bücher', 'Titel, Fortschritt, Notizen und Lieblingszitate.', '#/lernen')}
    ${books.length ? books.map((b) => `<div class="card"><div class="row sp"><b>${esc(b.title)}</b>${b.finished ? '<span class="chip" style="--c:#19c37d">Fertig</span>' : b.reading !== false ? '<span class="chip" style="--c:#f472b6">Lese ich</span>' : ''}</div>
      <small>${esc(b.author || '')}</small><div style="margin:8px 0">${bar(b.pages ? (b.page || 0) / b.pages : 0, '#f472b6')}</div><small>Seite ${b.page || 0}${b.pages ? ' von ' + b.pages : ''} · ${b.quotes.length} Zitate · ${b.notes.length} Notizen</small>
      <div class="btns"><button class="btn sm" data-act="b-open" data-id="${b.id}">Öffnen</button><button class="btn sm" data-act="b-cur" data-id="${b.id}">${b.reading !== false && !b.finished ? 'Pausieren' : 'Jetzt lesen'}</button></div></div>`).join('') : '<div class="empty">Noch kein Buch. Leg dein erstes an.</div>'}
    <div class="btns"><button class="btn primary" data-act="b-add">+ Buch hinzufügen</button></div>`;
  },
};

ACT['b-add'] = () => {
  modal(`<h2>Neues Buch</h2><label class="f">Titel</label><input type="text" id="bt"><label class="f">Autor</label><input type="text" id="ba"><label class="f">Seiten</label><input type="number" id="bp" inputmode="numeric">
    <div class="btns"><button class="btn" data-close>Abbrechen</button><button class="btn primary" id="ok">Hinzufügen</button></div>`, {
    onMount: (m, close) => (m.querySelector('#ok').onclick = () => {
      const title = m.querySelector('#bt').value.trim();
      if (!title) return;
      A.addBook({ title, author: m.querySelector('#ba').value, pages: m.querySelector('#bp').value });
      close();
    }),
  });
};
ACT['b-cur'] = (el) =>
  A.updateBook(el.dataset.id, (b) => {
    if (b.finished) {
      b.finished = false;
      b.reading = true;
    } else b.reading = b.reading === false;
  });
ACT['b-open'] = (el) => {
  const b = store.getBooks().find((x) => x.id === el.dataset.id);
  if (!b) return;
  modal(`<h2>${esc(b.title)}</h2><label class="f">Aktuelle Seite</label><div class="row"><input type="number" id="pg" value="${b.page || 0}" inputmode="numeric"><button class="btn" id="sv">Speichern</button></div>
    <h3 style="margin-top:16px">Lieblingszitate</h3>${b.quotes.map((q) => `<div class="term">„${esc(q.text)}“ <small>S. ${q.page || '?'}</small></div>`).join('') || '<small>Noch keine.</small>'}
    <div class="row" style="margin-top:8px"><input type="text" id="qt" placeholder="Zitat"><input type="number" id="qp" placeholder="Seite" style="width:90px"><button class="btn" id="qa">+</button></div>
    <h3 style="margin-top:16px">Notizen</h3>${b.notes.map((n) => `<div class="term">${esc(n.text)}</div>`).join('') || '<small>Noch keine.</small>'}
    <div class="row" style="margin-top:8px"><input type="text" id="nt" placeholder="Notiz"><button class="btn" id="na">+</button></div>`, {
    onMount: (m, close) => {
      m.querySelector('#sv').onclick = () => { A.updateBook(b.id, (x) => { x.page = Number(m.querySelector('#pg').value) || 0; if (x.pages && x.page >= x.pages) { x.finished = true; x.reading = false; } }); close(); toast('Gespeichert.', { kind: 'good' }); };
      m.querySelector('#qa').onclick = () => { const t = m.querySelector('#qt').value.trim(); if (!t) return; A.updateBook(b.id, (x) => x.quotes.push({ text: t, page: Number(m.querySelector('#qp').value) || 0 })); close(); };
      m.querySelector('#na').onclick = () => { const t = m.querySelector('#nt').value.trim(); if (!t) return; A.updateBook(b.id, (x) => x.notes.push({ text: t, ts: Date.now() })); close(); };
    },
  });
};
