// Maskottchen "Funke": die Streak-Flamme mit Gesicht. Stimmung wechselt mit dem Zustand.
const MOUTHS = {
  happy: '<path d="M25 47 Q32 54 39 47" stroke="#3a1200" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  fire: '<path d="M24 45 Q32 60 40 45 Z" fill="#3a1200"/>',
  sad: '<path d="M26 52 Q32 45 38 52" stroke="#3a1200" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  sleepy: '<path d="M27 50 L37 50" stroke="#3a1200" stroke-width="2.4" stroke-linecap="round"/>',
  angry: '<path d="M26 50 Q32 46 38 50" stroke="#3a1200" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
};
export function mascot(mood = 'happy', size = 64, extra = '') {
  const eyes =
    mood === 'sleepy'
      ? '<path d="M20 37 Q24 40 28 37" stroke="#3a1200" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M36 37 Q40 40 44 37" stroke="#3a1200" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      : mood === 'angry'
        ? '<circle cx="24" cy="38" r="4.4" fill="#fff"/><circle cx="40" cy="38" r="4.4" fill="#fff"/><circle cx="25" cy="39" r="2.2" fill="#3a1200"/><circle cx="39" cy="39" r="2.2" fill="#3a1200"/><path d="M18 31 L29 35 M46 31 L35 35" stroke="#3a1200" stroke-width="2.6" stroke-linecap="round"/>'
        : '<circle cx="24" cy="38" r="5" fill="#fff"/><circle cx="40" cy="38" r="5" fill="#fff"/><circle cx="25" cy="39" r="2.6" fill="#3a1200"/><circle cx="41" cy="39" r="2.6" fill="#3a1200"/><circle cx="26" cy="38" r=".9" fill="#fff"/><circle cx="42" cy="38" r=".9" fill="#fff"/>';
  return `<svg class="mascot ${mood} ${extra}" viewBox="0 0 64 72" width="${size}" height="${size * 1.125}" aria-hidden="true">
  <defs><linearGradient id="flg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE066"/><stop offset=".5" stop-color="#FF9A1F"/><stop offset="1" stop-color="#FF3D5A"/></linearGradient></defs>
  <path d="M32 2 C37 15 55 23 55 45 C55 60 45 70 32 70 C19 70 9 60 9 45 C9 35 15 29 19 23 C20 31 25 33 28 31 C26 21 28 11 32 2 Z" fill="url(#flg)"/>
  <path d="M32 30 C36 38 44 42 44 54 C44 62 38 68 32 68 C26 68 20 62 20 54 C20 46 28 40 32 30 Z" fill="#FFD76A" opacity=".5"/>
  ${eyes}${MOUTHS[mood] || MOUTHS.happy}
  </svg>`;
}
