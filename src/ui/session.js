import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as L from '../engine/learning.js';
import { todayStr } from '../lib/clock.js';
import { esc } from '../lib/util.js';
import { ACT, go, hashParams } from './nav.js';
import { runItems, attachMic } from './itemrunner.js';
import { mascot } from './mascot.js';
import { bar } from './components.js';
import { toast } from './fx.js';

let S = null;
let timer = null;

function flush() {
  if (!S || !S.pending) return;
  const sec = S.pending;
  S.pending = 0;
  S.total += sec;
  A.addLearnSeconds(S.today, sec, { silent: true, future: !S.topic?.school });
}

export default {
  route: 'session',
  live: false,
  render() {
    return `<div id="sess"></div>`;
  },
  mount(root) {
    const params = hashParams();
    const today = todayStr();
    A.ensureTopicPlan(today);
    const topic = A.topicFor(today);
    const learn = store.getLearn();
    const progress = L.progressOf(learn, topic.id);
    const packs = L.packsFor(topic.id, A.getPacks());
    const built = L.buildSession({ topic, packs, progress, date: today, mini: params.mini === '1' });
    const speed = store.getSettings().learnSpeed || 1;
    S = { today, topic, progress, built, i: 0, results: [], blockId: params.block || null, mini: params.mini === '1', pending: 0, total: 0, speed, teachPassed: false, root: root.querySelector('#sess') };
    clearInterval(timer);
    timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || !S) return;
      S.pending += S.speed;
      if (S.pending >= 15) flush();
      const el = document.getElementById('sess-time');
      if (el) {
        const t = Math.round(S.total + S.pending);
        el.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      }
    }, 1000);
    show();
  },
  unmount() {
    clearInterval(timer);
    flush();
    S = null;
  },
};

function header() {
  const n = S.built.steps.length;
  return `<div class="row sp"><a class="back" href="#/heute" style="font-size:28px">‹</a><div class="grow"><small>${S.topic.emoji} ${esc(S.topic.name)}${S.mini ? ' · Mini-Lektion' : ''} · ${S.built.fod.name}</small></div><b id="sess-time" class="chip">00:00</b></div>
  <div class="prog">${Array.from({ length: n }, (_, k) => `<i class="${k < S.i ? 'on' : k === S.i ? 'cur' : ''}"></i>`).join('')}</div>`;
}

function show() {
  const step = S.built.steps[S.i];
  const root = S.root;
  if (!step) return finish();
  root.innerHTML = `${header()}<div class="card" id="body"></div>`;
  const body = root.querySelector('#body');
  const done = (res) => {
    S.results.push({ kind: step.kind, ...res });
    S.i++;
    flush();
    show();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const title = `<h2 style="margin-bottom:6px">${esc(step.title)}</h2>`;

  if (step.kind === 'read') {
    const p = step.pack;
    body.innerHTML = `${title}<small>${esc(p.title)}${p.placeholder ? ' · Platzhalter-Inhalt, nicht quellengeprüft' : ''}</small>
      ${p.summary ? `<p style="margin-top:10px;font-weight:700">${esc(p.summary)}</p>` : ''}
      <div class="expl">${(p.explain || []).map((e) => `<h3>${esc(e.heading)}</h3><p>${esc(e.text)}</p>`).join('')}</div>
      ${p.terms?.length ? `<h3 style="margin-top:16px">Fachbegriffe</h3>${p.terms.map((t) => `<div class="term"><b>${esc(t.term)}</b>: ${esc(t.def)}</div>`).join('')}` : ''}
      ${p.sources?.length ? `<p class="muted" style="margin-top:12px;font-size:12px">Quellen: ${p.sources.map((s) => (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(s.title)}</a>` : esc(s.title))).join(' · ')}</p>` : ''}
      <div class="btns"><button class="btn primary big" id="nx">Verstanden, weiter</button></div>`;
    body.querySelector('#nx').onclick = () => done({});
  } else if (step.kind === 'check' || step.kind === 'cards' || step.kind === 'quiz' || step.kind === 'quick' || step.kind === 'voice') {
    body.innerHTML = `${title}${step.kind === 'check' ? '<p class="muted">Kurz prüfen, was hängen geblieben ist. Ehrlich antworten.</p>' : ''}<div id="run"></div>`;
    if (!step.items.length) return done({});
    runItems(body.querySelector('#run'), step.items, {
      voice: step.kind === 'voice',
      onDone: (res) => {
        const score = res.reduce((a, r) => a + r.score, 0) / res.length;
        done({ score, wrong: res.filter((r) => !r.right).map((r) => r.id), right: res.filter((r) => r.right).map((r) => r.id) });
      },
    });
  } else if (step.kind === 'scenario') {
    const sc = step.scenario;
    body.innerHTML = `${title}<p style="font-weight:700;margin:8px 0">${esc(sc.situation)}</p>${sc.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.text)}</button>`).join('')}<div id="fb"></div>`;
    body.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
      const o = sc.options[Number(b.dataset.k)];
      body.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (sc.options[Number(x.dataset.k)].best) x.classList.add('right'); });
      if (!o.best) b.classList.add('wrong');
      body.querySelector('#fb').innerHTML = `<div class="${o.best ? 'ok' : 'warn'}">${esc(o.feedback)}</div><div class="btns"><button class="btn primary" id="nx">Weiter</button></div>`;
      body.querySelector('#nx').onclick = () => done({ score: o.best ? 1 : 0.2, wrong: o.best ? [] : [`${step.packId}|s|${step.scenarioIndex}`], right: o.best ? [`${step.packId}|s|${step.scenarioIndex}`] : [] });
    }));
  } else if (step.kind === 'detective') {
    const c = step.case;
    body.innerHTML = `${title}<h3>${esc(c.title)}</h3><pre class="code" style="font-family:inherit;white-space:pre-wrap">${esc(c.story)}</pre><p style="font-weight:700;margin-top:8px">${esc(c.question)}</p>
      <textarea id="g" placeholder="Deine Überlegung. Erst Fakten, dann Schlüsse."></textarea><div class="btns"><button class="btn primary" id="rv">Lösung zeigen</button></div><div id="fb"></div>`;
    body.querySelector('#rv').onclick = () => {
      body.querySelector('#rv').disabled = true;
      body.querySelector('#fb').innerHTML = `<div class="ok" style="white-space:pre-wrap">${esc(c.solution)}</div><p style="margin-top:10px"><b>Wie nah warst du?</b></p><div class="btns"><button class="btn danger" data-s="0">Weit weg</button><button class="btn" data-s="0.5">Teilweise</button><button class="btn good" data-s="1">Getroffen</button></div>`;
      body.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => done({ score: Number(b.dataset.s) })));
    };
  } else if (step.kind === 'teach') {
    const t = step.teach;
    body.innerHTML = `${title}<p style="font-weight:700;margin:8px 0">${esc(t.prompt)}</p><div class="row sp"><span class="chip" id="cd">3:00</span><small>Schreib oder sprich es frei.</small></div>
      <textarea id="tb" style="min-height:150px" placeholder="So würde ich es einem Freund erklären ..."></textarea>
      <div class="btns"><button class="btn mic" id="mic">🎤 Sprechen</button><button class="btn primary" id="fin">Fertig erklärt</button></div><div id="fb"></div>`;
    attachMic(body.querySelector('#mic'), body.querySelector('#tb'));
    let left = 180;
    const cd = setInterval(() => {
      left--;
      const el = body.querySelector('#cd');
      if (!el) return clearInterval(cd);
      el.textContent = left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Zeit um';
    }, 1000);
    body.querySelector('#fin').onclick = () => {
      clearInterval(cd);
      body.querySelector('#fin').disabled = true;
      const text = body.querySelector('#tb').value;
      const terms = t.mustInclude || [];
      const found = L.countTerms(text, terms);
      const need = Math.min(2, terms.length);
      const fups = t.followUps || [];
      const yes = fups.map(() => null);
      const draw = () => {
        const nFound = found.filter(Boolean).length;
        const nYes = yes.filter((v) => v === true).length;
        const all = yes.every((v) => v !== null);
        body.querySelector('#fb').innerHTML = `${terms.length ? `<p style="margin-top:12px"><b>Fachbegriffe (mindestens ${need}):</b></p><div class="kp">${terms.map((k, n) => `<button data-t="${n}" class="${found[n] ? 'on' : ''}">${found[n] ? '✓' : '○'} ${esc(k)}</button>`).join('')}</div>` : ''}
        ${fups.length ? `<p style="margin-top:14px"><b>Nachfragen von deinem Freund. Könntest du sie beantworten?</b></p>${fups.map((f, n) => `<div class="card tight"><div>${esc(f)}</div><div class="btns"><button class="btn sm ${yes[n] === false ? 'danger' : ''}" data-f="${n}" data-v="0">Nein</button><button class="btn sm ${yes[n] === true ? 'good' : ''}" data-f="${n}" data-v="1">Ja</button></div></div>`).join('')}` : ''}
        <div class="btns"><button class="btn primary" id="nx" ${all ? '' : 'disabled'}>Weiter</button></div>`;
        body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { found[Number(b.dataset.t)] = !found[Number(b.dataset.t)]; draw(); }));
        body.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { yes[Number(b.dataset.f)] = b.dataset.v === '1'; draw(); }));
        body.querySelector('#nx').onclick = () => {
          const fs = terms.length ? nFound / terms.length : 1;
          const ys = fups.length ? nYes / fups.length : 1;
          const pass = nFound >= need && nYes >= Math.ceil(fups.length / 2);
          if (pass) S.teachPassed = true;
          done({ score: (fs + ys) / 2, teach: true, pass });
        };
      };
      draw();
    };
  } else if (step.kind === 'free') {
    body.innerHTML = `${title}<p class="muted">Für dieses Thema gibt es noch keinen Inhalt. Schreib auf, was du schon weißt. Dann kann Claude gezielt ein Paket dafür bauen (Lernen > Importieren).</p><textarea id="fr" placeholder="Was weiß ich schon?"></textarea><div class="btns"><button class="btn primary" id="nx">Fertig</button></div>`;
    body.querySelector('#nx').onclick = () => {
      const v = body.querySelector('#fr').value.trim();
      if (v) store.updateDay(S.today, (d) => ((d.notes = d.notes || []), d.notes.push({ topic: S.topic.id, text: v })));
      done({});
    };
  }
}

function finish() {
  flush();
  const root = S.root;
  const steps = S.results.filter((r) => typeof r.score === 'number');
  const before = S.progress.k;
  const res = A.finishLearnSession(S.today, {
    topicId: S.topic.id, packId: S.built.pack?.id, steps: S.results, teachPassed: S.teachPassed, sec: Math.max(S.total, 60), blockId: S.blockId, mini: S.mini,
  });
  const p = L.progressOf(store.getLearn(), S.topic.id);
  const st = L.statusOf(p);
  const pct = Math.round(res.score * 100);
  const rec = res.recovery;
  const min = Math.max(1, Math.round(S.total / 60));
  root.innerHTML = `<div class="big-msg">${mascot(pct >= 60 ? 'fire' : 'happy', 90, 'jump')}<h2>${pct >= 80 ? 'Stark.' : pct >= 50 ? 'Solide.' : 'Lücken gefunden.'}</h2>
    <p class="muted">${steps.length ? `Ergebnis ${pct}%` : 'Fertig'} · ${min} Min · +${res.points} Punkte</p></div>
    <div class="card"><div class="row sp"><b>${S.topic.emoji} ${esc(S.topic.name)}</b><span class="chip" style="--c:${S.topic.color}">${L.STATUS_TEXT[st]}</span></div>
      <div style="margin-top:10px">${bar(p.k / 100, S.topic.color)}</div><small>Wissensstand ${before}% → ${p.k}%</small>
      ${p.gaps.length ? `<p class="warn">${p.gaps.length} offene Lücke${p.gaps.length > 1 ? 'n' : ''}. Die kommen morgen wieder dran.</p>` : '<p class="ok">Keine offenen Lücken.</p>'}
      ${rec ? `<p class="ok" style="margin-top:8px">Wiedereinstieg: ${rec.finished ? 'geschafft, die Kette ist zur Hälfte zurück.' : 'Lektion gezählt.'}</p>` : ''}</div>
    <div class="btns"><a class="btn primary big" href="#/heute">Weiter zum Tag</a></div>
    <div class="btns"><a class="btn" href="#/session?mini=1" id="again">Noch eine Mini-Lektion</a></div>`;
}
