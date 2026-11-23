import * as A from '../core/actions.js';
import * as store from '../core/store.js';
import { mascot } from './mascot.js';
import { modal } from './fx.js';

export function showOnboarding(done) {
  const S = store.getSettings();
  modal(`<div class="big-msg">${mascot('fire', 100, 'jump')}<h1>Disziplin</h1><p style="margin-top:6px"><b>Disziplin schlägt Motivation.</b></p>
    <p class="muted" style="margin-top:8px">${S.name}, diese App führt dich durch den Tag und sagt dir jederzeit, was als Nächstes dran ist. Heute testest du sie.</p></div>
    <div class="btns"><button class="btn primary big" id="ob-demo">Mit Testdaten starten</button></div>
    <div class="btns"><button class="btn big" id="ob-fresh">Sauber starten</button></div>
    <p class="muted" style="font-size:12px;margin-top:8px">Testdaten: 14 Tage Verlauf mit einem verpassten und einem entschuldigten Tag, zwei Bücher. Jederzeit unter Mehr wieder löschbar.</p>`,
    {
      dismissable: false,
      onMount: (m, close) => {
        m.querySelector('#ob-demo').onclick = () => { A.loadDemoData(); close(); done(); };
        m.querySelector('#ob-fresh').onclick = () => { A.startFresh(); close(); done(); };
      },
    });
}
