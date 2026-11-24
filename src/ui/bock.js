import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import { todayStr } from '../lib/clock.js';
import { esc } from '../lib/util.js';
import { ACT, go } from './nav.js';
import { icon } from './icons.js';
import { toast } from './fx.js';

const opt = (n, ic, title, sub, act, kind, color, dim = false) => `<button class="hero" style="--c:${color};width:100%;text-align:left;color:var(--text);cursor:pointer;${dim ? 'opacity:.55' : ''}" data-act="${act}" data-kind="${kind}">
  <div class="lab">${icon(ic, 15)} Option ${n}</div><h2 style="font-size:26px">${title}</h2><div class="sub">${sub}</div></button>`;

export default {
  route: 'bock',
  live: false,
  render() {
    const today = todayStr();
    const S = store.getSettings();
    const plan = A.planFor(today);
    const topic = A.topicFor(today);
    const book = A.currentBook();
    const f = plan.free;
    return `<div style="margin:10px 2px 0"><div class="cap">Nach der Schule</div><h1 style="margin-top:6px;font-size:30px">${esc(S.name)}, was jetzt?</h1><p class="muted" style="margin-top:6px">Du wählst. Der Rest des Tages passt sich an.</p></div>
    ${opt(1, topic?.icon || 'book', 'Lernen', esc(topic?.name || 'Lernthema') + (topic?.hint ? ' · ' + esc(topic.hint) : ''), 'b-pick', 'learn', topic?.color || '#ff6b2c')}
    ${opt(2, 'read', 'Lesen', esc(book ? book.title + (book.page ? ' · ab Seite ' + book.page : '') : 'Dein Buch, ein paar Seiten'), 'b-pick', 'read', '#d9779f')}
    ${opt(3, 'pause', 'Freizeit', f.takenMin ? `Schon ${f.takenMin} Min genommen. Weitere 15 Minuten nur, wenn danach alle Aufgaben noch reinpassen.` : '15 Minuten, aber nur, wenn danach alle Aufgaben noch in den Tag passen.', 'b-free', 'free', '#3cc4b0')}
    <div class="btns"><a class="btn ghost" href="#/heute">Zurück</a></div>`;
  },
};
ACT['b-pick'] = (el) => {
  A.chooseBock(todayStr(), el.dataset.kind);
  A.trackUsage('choice:' + el.dataset.kind);
  go('#/heute');
};
ACT['b-free'] = () => {
  const r = A.requestFree(todayStr());
  if (!r.ok) return toast(r.msg, { kind: 'hard', ms: 6500 });
  A.chooseBock(todayStr(), 'free');
  go('#/heute');
};
