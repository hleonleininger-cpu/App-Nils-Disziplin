import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import { todayStr } from '../lib/clock.js';
import { esc } from '../lib/util.js';
import { ACT, go } from './nav.js';
import { mascot } from './mascot.js';
import { toast } from './fx.js';

export default {
  route: 'bock',
  live: false,
  render() {
    const today = todayStr();
    const S = store.getSettings();
    const plan = A.planFor(today);
    const topic = A.topicFor(today);
    const book = A.currentBook();
    const fr = plan.free.remaining;
    return `<div class="big-msg" style="margin-top:8px">${mascot('happy', 70)}<h2>${esc(S.name)}, worauf hast du Bock?</h2><p class="muted">Du wählst. Der Rest des Tages passt sich an.</p></div>
    <button class="hero" style="--c:${topic?.color || '#ff9a1f'};width:100%;text-align:left;color:#fff;cursor:pointer" data-act="b-pick" data-kind="learn" data-emoji="${topic?.emoji || '📚'}">
      <div class="lab">Option 1</div><h2>${topic?.emoji || '📚'} Lernen</h2><div class="sub">${esc(topic?.name || 'Lernthema')}${topic?.hint ? ' · ' + esc(topic.hint) : ''}</div></button>
    <button class="hero" style="--c:#f472b6;width:100%;text-align:left;color:#fff;cursor:pointer" data-act="b-pick" data-kind="read" data-emoji="📖">
      <div class="lab">Option 2</div><h2>📖 Lesen</h2><div class="sub">${esc(book ? book.title + ' · ab Seite ' + (book.page || 0) : 'Dein Buch, ein paar Seiten')}</div></button>
    <button class="hero ${fr <= 0 ? 'locked' : ''}" style="--c:${fr > 0 ? '#2dd4bf' : '#555770'};width:100%;text-align:left;color:#fff;cursor:${fr > 0 ? 'pointer' : 'not-allowed'};${fr <= 0 ? 'opacity:.6' : ''}" data-act="${fr > 0 ? 'b-pick' : 'b-locked'}" data-kind="free" data-emoji="🎮">
      <div class="lab">Option 3</div><h2>🎮 Freizeit</h2><div class="sub">${fr > 0 ? `Du hast noch ${fr} Minuten für heute (Limit ${plan.free.limit}).` : 'Aufgebraucht. Schluss, jetzt wird gearbeitet.'}</div></button>
    <div class="btns"><a class="btn ghost" href="#/heute">Zurück</a></div>`;
  },
};
ACT['b-pick'] = (el) => {
  A.chooseBock(todayStr(), el.dataset.kind);
  A.trackUsage('choice:' + el.dataset.kind);
  go('#/heute');
};
ACT['b-locked'] = () => {
  toast('Freizeit ist aufgebraucht. Jetzt wird gearbeitet.', { kind: 'hard' });
};
