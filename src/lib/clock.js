// Uhr mit Test-Offset, damit Nils (und ich) beliebige Tage und Uhrzeiten simulieren können.
import { ymd } from './dates.js';

let offsetMs = 0;
try {
  offsetMs = Number(localStorage.getItem('disziplin.clockOffset') || 0) || 0;
} catch {}

export function nowDate() {
  return new Date(Date.now() + offsetMs);
}
export function nowTs() {
  return Date.now() + offsetMs;
}
export function todayStr() {
  return ymd(nowDate());
}
export function nowMin() {
  const d = nowDate();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}
export function getOffset() {
  return offsetMs;
}
export function setSimulated(dateStr, hhmm) {
  // dateStr = YYYY-MM-DD, hhmm = "HH:MM"
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const target = new Date(y, m - 1, d, h, mi, 0).getTime();
  offsetMs = target - Date.now();
  try {
    localStorage.setItem('disziplin.clockOffset', String(offsetMs));
  } catch {}
}
export function resetClock() {
  offsetMs = 0;
  try {
    localStorage.removeItem('disziplin.clockOffset');
  } catch {}
}
export function isSimulated() {
  return Math.abs(offsetMs) > 60000;
}
