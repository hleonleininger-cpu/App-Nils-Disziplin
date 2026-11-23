// Zeitraster und Stundenplan (von Nils bestätigt). Alles bearbeitbar im Admin-Bereich.
export const PERIODS = [
  [7 * 60 + 45, 8 * 60 + 30],
  [8 * 60 + 35, 9 * 60 + 20],
  [9 * 60 + 40, 10 * 60 + 25],
  [10 * 60 + 30, 11 * 60 + 15],
  [11 * 60 + 35, 12 * 60 + 20],
  [12 * 60 + 25, 13 * 60 + 10],
  [13 * 60 + 45, 14 * 60 + 30],
  [14 * 60 + 35, 15 * 60 + 20],
];

// Je Wochentag (Mo..Fr) vier Doppelstunden: 1/2, 3/4, 5/6, 7/8. Leerer String = frei.
export const DEFAULT_TIMETABLE = {
  A: [
    ['Sozialwissenschaften Sw_G1', 'Erdkunde Ek_G1', 'Informatik If_G1', 'Physik Ph_G2'],
    ['Pädagogik Pa_G2', 'Sport Sp_L1', 'Mathe M_L1', ''],
    ['Informatik If_G1', 'Sozialwissenschaften Sw_G1', 'Kunst Ku_G1', 'Sport Sp_L1'],
    ['Englisch E_G2', 'Philosophie Pl_G2', 'Physik Ph_G2', 'Erdkunde Ek_G1'],
    ['Mathe M_L1', 'Sport Sp_L1', 'Deutsch D_G3', 'Kunst Ku_G1'],
  ],
  B: [
    ['Deutsch D_G3', 'Erdkunde Ek_G1', '', 'Englisch E_G2'],
    ['Pädagogik Pa_G2', 'Sport Sp_L1', 'Mathe M_L1', ''],
    ['Informatik If_G1', 'Sozialwissenschaften Sw_G1', 'Kunst Ku_G1', 'Mathe M_L1'],
    ['Englisch E_G2', 'Philosophie Pl_G2', 'Physik Ph_G2', 'Pädagogik Pa_G2'],
    ['Mathe M_L1', 'Sport Sp_L1', 'Deutsch D_G3', 'Philosophie Pl_G2'],
  ],
};

export function subjectName(cell) {
  return String(cell || '').replace(/\s+[A-Za-z]{1,3}_[LG]\d+\s*$/, '').trim() || String(cell || '');
}
export function subjectCode(cell) {
  const m = String(cell || '').match(/([A-Za-z]{1,3}_[LG]\d+)\s*$/);
  return m ? m[1] : '';
}
