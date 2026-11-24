import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as L from '../engine/learning.js';
import * as disc from '../engine/discipline.js';
import { VATERUNSER } from '../data/texts.js';
import { todayStr, nowMin } from '../lib/clock.js';
import { addDays, fmt, niceDate } from '../lib/dates.js';
import { esc, copyText } from '../lib/util.js';
import { runItems } from './itemrunner.js';
import { icon } from './icons.js';
import { ring } from './components.js';
import { ACT, go } from './nav.js';
import { toast } from './fx.js';
import { promptFor } from './lernen.js';

let E = null;

export default {
  route: 'abend',
  live: false,
  render() {
    return `<div id="eve"></div>`;
  },
  mount(root) {
    const date = todayStr();
    const D = store.getDay(date);
    const learnMin = disc.learnMinutes(D);
    const needExcuse = learnMin < disc.STREAK_MIN && !D.excuse?.accepted;
    const topic = A.topicFor(date);
    const prog = L.progressOf(store.getLearn(), topic?.id);
    const items = topic ? L.buildEveningQuiz({ topicId: topic.id, packs: A.getPacks(), progress: prog, date }) : [];
    const steps = ['rueck'];
    if (needExcuse) steps.push('excuse');
    if (items.length) steps.push('quiz');
    steps.push('gebet', 'worte', 'schluss');
    E = { date, steps, i: D.evening?.done ? steps.length - 1 : 0, items, topic, rating: D.evening?.rating ?? null, words: D.evening?.words || '', root: root.querySelector('#eve'), saved: Boolean(D.evening?.done), cat: null };
    show();
  },
  unmount() {
    E = null;
  },
};

const progress = () => `<div class="prog">${E.steps.map((_, k) => `<i class="${k < E.i ? 'on' : k === E.i ? 'cur' : ''}"></i>`).join('')}</div>`;
const nextStep = () => { E.i++; show(); window.scrollTo({ top: 0 }); };

function show() {
  const step = E.steps[E.i];
  const S = store.getSettings();
  const root = E.root;
  const date = E.date;
  const D = store.getDay(date);
  if (step === 'rueck') {
    const st = A.statsFor(date);
    const left = A.leftoverPreview(date);
    root.innerHTML = `<div class="row sp"><a class="back" href="#/heute">‹</a><small>${niceDate(date)}</small></div>${progress()}
    <div class="big-msg"><div class="cap">Abendcheck</div><h2 style="font-size:26px;margin-top:4px">Rückblick, ${esc(S.name)}</h2></div>
    <div class="card"><div class="row"><div>${ring(st.frac, { size: 86, stroke: 9, label: Math.round(st.frac * 100) + '%', sub: 'Ziele' })}</div><div class="grow"><b>${Math.round(st.learnMin)} Min gelernt</b><br><small>${st.goals.filter((g) => g.frac >= 1).length} von ${st.goals.length} Zielen erreicht · +${D.points || 0} Punkte heute</small></div></div>
      ${st.goals.map((g) => `<div class="list-item">${icon(g.icon, 20)}<div class="grow"><b>${g.label}</b></div><small>${g.text}</small>${g.frac >= 1 ? icon('check', 18) : ''}</div>`).join('')}</div>
    ${left.length ? `<div class="card tight"><b>Bleibt liegen</b><p class="muted">${left.map((l) => `${l.kind === 'learn' ? 'Lernen' : l.kind === 'read' ? 'Lesen' : l.kind === 'sd' ? 'Selbstverteidigung' : 'Sport'} (${l.min} Min)`).join(', ')}. Das wird auf die nächsten Tage verteilt.</p></div>` : '<div class="card tight ok">Nichts bleibt liegen.</div>'}
    <div class="card"><b>Wie war dein Tag?</b><div class="pill-row" style="margin-top:8px">${[1, 2, 3, 4, 5].map((n) => `<span class="pill ${E.rating === n ? 'on' : ''}" data-act="e-rate" data-n="${n}">${n} · ${['schwach', 'mäßig', 'okay', 'gut', 'stark'][n - 1]}</span>`).join('')}</div></div>
    <div class="btns"><button class="btn primary big" data-act="e-next">Weiter</button></div>`;
  } else if (step === 'excuse') {
    const days = store.allDays();
    const recent = disc.acceptedExcusesInWeek(days, date);
    const ex = D.excuse;
    root.innerHTML = `${progress()}<div class="card" style="border-color:#ff4d6d"><h2>Heute ist nichts gelaufen</h2>
      <p style="margin-top:8px">Du hast heute keine ${disc.STREAK_MIN} Minuten gelernt. Kein Tag darf ohne Grund ausfallen. Entweder du lernst jetzt ${disc.STREAK_MIN} Minuten, oder du gibst jetzt eine ehrliche Begründung ab. Ohne beides ist der Tag verloren und die Streak reißt.</p>
      <div class="btns"><a class="btn primary" href="#/session?mini=1">Jetzt 5 Minuten lernen</a></div></div>
      <div class="card"><b>Oder: Begründung</b><div class="pill-row" style="margin:10px 0">${disc.EXCUSE_CATS.map((c) => `<span class="pill ${E.cat === c.id ? 'on' : ''}" data-act="e-cat" data-id="${c.id}">${c.label}</span>`).join('')}</div>
      <textarea id="ex" placeholder="Was ist passiert? Konkret und ehrlich.">${esc(ex?.text || '')}</textarea>
      <small>Akzeptierte Begründungen diese Woche: ${recent} von ${S.maxExcuses}. Bei Annahme: morgen 15 Minuten Ausgleich (kommt vor die Freizeit) und eine Seite mehr lesen.</small>
      <div id="exres">${ex ? (ex.accepted ? '<p class="ok">Angenommen.</p>' : `<p class="err">${esc(ex.msg)}</p>`) : ''}</div>
      <div class="btns"><button class="btn primary" data-act="e-excuse">Begründung abgeben</button></div></div>
      <div class="btns"><button class="btn ghost ${ex?.accepted ? '' : 'off'}" data-act="e-next">Weiter</button></div>`;
  } else if (step === 'quiz') {
    root.innerHTML = `${progress()}<h2 style="margin:8px 0">Abendabfrage: ${esc(E.topic.name)}</h2><p class="muted">Drei Fragen zum Tagesthema. Lücken kommen morgen wieder dran.</p><div class="card" id="run"></div>`;
    runItems(root.querySelector('#run'), E.items, {
      onDone: (res) => {
        A.recordEveningQuiz(date, E.topic.id, res);
        const sc = res.reduce((a, r) => a + r.score, 0) / res.length;
        root.querySelector('#run').innerHTML = `<div class="big-msg"><h2>${Math.round(sc * 100)}%</h2><p class="muted">${sc >= 0.8 ? 'Sitzt.' : sc >= 0.5 ? 'Geht noch besser.' : 'Hier ist noch Arbeit nötig. Morgen weiter.'}</p></div><div class="btns"><button class="btn primary big" data-act="e-next">Weiter</button></div>`;
      },
    });
  } else if (step === 'gebet') {
    root.innerHTML = `${progress()}<div class="card"><h2 style="text-align:center">Vaterunser</h2><div class="vp" style="margin-top:12px">${VATERUNSER.map((l) => esc(l)).join('<br>')}</div></div><div class="btns"><button class="btn primary big" data-act="e-next">Amen</button></div>`;
  } else if (step === 'worte') {
    root.innerHTML = `${progress()}<div class="card"><h2>Eigene Worte</h2><p class="muted" style="margin:6px 0">Ein paar Sätze von dir. Wofür bist du dankbar? Was nimmst du dir für morgen vor? Freiwillig, aber es zählt.</p><textarea id="wo" style="min-height:140px" placeholder="Heute ...">${esc(E.words)}</textarea></div><div class="btns"><button class="btn primary big" data-act="e-finish">Abschließen</button></div>`;
  } else if (step === 'schluss') {
    if (!E.saved) {
      A.saveEvening(date, { rating: E.rating, words: E.words, prayer: true });
      E.saved = true;
    }
    const tomorrow = A.topicFor(addDays(date, 1));
    const book = A.currentBook();
    root.innerHTML = `<div class="big-msg" style="margin-top:20px"><div class="big-ic">${icon('moon', 30)}</div><h2>Feierabend, ${esc(S.name)}.</h2><p>Handy aus. <b>Jetzt lesen.</b></p>${book ? `<p class="muted">${esc(book.title)} · Seite ${book.page || 0}</p>` : ''}</div>
    <div class="card"><b>Morgen: ${tomorrow ? esc(tomorrow.name) : ''}</b><p class="muted" style="margin:6px 0">Willst du, dass Claude das Thema vorab recherchiert? Auftrag kopieren und in Claude Code einfügen.</p><div class="btns"><button class="btn" data-act="l-copy" data-topic="${esc(tomorrow?.id || '')}">${icon('clip', 16)} Auftrag kopieren</button><a class="btn" href="#/import">${icon('download', 16)} Importieren</a></div></div>
    <div class="btns"><a class="btn" href="#/heute">Zurück zu Heute</a></div>
    <p class="muted" style="text-align:center;margin-top:10px;font-size:12px">Das Lesen ist nur eine Erinnerung, kein Pflichtfeld.</p>`;
  }
  root.querySelectorAll('[data-act="e-next"]').forEach((b) => (b.disabled = false));
}

ACT['e-rate'] = (el) => {
  E.rating = Number(el.dataset.n);
  show();
};
ACT['e-next'] = () => {
  if (E.steps[E.i] === 'excuse') {
    const D = store.getDay(E.date);
    if (!D.excuse?.accepted && disc.learnMinutes(D) < disc.STREAK_MIN) return toast('Erst Begründung abgeben oder 5 Minuten lernen.', { kind: 'hard' });
  }
  nextStep();
};
ACT['e-cat'] = (el) => {
  E.cat = el.dataset.id;
  const t = document.getElementById('ex')?.value;
  E.exText = t;
  show();
  const ta = document.getElementById('ex');
  if (ta && t) ta.value = t;
};
ACT['e-excuse'] = () => {
  const text = document.getElementById('ex').value;
  const v = A.submitExcuse(E.date, { cat: E.cat, text });
  show();
  const ta = document.getElementById('ex');
  if (ta) ta.value = text;
  if (v.ok) toast('Begründung angenommen. Ausgleich morgen: 15 Minuten extra und eine Seite mehr lesen.', { kind: 'warn', ms: 5000 });
};
ACT['e-finish'] = () => {
  E.words = document.getElementById('wo')?.value || '';
  nextStep();
};
