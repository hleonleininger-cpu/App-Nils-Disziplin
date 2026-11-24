import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import { subjectName } from '../data/timetable.js';
import { todayStr } from '../lib/clock.js';
import { esc } from '../lib/util.js';
import { fmtDur } from '../lib/dates.js';
import { pageHead, bar } from './components.js';
import { icon } from './icons.js';
import { ACT, refresh } from './nav.js';
import { toast } from './fx.js';

let effort = 60;
let subject = '';

function subjects() {
  const TT = store.getTimetable();
  const set = new Set();
  for (const wt of ['A', 'B']) for (const day of TT[wt] || []) for (const c of day) if (c) set.add(subjectName(c));
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

export default {
  route: 'hausaufgaben',
  live: false,
  render() {
    const list = store.allHomework().sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const open = list.filter((h) => !h.done && h.remaining > 0);
    const done = list.filter((h) => h.done || h.remaining <= 0);
    const subs = subjects();
    subject = subject || subs[0] || '';
    return `${pageHead('Hausaufgaben', 'Eintragen, Aufwand wählen, die App plant die Zeit ein.', '#/heute')}
    <div class="card"><h2>Neue Hausaufgabe</h2>
      <label class="f">Fach</label><select id="hw-sub">${subs.map((s) => `<option ${s === subject ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <label class="f">Was ist zu tun?</label><input type="text" id="hw-title" placeholder="z. B. Aufgaben 3 bis 7, Seite 42">
      <label class="f">Fällig bis (optional)</label><input type="date" id="hw-due">
      <label class="f">Wie viel Aufwand?</label>
      <div class="pill-row">${[[30, '30 Min'], [60, '1 Std'], [120, '2 Std']].map(([m, l]) => `<span class="pill ${effort === m ? 'on' : ''}" data-act="hw-effort" data-m="${m}">${l}</span>`).join('')}</div>
      <div class="btns"><button class="btn primary big" data-act="hw-add">Eintragen und einplanen</button></div></div>
    <div class="sec-title"><h2>Offen (${open.length})</h2></div>
    ${open.map((h) => `<div class="card tight"><div class="row sp"><b>${esc(h.subject)}</b><small>${h.due ? 'fällig ' + h.due.slice(8, 10) + '.' + h.due.slice(5, 7) + '.' : 'ohne Frist'}</small></div>
      <div style="margin:4px 0">${esc(h.title)}</div><div style="margin:8px 0">${bar(1 - h.remaining / h.effort)}</div>
      <div class="row sp"><small>Noch ${fmtDur(h.remaining)} von ${fmtDur(h.effort)}</small><button class="btn sm danger" data-act="hw-del" data-id="${h.id}">Löschen</button></div></div>`).join('') || '<div class="empty">Nichts offen.</div>'}
    ${done.length ? `<div class="sec-title"><h2>Erledigt (${done.length})</h2></div>${done.slice(0, 5).map((h) => `<div class="list-item">${icon('check', 18)}<div class="grow">${esc(h.subject)}: ${esc(h.title)}</div></div>`).join('')}` : ''}`;
  },
};

ACT['hw-effort'] = (el) => {
  effort = Number(el.dataset.m);
  keepForm(() => refresh());
};
function keepForm(fn) {
  const t = document.getElementById('hw-title')?.value || '';
  const d = document.getElementById('hw-due')?.value || '';
  const s = document.getElementById('hw-sub')?.value || '';
  if (s) subject = s;
  fn();
  const tt = document.getElementById('hw-title');
  const dd = document.getElementById('hw-due');
  if (tt) tt.value = t;
  if (dd) dd.value = d;
}
ACT['hw-add'] = () => {
  const title = document.getElementById('hw-title').value.trim();
  if (!title) return toast('Schreib kurz auf, was zu tun ist.', { kind: 'warn' });
  A.addHomework({ subject: document.getElementById('hw-sub').value, title, due: document.getElementById('hw-due').value, effort });
  subject = document.getElementById('hw-sub').value;
  toast(`Eingeplant: ${effort >= 60 ? effort / 60 + ' Std' : effort + ' Min'}. Schau auf Heute.`, { kind: 'good' });
  refresh();
};
ACT['hw-del'] = (el) => {
  A.removeHomework(el.dataset.id);
  refresh();
};
