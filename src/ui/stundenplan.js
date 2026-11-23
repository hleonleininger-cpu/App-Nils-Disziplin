import * as store from '../core/store.js';
import { DEFAULT_TIMETABLE, PERIODS } from '../data/timetable.js';
import { fmt, WD_SHORT, weekType } from '../lib/dates.js';
import { todayStr } from '../lib/clock.js';
import { esc, clone } from '../lib/util.js';
import { pageHead } from './components.js';
import { ACT, refresh } from './nav.js';
import { toast } from './fx.js';

let wt = null;

export default {
  route: 'stundenplan',
  live: false,
  render() {
    const S = store.getSettings();
    wt = wt || weekType(todayStr(), S.weekFlip);
    const TT = store.getTimetable();
    const pairs = [0, 1, 2, 3];
    return `${pageHead('Stundenplan', 'Pro Doppelstunde ein Eintrag, z. B. "Mathe M_L1". Leer = frei.', '#/settings')}
    <div class="pill-row"><span class="pill ${wt === 'A' ? 'on' : ''}" data-act="t-wt" data-w="A">Woche A</span><span class="pill ${wt === 'B' ? 'on' : ''}" data-act="t-wt" data-w="B">Woche B</span></div>
    <div class="card scroll-x"><table class="tt"><tr><th></th>${WD_SHORT.slice(0, 5).map((d) => `<th>${d}</th>`).join('')}</tr>
    ${pairs.map((p) => `<tr><td class="p">${p * 2 + 1}/${p * 2 + 2}<br>${fmt(PERIODS[p * 2][0])}</td>${[0, 1, 2, 3, 4].map((d) => `<td><input type="text" data-chg="t-cell" data-d="${d}" data-p="${p}" value="${esc(TT[wt]?.[d]?.[p] || '')}" placeholder="frei"></td>`).join('')}</tr>`).join('')}</table></div>
    <div class="btns"><button class="btn danger" data-act="t-reset">Auf Standard zurücksetzen</button></div>
    <p class="muted">Änderungen werden sofort gespeichert. Ausfälle trägst du unter Plan ein, nicht hier.</p>`;
  },
};
ACT['t-wt'] = (el) => {
  wt = el.dataset.w;
  refresh();
};
ACT['t-reset'] = () => {
  if (!confirm('Stundenplan wirklich auf den Standard zurücksetzen?')) return;
  store.set('timetable', clone(DEFAULT_TIMETABLE));
  toast('Zurückgesetzt.', { kind: 'good' });
  refresh();
};
export function onChange(el) {
  const TT = store.getTimetable();
  TT[wt] = TT[wt] || [[], [], [], [], []];
  TT[wt][Number(el.dataset.d)][Number(el.dataset.p)] = el.value.trim();
  store.set('timetable', TT, { silent: true });
}
