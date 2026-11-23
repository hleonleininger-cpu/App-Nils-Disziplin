import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as disc from '../engine/discipline.js';
import { nowMin, nowDate, todayStr, nowTs } from '../lib/clock.js';
import { fmt, fmtDur, hm, niceDate, weekdayIdx } from '../lib/dates.js';
import { esc, pick } from '../lib/util.js';
import { MOTTOS, DAILY_TEASERS } from '../data/texts.js';
import { COLORS } from '../engine/plan.js';
import { mascot } from './mascot.js';
import { ring, bar, chip } from './components.js';
import { ACT, go, refresh } from './nav.js';
import { modal, toast } from './fx.js';
import { isIOS } from '../core/notify.js';
import { trackSeen } from './track.js';

const KIND_LABEL = { morning: 'Aufstehen', school: 'Schule', lunch: 'Pause', bock: 'Du entscheidest', learn: 'Lernen', sport: 'Sport', sd: 'Selbstverteidigung', read: 'Lesen', free: 'Freizeit', project: 'Projekt', evening: 'Abend' };

export function greeting() {
  const h = nowDate().getHours();
  return h < 5 ? 'Noch wach' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : h < 22 ? 'Guten Abend' : 'Späte Stunde';
}
export const mottoFor = (date) => pick(MOTTOS, date + 'motto');

function until(minTarget, now) {
  const d = Math.max(0, minTarget - now);
  const h = Math.floor(d / 60);
  const m = Math.ceil(d % 60);
  return h ? `${h}:${String(m === 60 ? 59 : m).padStart(2, '0')} Std` : `${m} Min`;
}

function heroData(plan, today, S) {
  const b = plan.current;
  const now = nowMin();
  const D = store.getDay(today);
  if (!b) return { idle: true };
  const lab = b.status === 'running' ? 'Läuft gerade' : b.start > now + 2 ? `Als Nächstes · in ${until(b.start, now)}` : 'Das ist jetzt dran';
  return { b, lab };
}

function heroHtml(plan, today, S, meta) {
  const now = nowMin();
  const { b, lab, idle } = heroData(plan, today, S);
  const D = store.getDay(today);
  if (idle) {
    const fr = plan.free.remaining;
    return `<div class="hero" style="--c:#19c37d" data-emoji="🏁"><div class="lab">Alles erledigt</div><h2>Das war's für heute, ${esc(S.name)}.</h2>
      <div class="sub">${fr > 0 ? `Dir bleiben noch ${fr} Minuten Freizeit. ` : ''}Abendcheck um ${fmt(plan.eveStart)}. Danach Handy aus und lesen.</div>
      <div class="actions"><button class="btn big" data-act="h-evening">Abendcheck jetzt machen</button></div></div>`;
  }
  const color = b.color || COLORS[b.kind] || '#ff9a1f';
  const timeLine = b.kind === 'bock' ? '' : `${fmt(b.start)}–${fmt(b.end)} · ${fmtDur(b.dur)}`;
  let title = b.title;
  let sub = b.sub || '';
  let actions = '';
  let extra = '';
  const run = b.status === 'running' && !b.fixed;
  const started = D.started?.[b.id];
  const idq = esc(b.id);
  const sec = (cls, act, label, data = '') => `<button class="btn ${cls}" data-act="${act}" data-id="${idq}" ${data}>${label}</button>`;
  switch (b.kind) {
    case 'morning': {
      if (now < plan.planWake - 5) {
        title = `Aufstehen um ${fmt(plan.planWake)}`;
        sub = `Noch ${until(plan.planWake, now)}. Gute Nacht war gestern, gleich geht es los.`;
      } else {
        title = 'Aufstehen. Jetzt.';
        sub = now > plan.planWake + 10 ? `Es ist ${fmt(now)}. Der Plan wartet nicht.` : 'Wasser trinken, fertig machen, los.';
      }
      actions = `<button class="btn big" data-act="h-wake">Ich bin wach</button><button class="btn" data-act="h-oversleep">😴 Verschlafen</button>`;
      break;
    }
    case 'school': {
      title = b.title;
      sub = `${b.sub}. ${b.status === 'running' ? 'Noch ' + until(b.end, now) + '.' : 'Los zur Schule.'}`;
      actions = `<button class="btn" data-act="h-cancel" data-id="${idq}">Diese Stunde fällt aus</button>`;
      break;
    }
    case 'lunch':
      actions = `<button class="btn big" data-act="h-lunch">Fertig, weiter</button>`;
      break;
    case 'bock':
      title = `${esc(S.name)}, worauf hast du Bock?`;
      sub = 'Drei Optionen. Du entscheidest, der Tag passt sich an.';
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
          <div class="row"><button class="btn grow" data-act="h-focus">🎯 Fokus starten</button><button class="btn grow" data-act="h-mini">⚡ 5-Min-Mini</button></div>`;
      } else if (run) {
        const limit = b.kind === 'free' ? plan.free.remaining * 60 : 0;
        extra = `<div class="timer" data-since="${started.ts}" ${limit ? `data-limit="${limit}"` : ''}>00:00</div>`;
        actions = `<button class="btn big" data-act="h-done" data-id="${idq}">${b.kind === 'free' ? 'Freizeit beenden' : 'Fertig'}</button>`;
      } else {
        actions = `<button class="btn big" data-act="h-start" data-id="${idq}">${b.kind === 'free' ? 'Freizeit starten' : b.kind === 'sport' ? 'Los geht\'s' : 'Starten'}</button>`;
      }
      if (b.kind === 'free' && !run) sub = `Limit: noch ${plan.free.remaining} Min heute. Danach ist Schluss.`;
      if (!run && b.kind !== 'learn' && b.kind !== 'free') actions += `<div class="row"><button class="btn grow" data-act="h-swap">🔀 Anderes zuerst</button><button class="btn grow" data-act="h-skip" data-id="${idq}">Später</button></div>`;
      else if (!run) actions += `<div class="row"><button class="btn grow" data-act="h-swap">🔀 Anderes zuerst</button></div>`;
      if (run && b.kind === 'learn') {
        /* Lernsession wird auf eigenem Screen fortgesetzt */
      }
    }
  }
  if (b.kind === 'learn' && run) extra = '';
  return `<div class="hero ${b.status === 'running' || b.start <= now ? 'pulse' : ''}" style="--c:${color}" data-emoji="${b.icon || ''}">
    <div class="lab">${lab}</div>
    ${timeLine ? `<div class="time">${timeLine}</div>` : ''}
    <h2>${b.icon ? b.icon + ' ' : ''}${esc(title)}</h2>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}${extra}
    <div class="actions">${actions}</div></div>`;
}

function timeline(plan) {
  const now = nowMin();
  const items = plan.blocks.filter((b) => b.kind !== 'bock' && b.status !== 'skipped' && b.dur > 0);
  return `<div class="tl">${items
    .map((b) => {
      const isNow = plan.current && plan.current.id === b.id;
      const st = b.status === 'done' ? '✅' : b.status === 'slept' ? '😴' : b.status === 'missed' ? '❌' : b.status === 'running' ? '▶️' : '';
      return `<div class="tl-item ${b.status === 'done' || b.status === 'slept' ? 'done' : ''} ${isNow ? 'now' : ''}" style="--c:${b.color}"><div class="t">${fmt(b.start)}</div><div class="n">${b.icon || ''} ${esc(b.title)}<small>${esc(b.sub || '')}</small></div><div class="st">${st}</div></div>`;
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
    A.ensureTopicPlan(today);
    const plan = A.planFor(today);
    const stats = A.statsFor(today);
    const streak = A.streakNow();
    const lvl = disc.levelProgress(meta.points);
    const D = store.getDay(today);
    const now = nowMin();
    const doneToday = disc.learnMinutes(D) >= disc.STREAK_MIN;
    const mood = !S.mechanics.streak ? 'happy' : doneToday ? 'fire' : now > 19 * 60 ? 'angry' : 'happy';
    const frac = S.mechanics.goals ? stats.frac : (() => { const f = plan.blocks.filter((b) => !b.fixed && b.dur > 0); return f.length ? f.filter((b) => b.status === 'done').length / f.length : 0; })();
    const nf = plan.nextFixed;
    const teaser = pick(DAILY_TEASERS, today + 't');
    const waterFrac = Math.min(1, (D.water || 0) / S.waterGoal);
    const fut = Math.min(1, stats.futureMin / disc.FUTURE_MIN);
    const alertsHtml = '';
    return `
    <div class="top"><div><div class="hello">${greeting()}, ${esc(S.name)} · ${niceDate(today)}</div><div class="motto">${esc(mottoFor(today))}</div></div>
      ${S.mechanics.points ? `<div class="pts" data-act="h-points"><b>⭐ ${meta.points}</b><span class="lvl">${S.mechanics.titles ? disc.titleFor(lvl.level) + ' · ' : ''}Level ${lvl.level}</span></div>` : ''}</div>
    <div class="stats">
      <div class="stat flame" data-act="h-streak">${S.mechanics.streak ? `${mascot(mood, 54)}<span class="big">${streak}</span><small>${streak === 1 ? 'Tag Streak' : 'Tage Streak'}${doneToday ? ' ✓' : ''}</small>` : `${mascot(mood, 54)}<small>Streak aus</small>`}</div>
      <div class="stat" data-act="h-goals">${ring(frac, { size: 84, stroke: 9, color: frac >= 1 ? '#19c37d' : '#ff9a1f', label: Math.round(frac * 100) + '%', sub: 'Tag' })}<small>Tagesring</small></div>
      <div class="stat" data-act="h-plan"><span class="big" style="font-size:24px" data-clock>${fmt(now)}</span><small>${nf ? `${esc(nf.title)} ${fmt(nf.start)}<br>in ${until(nf.start, now)}` : 'Kein fester Termin mehr'}</small></div>
    </div>
    ${heroHtml(plan, today, S, meta)}
    ${plan.next && plan.current ? `<div class="next"><span class="ic">${plan.next.icon || '➡️'}</span><div class="grow"><small>Danach · ${fmt(plan.next.start)}</small><b>${esc(plan.next.title)}</b></div><small>${fmtDur(plan.next.dur)}</small></div>` : ''}
    <div class="card"><div class="row sp"><h2>💧 Wasser</h2><small>${(D.water || 0) / 1000 < 10 ? ((D.water || 0) / 1000).toFixed(2).replace('.', ',') : ''} / ${S.waterGoal / 1000} L</small></div>
      <div class="water"><div class="bottle"><i style="height:${Math.round(waterFrac * 100)}%"></i></div>
      <div class="grow"><div class="btns" style="margin:0"><button class="btn" data-act="h-water" data-ml="250">+250 ml</button><button class="btn" data-act="h-water" data-ml="500">+500 ml</button></div>
      <div class="row" style="margin-top:8px"><button class="link" data-act="h-water" data-ml="-250">−250 ml</button></div></div></div></div>
    <div class="card tight"><div class="row sp"><b>🧠 Zukunftswissen</b><small>${Math.round(stats.futureMin)} / ${disc.FUTURE_MIN} Min</small></div>${bar(fut, '#2fa8ff')}</div>
    ${S.mechanics.goals ? `<div class="goals">${stats.goals.map((g) => `<div class="goal ${g.frac >= 1 ? 'ok' : ''}"><span class="gi">${g.icon}</span>${g.label}${bar(g.frac, g.frac >= 1 ? '#19c37d' : '#ff9a1f')}</div>`).join('')}</div>` : ''}
    <div class="card tight"><div class="row sp"><b>🎮 Freizeit</b><small>${plan.free.remaining > 0 ? `noch ${plan.free.remaining} von ${plan.free.limit} Min` : 'aufgebraucht. Schluss, jetzt wird gearbeitet.'}</small></div>${bar(plan.free.limit ? plan.free.remaining / plan.free.limit : 0, '#2dd4bf')}</div>
    <div class="card tight" data-act="h-teaser"><div class="row sp"><b>🎲 Denkaufgabe des Tages</b><small>Tippen für Lösung</small></div><p style="margin-top:6px">${esc(teaser.q)}</p><p class="ok teaser-a" hidden>${esc(teaser.a)}</p></div>
    <div class="sec-title"><h2>Der ganze Tag</h2><a href="#/plan">Plan</a></div>
    ${timeline(plan)}
    <div class="btns"><button class="btn" data-act="h-oversleep">😴 Verschlafen</button><button class="btn" data-act="h-evening">🌙 Abendcheck</button></div>`;
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
  toast('Guten Morgen. Der Tag läuft.', { kind: 'good' });
};
ACT['h-oversleep'] = () => {
  const d = nowDate();
  const val = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  modal(
    `<h2>😴 Verschlafen</h2><p class="muted">Wann bist du wirklich aufgestanden? Der Rest des Tages verschiebt sich.</p>
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
ACT['h-start'] = (el) => {
  A.startBlock(today(), el.dataset.id);
};
ACT['h-done'] = (el) => {
  const b = blockById(el.dataset.id);
  if (!b) return;
  if (b.kind === 'read') {
    const book = A.currentBook();
    modal(
      `<h2>📖 Wie viele Seiten?</h2><p class="muted">${book ? esc(book.title) + ' (Seite ' + (book.page || 0) + ')' : 'Kein Buch angelegt. Du kannst eins unter Lernen > Bücher hinzufügen.'}</p>
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
  if (!b) return;
  const D = store.getDay(today());
  A.setCancelled(today(), [...(D.cancelled || []), ...b.periods.length ? Array.from({ length: b.periods[1] - b.periods[0] + 1 }, (_, i) => b.periods[0] + i) : []]);
  toast('Ausfall eingetragen. Neue Vorschläge unter Plan.', { kind: 'good', actions: [{ label: 'Zum Plan', run: () => go('#/plan?day=' + today()) }] });
};
ACT['h-focus'] = () => {
  const S = store.getSettings();
  if (isIOS()) location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(S.focusShortcut)}`;
  else {
    modal(`<h2>🎯 Fokus</h2><p>Auf iPhone startet dieser Button deinen Kurzbefehl "${esc(S.focusShortcut)}". Auf Mac und PC hilft ein Website-Blocker (z. B. Fokus-Modus im System, Cold Turkey oder die Bildschirmzeit am Mac). Handy weg, Tabs zu.</p><div class="btns"><button class="btn primary" data-close>Okay</button></div>`);
  }
};
ACT['h-swap'] = () => {
  const plan = A.planFor(today());
  const cand = plan.blocks.filter((b) => !b.fixed && b.status === 'pending' && b.id !== plan.current?.id && b.kind !== 'bock');
  modal(`<h2>🔀 Was zuerst?</h2><p class="muted">Du darfst tauschen. Am Ende muss alles Wichtige trotzdem erledigt sein.</p>
    ${cand.map((b) => `<button class="opt" data-pick="${esc(b.kind)}" data-bid="${esc(b.id)}">${b.icon || ''} ${esc(b.title)} <small>· ${fmtDur(b.dur)}</small></button>`).join('') || '<div class="empty">Nichts anderes offen.</div>'}`,
    { onMount: (m, close) => m.addEventListener('click', (e) => { const o = e.target.closest('[data-pick]'); if (o) { A.chooseBock(today(), o.dataset.pick, o.dataset.bid); close(); } }) });
};
ACT['h-water'] = (el) => {
  A.addWater(today(), Number(el.dataset.ml));
};
ACT['h-teaser'] = (el) => {
  const a = el.querySelector('.teaser-a');
  if (a) a.hidden = !a.hidden;
};
ACT['h-streak'] = () => {
  A.trackUsage('streak');
  const meta = store.getMeta();
  const days = store.allDays();
  const best = disc.bestStreak(days, today(), meta);
  modal(`<h2>🔥 Streak</h2><p>Ein Tag zählt, sobald du mindestens <b>${disc.STREAK_MIN} Minuten</b> gelernt hast. Aktuell: <b>${A.streakNow()}</b>. Rekord: <b>${best}</b>.</p>
    <p class="muted" style="margin-top:8px">Kein Tag fällt ohne Grund aus. Ohne Lernzeit und ohne akzeptable Begründung am gleichen Tag reißt die Kette. Danach holst du mit drei Lektionen die Hälfte zurück.</p><div class="btns"><a class="btn primary" href="#/woche" data-close>Zum Wochenrückblick</a></div>`);
};
ACT['h-points'] = () => {
  A.trackUsage('points');
  const meta = store.getMeta();
  const S = store.getSettings();
  const l = disc.levelProgress(meta.points);
  modal(`<h2>⭐ Punkte und Level</h2><p>${meta.points} Punkte. Level ${l.level}${S.mechanics.titles ? ' · ' + disc.titleFor(l.level) : ''}.</p>${bar(l.frac)}<small>${l.into} / ${l.need} bis Level ${l.level + 1}</small>
    <hr><h3>Zuletzt</h3>${meta.pointsLog.slice(-8).reverse().map((p) => `<div class="list-item"><div class="grow">${esc(p.why)}</div><b>+${p.n}</b></div>`).join('') || '<div class="empty">Noch nichts.</div>'}`);
};
ACT['h-goals'] = () => {
  A.trackUsage('goals');
  const st = A.statsFor(today());
  modal(`<h2>Tagesziele</h2>${st.goals.map((g) => `<div class="list-item"><span style="font-size:22px">${g.icon}</span><div class="grow"><b>${g.label}</b><br><small>${g.text}</small></div>${g.frac >= 1 ? '✅' : ''}</div>`).join('')}`);
};
