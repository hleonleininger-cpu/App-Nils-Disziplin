import { esc } from '../lib/util.js';

export function ring(frac, { size = 92, stroke = 10, color = '#FF9A1F', label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.12)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.9,.3,1)"/></svg>
    <div class="ring-c"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
}
export const bar = (frac, color = 'var(--accent)') => `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%;background:${color}"></i></div>`;
export const chip = (text, color = '') => `<span class="chip" ${color ? `style="--c:${color}"` : ''}>${text}</span>`;
export const btn = (label, act, { cls = '', data = {}, id = '' } = {}) =>
  `<button class="btn ${cls}" data-act="${act}" ${id ? `id="${id}"` : ''} ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${label}</button>`;
export const sectionTitle = (t, right = '') => `<div class="sec-title"><h2>${t}</h2>${right}</div>`;
export const empty = (t) => `<div class="empty">${t}</div>`;
export function pageHead(title, sub = '', back = '') {
  return `<div class="page-head">${back ? `<a class="back" href="${back}">‹</a>` : ''}<div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
}
