import * as store from '../core/store.js';
import * as A from '../core/actions.js';
import { PERIODS, subjectName } from '../data/timetable.js';
import { todayStr, nowMin } from '../lib/clock.js';
import { addDays, fmt, fmtDur, isoWeek, mondayOf, niceDate, weekType, weekdayIdx, WD_SHORT, parseYmd, hm } from '../lib/dates.js';
import { esc } from '../lib/util.js';
import { pageHead } from './components.js';
import { ACT, go, hashParams, refresh } from './nav.js';
import { toast } from './fx.js';

let sel = null;

export default {
  route: 'plan',
  live: true,
  render() {
    const today = todayStr();
    const p = hashParams();
    if (p.day) sel = p.day;
    sel = sel || today;
    const S = store.getSettings();
    const mon = mondayOf(sel);
    const wt = weekType(sel, S.weekFlip);
    const kw = isoWeek(sel).week;
    const plan = A.planFor(sel);
    const D = store.getDay(sel);
    const wd = weekdayIdx(sel);
    const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    return `${pageHead('Plan', `Woche ${wt} · KW ${kw}`)}
    <div class="row sp"><button class="btn sm" data-act="p-week" data-d="-7">‹ Woche</button><span class="badge">Woche ${wt}</span><button class="btn sm" data-act="p-week" data-d="7">Woche ›</button></div>
    <div class="days" style="margin-top:10px">${days.map((d, i) => `<div class="dtab ${d === sel ? 'on' : ''} ${d === today ? 'today' : ''}" data-act="p-day" data-d="${d}">${WD_SHORT[i]}<small>${parseYmd(d).getDate()}.</small></div>`).join('')}</div>
    <div class="card"><div class="row sp"><b>${niceDate(sel)}</b><small>${plan.weekend ? 'Wochenende' : plan.noSchool ? 'Kein Unterricht' : `Schule bis ${fmt(plan.schoolEnd)}`}</small></div>
      <div class="tl">${plan.blocks.filter((b) => b.kind !== 'bock' && b.dur > 0 && b.status !== 'skipped').map((b) => `<div class="tl-item ${b.status === 'done' || b.status === 'slept' ? 'done' : ''}" style="--c:${b.color}"><div class="t">${fmt(b.start)}</div><div class="n">${b.icon || ''} ${esc(b.title)}<small>${fmtDur(b.dur)}${b.sub ? ' · ' + esc(b.sub) : ''}</small></div><div class="st">${b.status === 'done' ? '✅' : b.status === 'missed' ? '❌' : b.status === 'slept' ? '😴' : ''}</div></div>`).join('')}</div>
      ${plan.overflow.length ? `<p class="warn">Passt heute nicht mehr: ${plan.overflow.map((o) => esc(o.title)).join(', ')}. Wird auf die nächsten Tage verteilt.</p>` : ''}</div>
    ${wd <= 4 ? cancelPanel(sel, plan, D) : ''}
    <div class="card tight"><small>Der Stundenplan ist bearbeitbar unter Mehr > Stundenplan. Wochentyp A/B richtet sich automatisch nach der Kalenderwoche.</small></div>`;
  },
};

function cancelPanel(date, plan, D) {
  const cancelled = new Set(D.cancelled || []);
  const any = plan.periods.some((p) => p.cell);
  if (!any) return '';
  return `<div class="sec-title"><h2>Ausfall eintragen</h2></div>
    <div class="card"><p class="muted" style="margin-bottom:10px">Tippe die Stunden an, die ausfallen. Die App schlägt sofort vor, was in die Lücke passt.</p>
    <div class="per">${plan.periods.map((p) => `<label><input type="checkbox" data-chg="p-cancel" data-p="${p.p}" ${cancelled.has(p.p) ? 'checked' : ''} ${p.cell ? '' : 'disabled'}>${p.p}. Std<small>${fmt(PERIODS[p.p - 1][0])}</small><small>${p.cell ? esc(subjectName(p.cell)).slice(0, 10) : 'frei'}</small></label>`).join('')}</div>
    ${plan.windows.length ? plan.windows.map((w) => `<div class="sugg"><b>${w.source === 'ausfall' ? '❌ Ausfall' : '🕐 Freistunde'} · ${fmt(w.start)}–${fmt(w.end)} (${w.minutes} Min)</b>
      <p class="muted" style="margin:4px 0 8px">Was passt rein? Freizeit zählt gegen dein Tageslimit (noch ${plan.free.remaining} Min).</p>
      <div class="pill-row">${w.options.map((o) => `<span class="pill ${w.kind === o.kind ? 'on' : ''}" data-act="p-assign" data-key="${w.key}" data-kind="${o.kind}" title="${esc(o.reason)}">${o.kind === 'learn' ? '📚' : o.kind === 'sport' ? '💪' : o.kind === 'sd' ? '🥊' : o.kind === 'read' ? '📖' : '🎮'} ${esc(o.label)}</span>`).join('')}</div>
      ${w.options.find((o) => o.kind === 'sport') ? `<p class="ok" style="margin-top:8px">Vorschlag: ${esc(w.options.find((o) => o.kind === 'sport').reason)}. Dann bleibt der Nachmittag frei.</p>` : ''}</div>`).join('') : ''}
    ${plan.windows.length === 0 && cancelled.size ? `<p class="muted" style="margin-top:10px">Die ausgefallenen Stunden liegen am Ende des Tages: Schulschluss ist jetzt ${fmt(plan.schoolEnd ?? plan.morningEnd)}. Der Nachmittag beginnt früher.</p>` : ''}</div>`;
}

ACT['p-day'] = (el) => {
  sel = el.dataset.d;
  location.hash = '#/plan';
  refresh();
};
ACT['p-week'] = (el) => {
  sel = addDays(sel || todayStr(), Number(el.dataset.d));
  refresh();
};
ACT['p-assign'] = (el) => A.assignWindow(sel, el.dataset.key, el.dataset.kind);
export function onChange(el) {
  if (el.dataset.chg === 'p-cancel') {
    const D = store.getDay(sel);
    const set = new Set(D.cancelled || []);
    const n = Number(el.dataset.p);
    el.checked ? set.add(n) : set.delete(n);
    A.setCancelled(sel, [...set]);
    if (el.checked) toast('Ausfall eingetragen. Schau dir die Vorschläge an.', { kind: 'good' });
  }
}
