// Mini-Eventbus: Aktionen melden Ereignisse (Feier, Hinweise), die UI zeigt sie an.
const subs = {};
export const on = (ev, fn) => ((subs[ev] ||= new Set()).add(fn), () => subs[ev].delete(fn));
export const emit = (ev, payload) => (subs[ev] || []).forEach((f) => f(payload));
