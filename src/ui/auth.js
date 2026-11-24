import * as sync from '../core/sync.js';
import { esc } from '../lib/util.js';
import { icon } from './icons.js';
import { ACT } from './nav.js';

export function authHtml(msg = '') {
  return `<div class="big-msg" style="margin-top:40px"><div class="big-ic">${icon('flame', 30)}</div><h1 style="margin-top:12px">Disziplin</h1><p class="muted">Melde dich an, damit alles auf iPhone, MacBook und PC gleich ist.</p></div>
  <div class="card"><label class="f" style="margin-top:0">E-Mail</label><input type="email" id="au-mail" autocomplete="email" inputmode="email">
  <label class="f">Passwort</label><input type="password" id="au-pw" autocomplete="current-password">
  <div class="btns"><button class="btn primary" data-act="au-in">Anmelden</button><button class="btn" data-act="au-up">Konto anlegen</button></div>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
  <hr><details><summary>Anmelden mit Code per E-Mail</summary><div class="btns"><button class="btn" data-act="au-code">Code senden</button></div><input type="text" id="au-tok" placeholder="6-stelliger Code" inputmode="numeric" style="margin-top:8px"><div class="btns"><button class="btn" data-act="au-verify">Code prüfen</button></div></details></div>
  <div class="btns"><button class="btn ghost" data-act="au-skip">Ohne Anmeldung weitermachen (nur dieses Gerät)</button></div>`;
}

const val = (id) => document.getElementById(id)?.value.trim();
async function wrap(fn) {
  try {
    await fn();
    location.reload();
  } catch (e) {
    document.getElementById('app').innerHTML = authHtml(e.message || String(e));
  }
}
ACT['au-in'] = () => wrap(() => sync.signIn(val('au-mail'), document.getElementById('au-pw').value));
ACT['au-up'] = () => wrap(async () => {
  const invite = new URLSearchParams(location.search).get('invite') || '';
  const r = await sync.signUp(val('au-mail'), document.getElementById('au-pw').value, invite);
  if (!r.session) throw new Error('Konto angelegt. Bestätige die E-Mail (Link im Postfach), dann melde dich an.');
});
ACT['au-code'] = async () => {
  try {
    await sync.sendCode(val('au-mail'));
    alert('Code ist unterwegs. Schau ins Postfach.');
  } catch (e) {
    alert(e.message);
  }
};
ACT['au-verify'] = () => wrap(() => sync.verifyCode(val('au-mail'), val('au-tok')));
ACT['au-skip'] = () => {
  try {
    localStorage.setItem('disziplin.skipAuth', '1');
  } catch {}
  location.reload();
};
