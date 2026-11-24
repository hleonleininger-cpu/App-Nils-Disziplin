import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import * as disc from '../engine/discipline.js';
import { MECHANICS } from '../core/defaults.js';
import { todayStr } from '../lib/clock.js';
import { addDays, shortDate, WD_SHORT, mondayOf, isoWeek, weekType } from '../lib/dates.js';
import { esc } from '../lib/util.js';
import { pageHead, bar } from './components.js';
import { ACT, refresh } from './nav.js';
import { plural } from './heute.js';

let sel = null;

function spark(series) {
  const max = Math.max(5, ...series.map((s) => s.value));
  const w = 300, h = 70;
  const pts = series.map((s, i) => `${(i / (series.length - 1)) * w},${h - 6 - (s.value / max) * (h - 14)}`);
  const miss = series.map((s, i) => (s.status === 'missed' ? `<circle cx="${(i / (series.length - 1)) * w}" cy="${h - 6}" r="3.5" fill="#ff4d6d"/>` : '')).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts.join(' ')}" fill="none" stroke="#ff9a1f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${miss}</svg>`;
}

export default {
  route: 'woche',
  live: true,
  render() {
    const today = todayStr();
    sel = sel || mondayOf(today);
    const S = store.getSettings();
    const meta = store.getMeta();
    const days = disc.weekDates(sel);
    const rows = days.map((d) => {
      const future = d > today;
      const stat = future ? null : A.statsFor(d);
      const D = store.getDay(d);
      return { d, future, stat, D, status: disc.dayStatus(D, d, today, meta), learn: stat ? stat.learnMin : 0 };
    });
    const past = rows.filter((r) => !r.future && r.d >= (meta.startDate || '0000'));
    const n = past.length || 1;
    const maxL = Math.max(30, ...rows.map((r) => r.learn));
    const sum = (f) => past.reduce((a, r) => a + f(r), 0);
    const learnTot = sum((r) => r.learn);
    const learnDays = past.filter((r) => r.status === 'done').length;
    const waterDays = past.filter((r) => r.stat.goals.find((g) => g.id === 'water').frac >= 1).length;
    const sportDays = past.filter((r) => r.stat.sport).length;
    const sdDays = past.filter((r) => r.stat.sd).length;
    const pages = sum((r) => r.stat.pages);
    const freeUsed = sum((r) => (r.D.freeLog || []).reduce((a, b) => a + b.min, 0));
    const pts = sum((r) => r.D.points || 0);
    const evenings = past.filter((r) => r.D.evening?.done).length;
    const missed = past.filter((r) => r.status === 'missed').length;
    const verdicts = [];
    const v = (cls, t) => verdicts.push(`<div class="verdict ${cls}">${t}</div>`);
    if (past.length) {
      v(learnDays >= n - 0 ? 'good' : learnDays >= n * 0.7 ? 'mid' : 'bad', `Lernen: ${learnDays} von ${n} Tagen geschafft, ${Math.round(learnTot)} Minuten insgesamt, im Schnitt ${Math.round(learnTot / n)} pro Tag.${missed ? ` ${missed} Tag${missed > 1 ? 'e' : ''} komplett ausgefallen.` : ''}`);
      v(waterDays >= n * 0.8 ? 'good' : waterDays >= n * 0.5 ? 'mid' : 'bad', `Wasser: Ziel an ${waterDays} von ${n} Tagen. ${waterDays < n * 0.5 ? 'Das ist schwach.' : ''}`);
      v(sportDays >= n * 0.9 ? 'good' : sportDays >= n * 0.6 ? 'mid' : 'bad', `Sport: ${sportDays} von ${n} Tagen. Selbstverteidigung: ${sdDays} von ${n}.`);
      v(evenings >= n * 0.8 ? 'good' : 'mid', `Abendcheck: ${evenings} von ${n} Tagen.`);
      v('mid', `Freizeit genommen: ${freeUsed} Minuten. Gelesen: ${pages} Seiten.`);
    }
    const best = [...past].sort((a, b) => b.learn - a.learn)[0];
    const ch = A.weekChallengeState(sel);
    const series = disc.streakSeries(store.allDays(), today, meta, 28);
    const usage = meta.usage;
    const wk = isoWeek(sel);
    return `${pageHead('Woche', `KW ${wk.week} · ${shortDate(sel)} – ${shortDate(addDays(sel, 6))} · Woche ${weekType(sel, S.weekFlip)}`)}
    <div class="row sp"><button class="btn sm" data-act="w-nav" data-d="-7">‹ zurück</button><button class="btn sm" data-act="w-nav" data-d="0">Diese Woche</button><button class="btn sm" data-act="w-nav" data-d="7">weiter ›</button></div>
    <div class="card"><b>Lernzeit pro Tag</b><div class="bars">${rows.map((r) => `<div class="b ${r.future ? 'open' : r.status === 'missed' ? 'miss' : r.status === 'excused' ? 'exc' : r.status === 'open' ? 'open' : ''}"><span>${Math.round(r.learn) || ''}</span><i style="height:${Math.max(4, (r.learn / maxL) * 90)}%"></i><span>${WD_SHORT[days.indexOf(r.d)]}</span></div>`).join('')}</div>
      <small>Rot = Tag verloren · Blau = Begründung angenommen · Streak zählt ab ${disc.STREAK_MIN} Min.</small></div>
    ${S.mechanics.streak ? `<div class="card"><div class="row sp"><b>Streak-Verlauf (28 Tage)</b><small>jetzt ${A.streakNow()} · Rekord ${disc.bestStreak(store.allDays(), today, meta)}</small></div>${spark(series)}</div>` : ''}
    ${S.mechanics.weekly ? `<div class="card"><div class="row sp"><b>Wochenherausforderung</b>${ch.claimed ? '<span class="chip" style="--c:#19c37d">Abgeholt</span>' : ''}</div><p style="margin:6px 0"><b>${ch.ch.title}</b>: ${ch.ch.desc}</p>${bar(ch.value / ch.ch.target, '#ffd54a')}<small>${ch.value} / ${ch.ch.target} ${ch.ch.unit}</small>${ch.done && !ch.claimed ? `<div class="btns"><button class="btn primary" data-act="w-claim" data-mon="${ch.mon}">+${disc.POINTS.weeklyChallenge} Punkte abholen</button></div>` : ''}</div>` : ''}
    <div class="sec-title"><h2>Ehrliche Zahlen</h2></div>
    ${verdicts.join('') || '<div class="empty">Diese Woche hat noch nicht begonnen.</div>'}
    ${best && best.learn > 0 ? `<div class="verdict good">Was gut lief: ${WD_SHORT[days.indexOf(best.d)]} mit ${Math.round(best.learn)} Minuten Lernzeit${pts ? `, insgesamt +${pts} Punkte diese Woche` : ''}.</div>` : ''}
    <div class="card"><b>Motivation: was nutzt du wirklich?</b><p class="muted" style="margin:4px 0 8px">Jede Mechanik kannst du in den Einstellungen an- und ausschalten. Hier siehst du, womit du dich beschäftigst.</p>
      ${MECHANICS.map((m) => `<div class="list-item"><div class="grow"><b>${m.name}</b><br><small>${S.mechanics[m.id] ? 'an' : 'aus'}</small></div><small>${plural(usage['seen:' + m.id] || 0, 'Tag', 'Tage')} sichtbar · ${usage[m.id] || 0}× angetippt</small></div>`).join('')}
      <small>Dazu: Wahl nach der Schule: ${['learn', 'read', 'free'].map((k) => `${{ learn: 'Lernen', read: 'Lesen', free: 'Freizeit' }[k]} ${usage['choice:' + k] || 0}×`).join(', ')}</small></div>`;
  },
};
ACT['w-nav'] = (el) => {
  const d = Number(el.dataset.d);
  sel = d === 0 ? mondayOf(todayStr()) : addDays(sel, d);
  refresh();
};
ACT['w-claim'] = (el) => {
  A.claimChallenge(el.dataset.mon);
};
