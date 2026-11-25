export const DEFAULT_SETTINGS = {
  name: 'Nils',
  wake: { wk: '07:00', we: '10:00' },
  evening: { wk: '21:30', we: '23:30' },
  weekFlip: false,
  sdMinutes: 15, // Selbstverteidigung: jeden Tag gleich lang (15, 20 oder 30 Minuten)
  hardTone: true,
  sound: false,
  waterGoal: 3000,
  learnTarget: { wk: 45, we: 60 },
  readMinutes: 20,
  project: '',
  sportEarliest: '16:00', // Joggen frühestens ab
  gymEarliest: '19:00', // Gym frühestens ab (immer abends)
  focusShortcut: 'Fokus Disziplin',
  weeklyPages: 120, // Ziel der Wochenherausforderung "Seitenfresser" (leicht änderbar)
  topicDays: { min: 3, max: 10 }, // so lange bleibt ein Thema mindestens/höchstens am Stück dran
  maxExcuses: 1, // akzeptierte Begründungen pro Kalenderwoche
  learnSpeed: 1, // Testwert: 10 = Lernzeit läuft 10x schneller
  mechanics: { streak: true, points: true, titles: true, goals: true, weekly: true, surprise: true },
  // Sport je Wochentag (0 = Mo ... 6 = So)
  sport: {
    0: { type: 'handball', start: '18:30', end: '20:15' },
    1: { type: 'gym' },
    2: { type: 'jog' },
    3: { type: 'gym' },
    4: { type: 'handball', start: '18:00', end: '20:00' },
    5: { type: 'jog' },
    6: { type: 'gym' },
  },
  sportDur: { gym: 75, jog: 45 },
};

export const DEFAULT_META = {
  startDate: null,
  points: 0,
  pointsLog: [],
  recovery: null, // { missDate, prevStreak, need, done, until }
  restores: {}, // missDate -> Wert, der zur Streak addiert wird
  comps: {}, // Datum -> { freeMinus, extraPages }
  alerts: [], // { id, type, ...}
  usage: {}, // Mechanik -> Zähler
  carry: [], // { id, kind, min, from }
  claimed: {}, // Wochen-Herausforderung -> true
  lastProcessed: null,
  onboarded: false,
};

export const DEFAULT_LEARN = {
  topics: {}, // id -> Fortschritt
  plan: {}, // Datum -> topicId
  current: null,
};

export const MECHANICS = [
  { id: 'streak', name: 'Streak', desc: 'Flamme und Kette über aufeinanderfolgende Tage' },
  { id: 'points', name: 'Punkte und Level', desc: 'Punkte für jede Aufgabe, Level steigen' },
  { id: 'titles', name: 'Titel und Ränge', desc: 'Vom Rekruten zur Legende' },
  { id: 'goals', name: 'Tagesziele', desc: 'Sechs Ziele pro Tag mit Ring' },
  { id: 'weekly', name: 'Wochenherausforderung', desc: 'Jede Woche eine Extra-Aufgabe mit Bonus' },
  { id: 'surprise', name: 'Überraschungsbelohnungen', desc: 'Zufällige Boni nach erledigten Aufgaben' },
];
