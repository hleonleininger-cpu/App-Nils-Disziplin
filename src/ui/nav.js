export const ACT = {}; // Aktions-Handler: data-act="name"
export const go = (hash) => {
  if (location.hash === hash) refresh();
  else location.hash = hash;
};
let refreshFn = () => {};
export const setRefresh = (f) => (refreshFn = f);
export const refresh = () => refreshFn();
export function hashParams() {
  const q = location.hash.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(q));
}
