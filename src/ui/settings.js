import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as sync from '../core/sync.js';
import * as N from '../core/notify.js';
import { MECHANICS } from '../core/defaults.js';
import { setSoundEnabled } from '../lib/sound.js';
import { getOffset, isSimulated, setSimulated, resetClock, todayStr, nowDate } from '../lib/clock.js';
import { weekType, WD_LONG, fmt, isoWeek } from '../lib/dates.js';
import { esc } from '../lib/util.js';
import { pageHead } from './components.js';
import { ACT, refresh } from './nav.js';
import { toast, modal } from './fx.js';
import { authHtml } from './auth.js';

const sw = (path, on) => `<label class="sw"><input type="checkbox" data-chg="s-set" data-path="${path}" ${on ? 'checked' : ''}><span></span></label>`;
const inp = (path, v, type = 'text', extra = '') => `<input type="${type}" data-chg="s-set" data-path="${path}" value="${esc(v)}" ${extra}>`;
const row = (label, ctrl, hint = '') => `<div class="list-item"><div class="grow"><b>${label}</b>${hint ? `<br><small>${hint}</small>` : ''}</div><div style="width:${ctrl.includes('type="checkbox"') ? 'auto' : '130px'}">${ctrl}</div></div>`;

export default {
  route: 'settings',
  live: false,
  render() {
    const S = store.getSettings();
    const meta = store.getMeta();
    const today = todayStr();
    const wt = weekType(today, S.weekFlip);
    const st = sync.syncStatus();
    const perm = N.permission();
    const nowD = nowDate();
    return `${pageHead('Mehr', 'Einstellungen und Admin')}
    <div class="card"><h2>Ton und Name</h2>
      ${row('Name', inp('name', S.name))}
      ${row('Harter Ton', sw('hardTone', S.hardTone), 'Zweite, härtere Erinnerung und "Du Versager" bei einem verpassten Tag. Mit Vornamen.')}
      ${row('Töne', sw('sound', S.sound), 'Kleine Töne beim Abhaken')}</div>
    <div class="card"><h2>Zeiten</h2>
      ${row('Aufstehen Mo–Fr', inp('wake.wk', S.wake.wk, 'time'))}${row('Aufstehen Wochenende', inp('wake.we', S.wake.we, 'time'))}
      ${row('Abendcheck Mo–Fr', inp('evening.wk', S.evening.wk, 'time'))}${row('Abendcheck Wochenende', inp('evening.we', S.evening.we, 'time'))}
      ${row('Freizeitlimit (Min/Tag)', inp('freeLimit', S.freeLimit, 'number', 'min="0" max="480" inputmode="numeric"'))}
      ${row('Wasserziel (ml)', inp('waterGoal', S.waterGoal, 'number', 'min="500" step="250" inputmode="numeric"'))}
      ${row('Lernziel Mo–Fr (Min)', inp('learnTarget.wk', S.learnTarget.wk, 'number', 'min="10" inputmode="numeric"'))}${row('Lernziel Wochenende (Min)', inp('learnTarget.we', S.learnTarget.we, 'number', 'min="10" inputmode="numeric"'))}
      ${row('Lesezeit (Min)', inp('readMinutes', S.readMinutes, 'number', 'min="5" inputmode="numeric"'))}
      ${row('Projekt (optional)', inp('project', S.project), 'Eigener Block, z. B. Euro Wellness')}
      ${row('Selbstverteidigung immer 30 Min', sw('sdFull', S.sdFull), 'Sonst 15 Min an Sporttagen (das ist aktuell jeder Tag)')}</div>
    <div class="card"><h2>Wochentyp A/B</h2><p>Diese Woche: <b>Woche ${wt}</b> (KW ${isoWeek(today).week}). Automatisch fortlaufend: KW 47 = A, KW 48 = B, danach abwechselnd.</p>
      <div class="btns"><button class="btn" data-act="s-wt" data-w="A">Diese Woche ist A</button><button class="btn" data-act="s-wt" data-w="B">Diese Woche ist B</button></div>
      <div class="btns"><a class="btn primary" href="#/stundenplan">🗓 Stundenplan bearbeiten</a></div></div>
    <div class="card"><h2>Sport pro Wochentag</h2>${WD_LONG.map((d, i) => {
      const sp = S.sport[i] || { type: 'none' };
      return `<div class="list-item"><div style="width:90px"><b>${d.slice(0, 2)}</b></div><select data-chg="s-set" data-path="sport.${i}.type" style="flex:1">${[['gym', 'Gym'], ['jog', 'Joggen'], ['handball', 'Handball (fest)'], ['none', 'Frei']].map(([v, l]) => `<option value="${v}" ${sp.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${sp.type === 'handball' ? `<input type="time" data-chg="s-set" data-path="sport.${i}.start" value="${sp.start || '18:00'}" style="width:96px"><input type="time" data-chg="s-set" data-path="sport.${i}.end" value="${sp.end || '20:00'}" style="width:96px">` : ''}</div>`;
    }).join('')}
      ${row('Gym-Dauer (Min)', inp('sportDur.gym', S.sportDur.gym, 'number', 'inputmode="numeric"'))}${row('Joggen-Dauer (Min)', inp('sportDur.jog', S.sportDur.jog, 'number', 'inputmode="numeric"'))}</div>
    <div class="card"><h2>Motivation: ausprobieren</h2><p class="muted" style="margin-bottom:6px">Schalte an und aus, was dir gefällt. Die App protokolliert, was du nutzt (Woche-Ansicht).</p>${MECHANICS.map((m) => row(m.name, sw('mechanics.' + m.id, S.mechanics[m.id]), m.desc)).join('')}</div>
    <div class="card"><h2>Lernen</h2>
      ${row('Thema mindestens (Tage)', inp('topicDays.min', S.topicDays.min, 'number', 'min="1" inputmode="numeric"'))}${row('Thema höchstens (Tage)', inp('topicDays.max', S.topicDays.max, 'number', 'min="2" inputmode="numeric"'))}
      ${row('Begründungen pro 7 Tage', inp('maxExcuses', S.maxExcuses, 'number', 'min="0" max="7" inputmode="numeric"'))}
      <div class="btns"><a class="btn" href="#/import">📥 Inhalte importieren</a><a class="btn" href="#/buecher">📚 Bücher</a></div></div>
    <div class="card"><h2>Fokus und Benachrichtigungen</h2>
      ${row('Kurzbefehl-Name (iPhone)', inp('focusShortcut', S.focusShortcut), 'Muss genau so in der Kurzbefehle-App heißen')}
      <p style="margin-top:8px">Status: <b>${perm === 'granted' ? 'erlaubt' : perm === 'denied' ? 'blockiert' : perm === 'unsupported' ? 'nicht unterstützt' : 'noch nicht gefragt'}</b>${N.isIOS() && !N.isStandalone() ? '<p class="warn">Auf dem iPhone gehen Benachrichtigungen nur, wenn die App zum Homescreen hinzugefügt und von dort geöffnet ist (iOS 16.4 oder neuer).</p>' : ''}</p>
      <div class="btns"><button class="btn" data-act="s-notif">🔔 Erlauben</button><button class="btn" data-act="s-test">Test-Erinnerung</button></div>
      <details style="margin-top:8px"><summary>Was geht auf iOS, was nicht?</summary><p class="muted" style="margin-top:6px">Mit der App geöffnet kommen alle Erinnerungen als Hinweis. Ist sie geschlossen, braucht es Server-Push (Supabase Edge Function, siehe README). Ohne den bekommst du keine Erinnerungen im Hintergrund. Eine echte App-Sperre geht erst mit einer nativen App.</p></details></div>
    <div class="card"><h2>Cloud-Sync</h2>
      <p>${sync.cloudConfigured ? (st.user ? `Angemeldet als <b>${esc(st.user)}</b>. Status: ${st.state}${st.error ? ' · ' + esc(st.error) : ''}` : 'Nicht angemeldet.') : '<b>Nicht eingerichtet.</b> Die App läuft nur lokal auf diesem Gerät. Siehe README, Abschnitt Supabase.'}</p>
      ${sync.cloudConfigured ? `<div class="btns">${st.user ? '<button class="btn" data-act="s-sync">Jetzt synchronisieren</button><button class="btn danger" data-act="s-logout">Abmelden</button>' : '<button class="btn primary" data-act="s-login">Anmelden</button>'}</div>` : ''}</div>
    <div class="card"><h2>Daten</h2><div class="btns"><button class="btn" data-act="s-export">⬇ Sicherung</button><button class="btn" data-act="s-import">⬆ Sicherung laden</button></div>
      <div class="btns"><button class="btn" data-act="s-demo">🧪 Testdaten laden</button><button class="btn danger" data-act="s-fresh">Sauber neu starten</button></div></div>
    <div class="card"><h2>🧰 Test-Werkzeuge</h2><p class="muted">Zum Durchspielen von Tagen. Die Uhr springt, die echten Daten bleiben.</p>
      <label class="f">Datum und Uhrzeit simulieren</label><div class="row"><input type="date" id="sim-d" value="${todayStr()}"><input type="time" id="sim-t" value="${String(nowD.getHours()).padStart(2, '0')}:${String(nowD.getMinutes()).padStart(2, '0')}"></div>
      <div class="btns"><button class="btn" data-act="s-sim">Setzen</button><button class="btn" data-act="s-simreset">Echte Zeit</button></div>
      <label class="f">Lernzeit-Beschleuniger</label><select data-chg="s-set" data-path="learnSpeed">${[1, 10, 60].map((v) => `<option value="${v}" ${S.learnSpeed === v ? 'selected' : ''}>×${v}${v === 60 ? ' (1 Sekunde = 1 Minute)' : ''}</option>`).join('')}</select>
      <small>Nur zum Testen der 5-Minuten-Regel. Auf ×1 lassen, wenn es ernst wird.</small></div>
    <p class="muted" style="text-align:center;margin-top:16px;font-size:12px">Disziplin v1.0 · Version ${esc(meta.startDate || '')}</p>`;
  },
};

export function onChange(el) {
  const path = el.dataset.path.split('.');
  let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
  if (el.tagName === 'SELECT' && !isNaN(Number(v)) && path[0] === 'learnSpeed') v = Number(v);
  store.updateSettings((s) => {
    let o = s;
    for (let i = 0; i < path.length - 1; i++) o = o[path[i]] = o[path[i]] ?? {};
    o[path[path.length - 1]] = v;
  });
  setSoundEnabled(store.getSettings().sound);
  if (el.tagName === 'SELECT' && path[0] === 'sport') document.dispatchEvent(new Event('app-refresh'));
}

ACT['s-wt'] = (el) => {
  const today = todayStr();
  const S = store.getSettings();
  const want = el.dataset.w;
  const cur = weekType(today, S.weekFlip);
  if (cur !== want) store.updateSettings((s) => (s.weekFlip = !s.weekFlip));
  toast(`Diese Woche ist jetzt Woche ${want}.`, { kind: 'good' });
  document.dispatchEvent(new Event('app-refresh'));
};
ACT['s-notif'] = async () => {
  const p = await N.requestPermission();
  toast(p === 'granted' ? 'Benachrichtigungen erlaubt.' : 'Nicht erlaubt: ' + p, { kind: p === 'granted' ? 'good' : 'warn' });
  document.dispatchEvent(new Event('app-refresh'));
};
ACT['s-test'] = async () => {
  toast('Schon getrunken? Test-Erinnerung.', { kind: 'info', actions: [{ label: '+250 ml', run: () => A.addWater(todayStr(), 250) }] });
  if (N.permission() === 'granted') {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('Nils.', { body: 'Test: So sehen Erinnerungen aus.', icon: './icons/icon-192.png' });
    } catch (e) {
      toast('Systemmeldung nicht möglich: ' + e.message, { kind: 'warn' });
    }
  }
};
ACT['s-sync'] = () => sync.syncNow().then(() => toast('Synchronisiert.', { kind: 'good' }));
ACT['s-logout'] = async () => {
  await sync.signOut();
  location.reload();
};
ACT['s-login'] = () => {
  document.getElementById('app').innerHTML = authHtml();
};
ACT['s-export'] = () => {
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `disziplin-sicherung-${todayStr()}.json`;
  a.click();
};
ACT['s-import'] = () => {
  const f = document.createElement('input');
  f.type = 'file';
  f.accept = 'application/json';
  f.onchange = async () => {
    try {
      store.importAll(JSON.parse(await f.files[0].text()));
      toast('Sicherung geladen.', { kind: 'good' });
    } catch (e) {
      toast(e.message, { kind: 'hard' });
    }
  };
  f.click();
};
ACT['s-demo'] = () => {
  if (!confirm('Testdaten laden? Alle bisherigen Daten werden ersetzt.')) return;
  A.loadDemoData();
  toast('Testdaten geladen: 14 Tage Verlauf, zwei Bücher.', { kind: 'good' });
  location.hash = '#/heute';
};
ACT['s-fresh'] = () => {
  if (!confirm('Wirklich alles löschen und sauber neu starten? (Einstellungen und Stundenplan bleiben)')) return;
  A.startFresh();
  location.hash = '#/heute';
};
ACT['s-sim'] = () => {
  const d = document.getElementById('sim-d').value;
  const t = document.getElementById('sim-t').value;
  if (!d || !t) return;
  setSimulated(d, t);
  location.hash = '#/heute';
  location.reload();
};
ACT['s-simreset'] = () => {
  resetClock();
  location.reload();
};
