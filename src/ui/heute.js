import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as disc from '../engine/discipline.js';
import { nowMin, nowDate, todayStr, nowTs } from '../lib/clock.js';
import { fmt, fmtDur, hm, niceDate } from '../lib/dates.js';
import { esc, pick } from '../lib/util.js';
import { MOTTOS, DAILY_TEASERS } from '../data/texts.js';
import { COLORS } from '../engine/plan.js';
import { ring, bar } from './components.js';
import { icon } from './icons.js';
import { ACT, go } from './nav.js';
import { modal, toast } from './fx.js';
import { isIOS } from '../core/notify.js';
import { trackSeen } from './track.js';

export function greeting() {
  const h = nowDate().getHours();
  return h < 5 ? 'Noch wach' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : h < 22 ? 'Guten Abend' : 'Späte Stunde';
}
export const mottoFor = (date) => pick(MOTTOS, date + 'motto');
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function until(minTarget, now) {
  const d = Math.max(0, minTarget - now);
  const h = Math.floor(d / 60);
  const m = Math.ceil(d % 60);
  return h ? `${h}:${String(m === 60 ? 59 : m).padStart(2, '0')} Std` : `${m} Min`;
}

function heroHtml(plan, today, S) {
  const now = nowMin();
  const b = plan.current;
  const D = store.getDay(today);
  if (!b) {
    return `<div class="hero" style="--c:#34c98b"><div class="lab">${icon('check', 14)} Alles erledigt</div><h2>Das war's für heute, ${esc(S.name)}.</h2>
      <div class="sub">Abendcheck um ${fmt(plan.eveStart)}. Danach Handy aus und lesen. Freizeit gibt es unten, solange der Tag es hergibt.</div>
      <div class="actions"><button class="btn big" data-act="h-evening">Abendcheck jetzt</button></div></div>`;
  }
  const lab = b.status === 'running' ? 'Läuft gerade' : b.start > now + 2 ? `Als Nächstes · in ${until(b.start, now)}` : 'Jetzt';
  const color = b.color || COLORS[b.kind] || '#ff6b2c';
  const timeLine = b.kind === 'bock' ? '' : `${fmt(b.start)} – ${fmt(b.end)} · ${fmtDur(b.dur)}`;
  let title = b.title;
  let sub = b.sub || '';
  let actions = '';
  let extra = '';
  const run = b.status === 'running' && !b.fixed;
  const started = D.started?.[b.id];
  const idq = esc(b.id);
  const swap = `<button class="btn" data-act="h-swap">${icon('swap', 16)} Anderes zuerst</button>`;
  switch (b.kind) {
    case 'morning':
      if (now < plan.planWake - 5) {
        title = `Aufstehen um ${fmt(plan.planWake)}`;
        sub = `Noch ${until(plan.planWake, now)}.`;
      } else {
        title = 'Aufstehen. Jetzt.';
        sub = now > plan.planWake + 10 ? `Es ist ${fmt(now)}. Der Plan wartet nicht.` : 'Wasser trinken, fertig machen, los.';
      }
      actions = `<button class="btn big" data-act="h-wake">Ich bin wach</button><button class="btn" data-act="h-oversleep">Verschlafen</button>`;
      break;
    case 'school':
      sub = `${b.sub}. ${b.status === 'running' ? 'Noch ' + until(b.end, now) + '.' : 'Los zur Schule.'}`;
      actions = `<button class="btn" data-act="h-cancel" data-id="${idq}">Diese Stunde fällt aus</button>`;
      break;
    case 'travel':
      sub = b.status === 'running' ? 'Unterwegs.' : 'Los, damit du pünktlich bist.';
      break;
    case 'lunch':
      actions = `<button class="btn big" data-act="h-lunch">Fertig, weiter</button>`;
      break;
    case 'bock':
      title = `${esc(S.name)}, was jetzt?`;
      sub = 'Lernen, Lesen oder Freizeit. Du entscheidest, der Tag passt sich an.';
      actions = `<button class="btn big" data-act="h-bock">Auswählen</button>`;
      break;
    case 'evening':
      title = 'Abendcheck';
      sub = 'Rückblick, Abfrage, Vaterunser, eigene Worte. Danach Handy aus.';
      actions = `<button class="btn big" data-act="h-evening">Abendcheck starten</button>`;
      break;
    case 'sport':
      if (b.fixedSport) {
        sub = b.status === 'running' ? 'Läuft gerade. Gib alles.' : `Fester Termin, Beginn ${fmt(b.start)}.`;
        actions = `<button class="btn" data-act="h-skip-fixed" data-id="${idq}">Fällt heute aus</button>`;
        break;
      }
    // eslint-disable-next-line no-fallthrough
    default: {
      if (b.kind === 'learn') {
        actions = `<button class="btn big" data-act="h-learn" data-id="${idq}">${started ? 'Weiterlernen' : 'Lektion starten'}</button>
          <div class="two"><button class="btn" data-act="h-focus">Fokus starten</button><button class="btn" data-act="h-mini">5-Min-Mini</button></div>${swap}`;
      } else if (run) {
        const limit = b.kind === 'free' ? b.dur * 60 : 0;
        extra = `<div class="timer" data-since="${started.ts}" ${limit ? `data-limit="${limit}"` : ''}>00:00</div>`;
        actions = `<button class="btn big" data-act="h-done" data-id="${idq}">${b.kind === 'free' ? 'Freizeit beenden' : 'Fertig'}</button>`;
      } else {
        const label = b.kind === 'free' ? 'Freizeit starten' : b.kind === 'sport' ? 'Los geht\'s' : 'Starten';
        actions = `<button class="btn big" data-act="h-start" data-id="${idq}">${label}</button><div class="two">${swap}${b.kind === 'free' ? '' : `<button class="btn" data-act="h-skip" data-id="${idq}">Später</button>`}</div>`;
      }
    }
  }
  return `<div class="hero" style="--c:${color}">
    <div class="lab">${icon(b.icon || 'bolt', 15)} ${lab}</div>
    ${timeLine ? `<div class="time">${timeLine}</div>` : ''}
    <h2>${esc(title)}</h2>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}${extra}
    <div class="actions">${actions}</div></div>`;
}

function timeline(plan) {
  const items = plan.blocks.filter((b) => b.kind !== 'bock' && b.status !== 'skipped' && b.dur > 0);
  return `<div class="tl">${items
    .map((b) => {
      const isNow = plan.current && plan.current.id === b.id;
      const st = b.status === 'done' ? icon('check', 16) : b.status === 'slept' ? icon('moon', 16) : b.status === 'missed' ? `<span class="bad">${icon('x', 16)}</span>` : b.status === 'running' ? icon('play', 14) : '';
      return `<div class="tl-item ${b.status === 'done' || b.status === 'slept' ? 'done' : ''} ${isNow ? 'now' : ''}" style="--c:${b.color}"><div class="t">${fmt(b.start)}</div><div class="n"><b>${esc(b.title)}</b><small>${esc(b.sub || '')}</small></div><div class="st ${b.status === 'missed' ? 'bad' : ''}">${st}</div></div>`;
    })
    .join('')}</div>`;
}

export default {
  route: 'heute',
  live: true,
  render() {
    const today = todayStr();
    const S = store.getSettings();
    const meta = store.getMeta();
    const plan = A.planFor(today);
    const stats = A.statsFor(today);
    const streak = A.streakNow();
    const lvl = disc.levelProgress(meta.points);
    const D = store.getDay(today);
    const now = nowMin();
    const doneToday = disc.learnMinutes(D) >= disc.STREAK_MIN;
    const frac = S.mechanics.goals ? stats.frac : (() => { const f = plan.blocks.filter((b) => !b.fixed && b.dur > 0); return f.length ? f.filter((b) => b.status === 'done').length / f.length : 0; })();
    const nf = plan.nextFixed;
    const teaser = pick(DAILY_TEASERS, today + 't');
    const waterFrac = Math.min(1, (D.water || 0) / S.waterGoal);
    const fut = Math.min(1, stats.futureMin / disc.FUTURE_MIN);
    const free = plan.free;
    return `
    <div class="top"><div><div class="date">${esc(S.name)} · ${niceDate(today)}</div><div class="motto">${esc(mottoFor(today))}</div></div>
      ${S.mechanics.points ? `<div class="pts" data-act="h-points"><b>${meta.points}</b><span class="lvl">${S.mechanics.titles ? disc.titleFor(lvl.level) + ' · ' : ''}Level ${lvl.level}</span></div>` : ''}</div>
    ${heroHtml(plan, today, S)}
    ${plan.next && plan.current ? `<div class="next">${icon(plan.next.icon || 'arrow', 20)}<div class="grow"><small>Danach · ${fmt(plan.next.start)}</small><b>${esc(plan.next.title)}</b></div><small>${fmtDur(plan.next.dur)}</small></div>` : ''}
    <div class="stats">
      <div class="stat flame ${S.mechanics.streak ? '' : 'off'}" data-act="h-streak">${icon('flame', 22)}<span class="big">${S.mechanics.streak ? streak : '–'}</span><span class="lab2">${plural(streak, 'Tag', 'Tage')} Streak${doneToday && S.mechanics.streak ? ' · heute gesichert' : ''}</span></div>
      <div class="stat" data-act="h-goals">${ring(frac, { size: 56, stroke: 6, color: frac >= 1 ? '#34c98b' : '#ff6b2c', label: Math.round(frac * 100) + '%' })}<span class="lab2">Tagesziele</span></div>
      <div class="stat" data-act="h-plan">${icon('clock', 22)}<span class="big num" style="font-size:22px" data-clock>${fmt(now)}</span><span class="lab2">${nf ? `${esc(nf.title)} ${fmt(nf.start)}, in ${until(nf.start, now)}` : 'Kein fester Termin mehr'}</span></div>
    </div>
    <div class="card"><div class="row sp"><h2>Freizeit</h2><small>${free.takenMin ? `${free.takenMin} Min genommen` : 'noch nichts genommen'}${free.pending ? ` · ${free.pending} geplant` : ''}</small></div>
      <p class="muted" style="margin:6px 0 0;font-size:13px">Erst die Aufgaben. Jeder Druck schiebt den Rest des Tages um 15 Minuten nach hinten, aber nur, wenn danach noch alles reinpasst.</p>
      <div class="btns"><button class="btn" data-act="h-free">15 Minuten Freizeit</button></div></div>
    <div class="card"><div class="row sp"><h2>Wasser</h2><small class="num">${((D.water || 0) / 1000).toFixed(2).replace('.', ',')} / ${(S.waterGoal / 1000).toString().replace('.', ',')} L</small></div>
      <div class="water" style="margin-top:10px"><div class="bottle"><i style="height:${Math.round(waterFrac * 100)}%"></i></div>
      <div class="grow"><div class="btns" style="margin:0"><button class="btn" data-act="h-water" data-ml="250">+250 ml</button><button class="btn" data-act="h-water" data-ml="500">+500 ml</button></div>
      <div class="btns" style="margin-top:8px"><button class="btn sm ghost" data-act="h-water" data-ml="-250" ${(D.water || 0) <= 0 ? 'disabled' : ''}>−250 ml korrigieren</button></div></div></div></div>
    <div class="card tight"><div class="row sp"><h2>Zukunftswissen</h2><small class="num">${Math.round(stats.futureMin)} / ${disc.FUTURE_MIN} Min · Schule und Finanzen</small></div><div style="margin-top:8px">${bar(fut)}</div></div>
    ${S.mechanics.goals ? `<div class="goals">${stats.goals.map((g) => `<div class="goal ${g.frac >= 1 ? 'ok' : ''}">${icon(g.icon, 18)}${g.label}${bar(g.frac, g.frac >= 1 ? '#34c98b' : '#ff6b2c')}</div>`).join('')}</div>` : ''}
    <div class="card tight" data-act="h-teaser"><div class="row sp"><h2>${icon('bulb', 16)} Denkaufgabe des Tages</h2><small>Tippen für Lösung</small></div><p style="margin-top:6px">${esc(teaser.q)}</p><p class="ok teaser-a" hidden>${esc(teaser.a)}</p></div>
    <div class="sec-title"><h2>Der ganze Tag</h2><a href="#/plan">Plan</a></div>
    ${timeline(plan)}
    <div class="btns"><a class="btn" href="#/hausaufgaben">${icon('pencil', 16)} Hausaufgabe eintragen</a></div>
    <div class="btns"><button class="btn" data-act="h-oversleep">Verschlafen</button><button class="btn" data-act="h-evening">Abendcheck</button></div>`;
  },
  mount() {
    trackSeen();
  },
};

// ---------- Aktionen ----------
const today = () => todayStr();
const blockById = (id) => A.planFor(today()).blocks.find((b) => b.id === id);

ACT['h-wake'] = () => {
  A.confirmWake();
  toast('Der Tag läuft.', { kind: 'good' });
};
ACT['h-oversleep'] = () => {
  const d = nowDate();
  const val = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  modal(
    `<h2>Verschlafen</h2><p class="muted">Wann bist du wirklich aufgestanden? Der Rest des Tages verschiebt sich.</p>
    <label class="f">Aufstehzeit</label><input type="time" id="ov-time" value="${val}">
    <div class="btns"><button class="btn" data-close>Abbrechen</button><button class="btn primary" id="ov-ok">Tag verschieben</button></div>`,
    {
      onMount: (m, close) => {
        m.querySelector('#ov-ok').onclick = () => {
          const t = m.querySelector('#ov-time').value;
          if (!t) return;
          A.setWake(today(), hm(t), true);
          close();
          toast(`Aufgestanden um ${t}. Der Tag ist neu geplant.`, { kind: 'warn' });
        };
      },
    },
  );
};
ACT['h-free'] = () => {
  const r = A.requestFree(today());
  if (r.ok) toast('15 Minuten Freizeit eingeplant. Der Rest rutscht nach hinten.', { kind: 'good' });
  else toast(r.msg, { kind: 'hard', ms: 6500 });
};
ACT['h-lunch'] = () => A.completeLunch();
ACT['h-bock'] = () => go('#/bock');
ACT['h-evening'] = () => go('#/abend');
ACT['h-plan'] = () => go('#/plan');
ACT['h-learn'] = (el) => {
  const b = blockById(el.dataset.id);
  if (b && !store.getDay(today()).started?.[b.id]) A.startBlock(today(), b.id);
  go(`#/session?block=${encodeURIComponent(el.dataset.id)}`);
};
ACT['h-mini'] = () => go('#/session?mini=1');
ACT['h-start'] = (el) => A.startBlock(today(), el.dataset.id);
ACT['h-done'] = (el) => {
  const b = blockById(el.dataset.id);
  if (!b) return;
  if (b.kind === 'read') {
    const book = A.currentBook();
    modal(
      `<h2>Wie viele Seiten?</h2><p class="muted">${book ? esc(book.title) + ' (Seite ' + (book.page || 0) + ')' : 'Kein Buch angelegt. Du kannst eins unter Lernen > Bücher hinzufügen.'}</p>
       <label class="f">Gelesene Seiten</label><input type="number" id="pg" min="0" max="500" value="10" inputmode="numeric">
       <div class="btns"><button class="btn primary" id="pg-ok">Fertig</button></div>`,
      { onMount: (m, close) => (m.querySelector('#pg-ok').onclick = () => { const n = Math.max(0, Number(m.querySelector('#pg').value) || 0); close(); A.finishBlock(today(), b, { pages: n }); }) },
    );
  } else if (b.kind === 'free') {
    const st = store.getDay(today()).started?.[b.id];
    const mins = Math.max(1, Math.round((nowTs() - (st?.ts || nowTs())) / 60000));
    A.finishBlock(today(), b, { minutes: mins });
  } else A.finishBlock(today(), b);
};
ACT['h-skip'] = (el) => {
  A.skipBlock(today(), el.dataset.id);
  toast('Verschoben. Fehlendes wird auf die nächsten Tage verteilt.', { kind: 'warn' });
};
ACT['h-skip-fixed'] = (el) => {
  A.skipBlock(today(), el.dataset.id);
  toast('Handball fällt aus. Hol den Sport anders nach.', { kind: 'warn' });
};
ACT['h-cancel'] = (el) => {
  const b = blockById(el.dataset.id);
  if (!b || !b.periods) return;
  const D = store.getDay(today());
  const add = Array.from({ length: b.periods[1] - b.periods[0] + 1 }, (_, i) => b.periods[0] + i);
  A.setCancelled(today(), [...(D.cancelled || []), ...add]);
  toast('Ausfall eingetragen. Neue Vorschläge unter Plan.', { kind: 'good', actions: [{ label: 'Zum Plan', run: () => go('#/plan?day=' + today()) }] });
};
ACT['h-focus'] = () => {
  const S = store.getSettings();
  if (isIOS()) location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(S.focusShortcut)}`;
  else modal(`<h2>Fokus</h2><p>Auf dem iPhone startet dieser Knopf deinen Kurzbefehl "${esc(S.focusShortcut)}". Auf Mac und PC hilft ein Website-Blocker (Fokus-Modus des Systems oder ein Blocker wie Cold Turkey). Handy weg, Tabs zu.</p><div class="btns"><button class="btn primary" data-close>Okay</button></div>`);
};
ACT['h-swap'] = () => {
  const plan = A.planFor(today());
  const cand = plan.blocks.filter((b) => !b.fixed && b.status === 'pending' && b.id !== plan.current?.id && b.kind !== 'bock');
  modal(`<h2>Was zuerst?</h2><p class="muted">Du darfst tauschen. Am Ende muss alles Wichtige trotzdem erledigt sein.</p>
    ${cand.map((b) => `<button class="opt" data-pick="${esc(b.kind)}" data-bid="${esc(b.id)}">${esc(b.title)} <small>· ${fmtDur(b.dur)}</small></button>`).join('') || '<div class="empty">Nichts anderes offen.</div>'}`,
    { onMount: (m, close) => m.addEventListener('click', (e) => { const o = e.target.closest('[data-pick]'); if (o) { A.chooseBock(today(), o.dataset.pick, o.dataset.bid); close(); } }) });
};
ACT['h-water'] = (el) => A.addWater(today(), Number(el.dataset.ml));
ACT['h-teaser'] = (el) => {
  const a = el.querySelector('.teaser-a');
  if (a) a.hidden = !a.hidden;
};
ACT['h-streak'] = () => {
  A.trackUsage('streak');
  const meta = store.getMeta();
  const best = disc.bestStreak(store.allDays(), today(), meta);
  modal(`<h2>Streak</h2><p>Ein Tag zählt ab <b>${disc.STREAK_MIN} Minuten</b> Lernen (Lektionen, Hausaufgaben). Aktuell: <b>${A.streakNow()}</b>. Rekord: <b>${best}</b>.</p>
    <p class="muted" style="margin-top:8px">Kein Tag fällt ohne Grund aus. Ohne Lernzeit und ohne akzeptierte Begründung am gleichen Tag reißt die Kette.</p><div class="btns"><a class="btn primary" href="#/woche" data-close>Wochenrückblick</a></div>`);
};
ACT['h-points'] = () => {
  A.trackUsage('points');
  const meta = store.getMeta();
  const S = store.getSettings();
  const l = disc.levelProgress(meta.points);
  modal(`<h2>Punkte und Level</h2><p>${meta.points} Punkte. Level ${l.level}${S.mechanics.titles ? ' · ' + disc.titleFor(l.level) : ''}.</p><div style="margin:8px 0">${bar(l.frac)}</div><small>${l.into} / ${l.need} bis Level ${l.level + 1}</small>
    <hr><h3>Zuletzt</h3>${meta.pointsLog.slice(-8).reverse().map((p) => `<div class="list-item"><div class="grow">${esc(p.why)}</div><b>+${p.n}</b></div>`).join('') || '<div class="empty">Noch nichts.</div>'}`);
};
ACT['h-goals'] = () => {
  A.trackUsage('goals');
  const st = A.statsFor(today());
  modal(`<h2>Tagesziele</h2>${st.goals.map((g) => `<div class="list-item">${icon(g.icon, 20)}<div class="grow"><b>${g.label}</b><br><small>${g.text}</small></div>${g.frac >= 1 ? icon('check', 18) : ''}</div>`).join('')}`);
};
