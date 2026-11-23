import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as sync from '../core/sync.js';
import * as N from '../core/notify.js';
import { todayStr, nowTs, isSimulated, nowMin } from '../lib/clock.js';
import { weekdayIdx, fmt, addDays, niceDate } from '../lib/dates.js';
import { DAY_COLORS } from '../data/texts.js';
import { setSoundEnabled } from '../lib/sound.js';
import { esc } from '../lib/util.js';
import { ACT, setRefresh } from './nav.js';
import { initFx, modal, toast } from './fx.js';
import { mascot } from './mascot.js';
import { authHtml } from './auth.js';
import { showOnboarding } from './onboarding.js';
import heute from './heute.js';
import bock from './bock.js';
import lernen from './lernen.js';
import session from './session.js';
import plan, { onChange as planChange } from './plan.js';
import abend from './abend.js';
import woche from './woche.js';
import settings, { onChange as settingsChange } from './settings.js';
import stundenplan, { onChange as ttChange } from './stundenplan.js';
import buecher from './buecher.js';
import importScreen from './import.js';

const SCREENS = Object.fromEntries([heute, bock, lernen, session, plan, abend, woche, settings, stundenplan, buecher, importScreen].map((s) => [s.route, s]));
const TABS = [
  ['heute', '🏠', 'Heute'],
  ['lernen', '📚', 'Lernen'],
  ['plan', '🗓️', 'Plan'],
  ['woche', '📊', 'Woche'],
  ['settings', '⚙️', 'Mehr'],
];
const TAB_OF = { bock: 'heute', session: 'lernen', abend: 'heute', stundenplan: 'settings', buecher: 'lernen', import: 'lernen' };
const CHANGE = { 'p-cancel': planChange, 's-set': settingsChange, 't-cell': ttChange };

let current = null;
let view = null;
let lastDate = null;

function routeName() {
  return (location.hash.replace(/^#\/?/, '').split('?')[0] || 'heute').toLowerCase();
}

function paintNav() {
  const r = routeName();
  const on = TAB_OF[r] || r;
  document.querySelector('.nav')?.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.r === on));
}

function render(keepScroll = false) {
  const y = window.scrollY;
  const r = routeName();
  const scr = SCREENS[r] || heute;
  const prevScreen = current;
  if (scr !== current || !keepScroll) current?.unmount?.();
  current = scr;
  view.classList.toggle('noanim', keepScroll && scr === prevScreen);
  view.innerHTML = scr.render();
  scr.mount?.(view);
  paintNav();
  window.scrollTo(0, keepScroll ? y : 0);
}

function shell() {
  const app = document.getElementById('app');
  app.innerHTML = `<div id="sim" class="sim" hidden></div>${installBanner()}<div id="view"></div>
  <nav class="nav">${TABS.map(([r, ic, l]) => `<a href="#/${r}" data-r="${r}"><span class="ic">${ic}</span>${l}</a>`).join('')}</nav>`;
  view = document.getElementById('view');
}

function installBanner() {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem('disziplin.installHint') === '1';
  } catch {}
  if (dismissed || !N.isIOS() || N.isStandalone()) return '';
  return `<div class="card tight" id="inst" style="border-color:var(--accent)"><b>Auf den Homescreen legen</b><p class="muted" style="margin-top:4px">In Safari unten auf Teilen tippen (Quadrat mit Pfeil), dann "Zum Home-Bildschirm". So läuft die App vollbildig und kann Hinweise schicken.</p><div class="btns"><button class="btn sm" data-act="inst-x">Verstanden</button></div></div>`;
}
ACT['inst-x'] = () => {
  try {
    localStorage.setItem('disziplin.installHint', '1');
  } catch {}
  document.getElementById('inst')?.remove();
};

// ---------- Hinweise (verpasster Tag, Wiedereinstieg) ----------
function showAlerts() {
  const al = A.pendingAlerts()[0];
  if (!al) return;
  const S = store.getSettings();
  const hard = S.hardTone;
  const name = S.name;
  if (al.type === 'missed') {
    const restore = Math.ceil(al.prev / 2);
    const when = al.date === addDays(todayStr(), -1) ? 'Gestern' : niceDate(al.date);
    modal(`<div class="alert-miss big-msg">${mascot('sad', 90)}<h2>${hard ? `${esc(name)}. ${when} ist komplett ausgefallen. Du Versager.` : `${esc(name)}, ${when} ist komplett ausgefallen.`}</h2>
      <p>${al.prev ? `Deine Kette von <b>${al.prev}</b> ${al.prev === 1 ? 'Tag' : 'Tagen'} ist gerissen.` : 'Die Kette ist weg.'}</p>
      <p class="muted" style="margin-top:8px">${hard ? 'Das war es. Aber das hier ist nicht das Ende:' : ''} Mach heute <b>drei Mini-Lektionen</b> ${al.prev ? `und du holst <b>${restore}</b> ${restore === 1 ? 'Tag' : 'Tage'} der Streak zurück.` : 'und du bist wieder drin.'}</p>
      <p style="margin-top:8px"><b>Nächster Schritt: Mini-Lektion 1 von 3. Jetzt.</b></p></div>
      <div class="btns"><a class="btn primary big" href="#/session?mini=1" data-close>⚡ Mini-Lektion starten</a></div>`, {
      dismissable: false,
      onMount: (m, close) => m.querySelector('a').addEventListener('click', () => A.markAlertSeen(al.id)),
    });
  } else if (al.type === 'restored') {
    modal(`<div class="big-msg">${mascot('fire', 90, 'jump')}<h2>Wieder drin.</h2><p>Drei Lektionen geschafft. Die Streak ist mit <b>${al.value}</b> ${al.value === 1 ? 'Tag' : 'Tagen'} zurück (vorher ${al.prev}).</p></div><div class="btns"><button class="btn primary big" data-close>Weiter</button></div>`, {
      onMount: (m) => m.querySelector('button').addEventListener('click', () => A.markAlertSeen(al.id)),
    });
  }
}

// ---------- Ticker ----------
function tick1s() {
  document.querySelectorAll('[data-since]').forEach((el) => {
    const el0 = Math.max(0, Math.floor((nowTs() - Number(el.dataset.since)) / 1000));
    const limit = Number(el.dataset.limit || 0);
    let s = el0;
    if (limit) {
      s = limit - el0;
      if (s <= 0) {
        el.textContent = 'Schluss!';
        el.style.color = '#ff8da1';
        if (!window.__freeWarned) {
          window.__freeWarned = true;
          toast('Freizeit aufgebraucht. Schluss, jetzt wird gearbeitet.', { kind: 'hard', ms: 8000 });
        }
        return;
      }
    }
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });
  const sim = document.getElementById('sim');
  if (sim) {
    sim.hidden = !isSimulated();
    if (isSimulated()) sim.textContent = `Test-Uhr ${fmt(nowMin())}`;
  }
}
function tick20s() {
  const t = todayStr();
  if (lastDate && lastDate !== t) {
    A.rollover();
    document.documentElement.style.setProperty('--day', DAY_COLORS[weekdayIdx(t)]);
    setTimeout(showAlerts, 400);
  }
  lastDate = t;
  N.tickReminders();
  if (current?.live) render(true);
}

export async function start() {
  initFx();
  setSoundEnabled(store.getSettings().sound);
  shell();
  document.documentElement.style.setProperty('--day', DAY_COLORS[weekdayIdx(todayStr())]);

  // Anmeldung
  if (sync.cloudConfigured) {
    await sync.initAuth().catch(() => {});
    let skip = false;
    try {
      skip = localStorage.getItem('disziplin.skipAuth') === '1';
    } catch {}
    if (!sync.isLoggedIn() && !skip) {
      document.getElementById('app').innerHTML = authHtml();
      bindGlobal();
      return;
    }
    if (sync.isLoggedIn()) {
      await Promise.race([sync.syncNow(), new Promise((r) => setTimeout(r, 3500))]);
    }
    sync.startAutoSync();
  }

  bindGlobal();
  setRefresh(() => render(true));
  A.rollover();
  lastDate = todayStr();
  render();
  if (!store.getMeta().onboarded) showOnboarding(() => { render(); });
  else showAlerts();

  store.onChange((key) => {
    if (key === 'settings') setSoundEnabled(store.getSettings().sound);
    if (current?.live) {
      clearTimeout(start._t);
      start._t = setTimeout(() => render(true), 40);
    }
  });
  window.addEventListener('hashchange', () => render());
  document.addEventListener('app-refresh', () => render(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick20s();
  });
  setInterval(tick1s, 1000);
  setInterval(tick20s, 20000);
  tick1s();
  setTimeout(() => N.tickReminders(), 1500);

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW', e));
  }
}

let bound = false;
function bindGlobal() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    N.ackAllOnInteraction();
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const f = ACT[el.dataset.act];
    if (f) {
      try {
        f(el, e);
      } catch (err) {
        console.error(err);
        toast('Fehler: ' + err.message, { kind: 'hard' });
      }
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-chg]');
    if (!el) return;
    CHANGE[el.dataset.chg]?.(el);
  });
}
