// Protokolliert einmal pro Tag, welche Motivationsmechaniken sichtbar waren.
import * as store from '../core/store.js';
import { todayStr } from '../lib/clock.js';

export function trackSeen() {
  const today = todayStr();
  const S = store.getSettings();
  const D = store.getDay(today);
  if (D.seenLogged) return;
  store.updateDay(today, (d) => (d.seenLogged = true), { silent: true });
  store.updateMeta((m) => {
    for (const [k, on] of Object.entries(S.mechanics)) if (on) m.usage['seen:' + k] = (m.usage['seen:' + k] || 0) + 1;
  });
}
