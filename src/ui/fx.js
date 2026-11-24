import { play } from '../lib/sound.js';
import { esc } from '../lib/util.js';
import { icon } from './icons.js';
import { on } from '../core/events.js';
import * as store from '../core/store.js';

export function toast(msg, { kind = 'info', ms = 3200, actions = [] } = {}) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = `<div class="tmsg">${esc(msg)}</div>${actions.length ? `<div class="tacts">${actions.map((a, i) => `<button data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
  t.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) actions[Number(b.dataset.i)]?.run?.();
    t.remove();
  });
  host.appendChild(t);
  if (ms) setTimeout(() => t.remove(), ms);
  return t;
}

let celebrateOpen = false;
export function celebrate({ points = 0, title = 'Erledigt', surprise = null, bonus = 0 } = {}) {
  const S = store.getSettings();
  play(surprise ? 'win' : 'ding');
  if (celebrateOpen) return;
  celebrateOpen = true;
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.innerHTML = `<div class="cbox"><div class="tick">${icon('check', 30)}</div>
    <div class="ctitle">Erledigt.</div><div class="muted" style="margin-top:2px">${esc(title)}</div>
    ${S.mechanics.points && points ? `<div class="cpoints">+${points} <small>Punkte${bonus ? ` (davon ${bonus} Tagesziel-Bonus)` : ''}</small></div>` : ''}
    ${surprise ? `<div class="csurprise">${esc(surprise.text)}</div>` : ''}
    <div class="ctap">Tippen zum Weitermachen</div></div>`;
  const close = () => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      celebrateOpen = false;
    }, 160);
  };
  el.addEventListener('click', close);
  document.body.appendChild(el);
  setTimeout(close, surprise ? 4200 : 1800);
}

export function initFx() {
  on('celebrate', celebrate);
  on('streak', (e) => toast(`Streak gesichert: ${e.streak} ${e.streak === 1 ? 'Tag' : 'Tage'}`, { kind: 'good' }));
}

// ---------- Modals ----------
export function modal(html, { onMount, dismissable = true, cls = '' } = {}) {
  const el = document.createElement('div');
  el.className = 'modal-bg';
  el.innerHTML = `<div class="modal ${cls}" role="dialog">${html}</div>`;
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 160);
  };
  if (dismissable) el.addEventListener('click', (e) => e.target === el && close());
  el.addEventListener('click', (e) => e.target.closest('[data-close]') && close());
  document.body.appendChild(el);
  onMount?.(el.querySelector('.modal'), close);
  return { el, close };
}
