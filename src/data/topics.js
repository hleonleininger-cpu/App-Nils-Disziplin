export const DEFAULT_TOPICS = [
  { id: 'finanzen', name: 'Finanzen & Wirtschaft', emoji: '💶', color: '#F5B800', hint: 'Zinsen, Marge, Chefwissen für Euro Wellness' },
  { id: 'investieren', name: 'Investieren', emoji: '📈', color: '#19C37D', hint: 'ETFs, Risiko, Zeithorizont' },
  { id: 'programmieren', name: 'Programmieren', emoji: '💻', color: '#2FA8FF', hint: 'Denken wie ein Entwickler' },
  { id: 'gespraech', name: 'Verhandeln & Gesprächsführung', emoji: '🗣️', color: '#FF8A3D', hint: 'Fragen stellen, aktiv zuhören' },
  { id: 'mentalist', name: 'Menschen lesen', emoji: '🧿', color: '#B15CFF', hint: 'Körpersprache und Mikroausdrücke, ehrlich eingeordnet' },
  { id: 'sherlock', name: 'Sherlock-Denken', emoji: '🔍', color: '#14B8A6', hint: 'Beobachten, kombinieren, logisch schließen' },
  { id: 'buecher', name: 'Bücher', emoji: '📚', color: '#F472B6', hint: 'Aktiv lesen, Notizen, Zitate' },
  { id: 'schule', name: 'Schule', emoji: '🎓', color: '#5B8CFF', hint: 'Mathe, Englisch, Deutsch, Informatik, Facharbeit', school: true },
  { id: 'selbstverteidigung', name: 'Selbstverteidigung', emoji: '🥋', color: '#FF4D4D', hint: 'Distanz, Stand, Deeskalation, Recht' },
];
export const topicById = (list, id) => list.find((t) => t.id === id);
