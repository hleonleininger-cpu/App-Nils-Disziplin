// Läuft eine Liste von Aufgaben (Auswahl, Karteikarte, offene Frage) nacheinander ab.
import { esc } from '../lib/util.js';
import { matchKeyPoints } from '../engine/learning.js';
import { play } from '../lib/sound.js';
import { toast } from './fx.js';
import { icon } from './icons.js';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function attachMic(btn, ta) {
  if (!SR) {
    btn.onclick = () => toast('Spracheingabe geht in diesem Browser nicht. Tipp: Diktierfunktion der Tastatur (Mikrofon-Symbol) nutzen.', { kind: 'warn', ms: 5000 });
    return;
  }
  let rec = null;
  btn.onclick = () => {
    if (rec) {
      rec.stop();
      return;
    }
    rec = new SR();
    rec.lang = 'de-DE';
    rec.interimResults = true;
    rec.continuous = true;
    const base = ta.value ? ta.value + ' ' : '';
    rec.onresult = (e) => (ta.value = base + [...e.results].map((r) => r[0].transcript).join(' '));
    rec.onend = () => {
      rec = null;
      btn.classList.remove('rec');
      btn.innerHTML = `${icon('mic', 16)} Sprechen`;
    };
    rec.onerror = () => {
      rec = null;
      btn.classList.remove('rec');
      btn.innerHTML = `${icon('mic', 16)} Sprechen`;
    };
    btn.classList.add('rec');
    btn.innerHTML = `${icon('stop', 16)} Fertig gesprochen`;
    try {
      rec.start();
    } catch {
      rec = null;
    }
  };
}

const dots = (i, n, results) => `<div class="prog">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : k === i ? 'cur' : ''}"></i>`).join('')}</div>`;

export function runItems(el, items, { voice = false, onDone }) {
  let i = 0;
  const results = [];
  const next = (res) => {
    results.push(res);
    i++;
    show();
  };
  function show() {
    if (i >= items.length) return onDone(results);
    const it = items[i];
    const head = `${dots(i, items.length)}${it.uncertain ? '<div class="chip" style="--c:#e8b04a">unsicher belegt</div>' : ''}`;
    if (it.type === 'mc') {
      el.innerHTML = `${head}<h2 style="margin:8px 0">${esc(it.q)}</h2>${it.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}<div id="ir-fb"></div>`;
      el.querySelectorAll('.opt').forEach((b) => {
        b.onclick = () => {
          const k = Number(b.dataset.k);
          const right = k === it.answer;
          el.querySelectorAll('.opt').forEach((o) => {
            o.disabled = true;
            if (Number(o.dataset.k) === it.answer) o.classList.add('right');
          });
          if (!right) b.classList.add('wrong');
          play(right ? 'ding' : 'warn');
          el.querySelector('#ir-fb').innerHTML = `<div class="${right ? 'ok' : 'err'}">${right ? 'Richtig.' : 'Falsch.'} ${esc(it.explain || '')}</div><div class="btns"><button class="btn primary" id="ir-next">Weiter</button></div>`;
          el.querySelector('#ir-next').onclick = () => next({ id: it.id, score: right ? 1 : 0, right });
        };
      });
    } else if (it.type === 'card') {
      el.innerHTML = `${head}<div class="flip" id="fl">${esc(it.q)}</div><div id="ir-fb"><div class="btns"><button class="btn primary" id="ir-show">Antwort zeigen</button></div></div>`;
      el.querySelector('#ir-show').onclick = () => {
        const f = el.querySelector('#fl');
        f.classList.add('back');
        f.textContent = it.a;
        el.querySelector('#ir-fb').innerHTML = `<div class="btns"><button class="btn danger" id="no">Nochmal üben</button><button class="btn good" id="yes">Wusste ich</button></div>`;
        el.querySelector('#yes').onclick = () => next({ id: it.id, score: 1, right: true });
        el.querySelector('#no').onclick = () => next({ id: it.id, score: 0, right: false });
      };
    } else {
      // offene Frage
      el.innerHTML = `${head}<h2 style="margin:8px 0">${esc(it.q)}</h2>${voice ? '<p class="muted">Sprich deine Antwort laut. Danach gleichst du sie mit den Stichwörtern ab.</p>' : ''}
        <textarea id="ans" placeholder="${voice ? 'Dein gesprochener Text erscheint hier' : 'Deine Antwort in eigenen Worten'}"></textarea>
        <div class="btns">${voice ? `<button class="btn mic" id="mic">${icon('mic', 16)} Sprechen</button>` : ''}<button class="btn primary" id="chk">Prüfen</button></div><div id="ir-fb"></div>`;
      if (voice) attachMic(el.querySelector('#mic'), el.querySelector('#ans'));
      el.querySelector('#chk').onclick = () => {
        const text = el.querySelector('#ans').value;
        const kps = it.keyPoints || [];
        const auto = matchKeyPoints(text, kps);
        const picks = [...auto];
        const draw = () => {
          const hit = picks.filter(Boolean).length;
          el.querySelector('#ir-fb').innerHTML = kps.length
            ? `<p style="margin-top:10px"><b>Stichwörter.</b> Tippe an, was du wirklich drin hattest:</p><div class="kp">${kps.map((k, n) => `<button data-n="${n}" class="${picks[n] ? 'on' : ''}">${picks[n] ? '✓' : '○'} ${esc(k)}</button>`).join('')}</div><div class="btns"><button class="btn primary" id="ok">${hit}/${kps.length} · Weiter</button></div>`
            : `<p style="margin-top:10px"><b>Wie gut war deine Antwort?</b></p><div class="btns"><button class="btn danger" data-s="0">Nicht gewusst</button><button class="btn" data-s="0.5">Teilweise</button><button class="btn good" data-s="1">Sicher</button></div>`;
          el.querySelectorAll('.kp button').forEach((b) => (b.onclick = () => { picks[Number(b.dataset.n)] = !picks[Number(b.dataset.n)]; draw(); }));
          const ok = el.querySelector('#ok');
          if (ok) ok.onclick = () => { const s = hit / kps.length; next({ id: it.id, score: s, right: s >= 0.6, text }); };
          el.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { const s = Number(b.dataset.s); next({ id: it.id, score: s, right: s >= 0.6, text }); }));
        };
        el.querySelector('#chk').disabled = true;
        draw();
      };
    }
  }
  show();
}
