import { play } from '../lib/sound.js';
import { esc } from '../lib/util.js';
import { mascot } from './mascot.js';
import { on } from '../core/events.js';
import * as store from '../core/store.js';

export function confetti(x = window.innerWidth / 2, y = window.innerHeight / 2.5, n = 46) {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  const colors = ['#FF9A1F', '#FFD54A', '#FF3D5A', '#2FA8FF', '#19C37D', '#B15CFF', '#F472B6'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const a = Math.random() * Math.PI * 2;
    const d = 80 + Math.random() * 190;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d - 60 + 'px');
    s.style.setProperty('--r', Math.random() * 720 - 360 + 'deg');
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.08 + 's';
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1500);
}

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
export function celebrate({ points = 0, title = 'Geschafft', surprise = null, bonus = 0 } = {}) {
  const S = store.getSettings();
  play(surprise ? 'win' : 'ding');
  confetti();
  if (celebrateOpen) return;
  celebrateOpen = true;
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.innerHTML = `<div class="cbox">
    <div class="cm">${mascot('fire', 84, 'jump')}</div>
    <div class="ctitle">${esc(title)}</div>
    ${S.mechanics.points && points ? `<div class="cpoints">+${points} Punkte${bonus ? ` <small>(davon ${bonus} Tagesziel-Bonus)</small>` : ''}</div>` : ''}
    ${surprise ? `<div class="csurprise">🎁 ${esc(surprise.text)}</div>` : ''}
    <div class="ctap">Tippen zum Weitermachen</div></div>`;
  const close = () => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      celebrateOpen = false;
    }, 180);
  };
  el.addEventListener('click', close);
  document.body.appendChild(el);
  setTimeout(close, surprise ? 4200 : 2000);
}

export function initFx() {
  on('celebrate', celebrate);
  on('streak', (e) => toast(`🔥 Streak gesichert: ${e.streak} ${e.streak === 1 ? 'Tag' : 'Tage'}`, { kind: 'good' }));
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
