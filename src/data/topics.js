export const DEFAULT_TOPICS = [
  { id: 'finanzen', name: 'Finanzen & Wirtschaft', icon: 'coins', color: '#F5B800', hint: 'Zinsen, Marge, Chefwissen für Euro Wellness', future: true },
  { id: 'investieren', name: 'Investieren', icon: 'trend', color: '#19C37D', hint: 'ETFs, Risiko, Zeithorizont', future: true },
  { id: 'programmieren', name: 'Programmieren', icon: 'code', color: '#2FA8FF', hint: 'Denken wie ein Entwickler' },
  { id: 'gespraech', name: 'Verhandeln & Gesprächsführung', icon: 'chat', color: '#FF8A3D', hint: 'Fragen stellen, aktiv zuhören' },
  { id: 'mentalist', name: 'Menschen lesen', icon: 'eye', color: '#B15CFF', hint: 'Körpersprache und Mikroausdrücke, ehrlich eingeordnet' },
  { id: 'sherlock', name: 'Sherlock-Denken', icon: 'search', color: '#14B8A6', hint: 'Beobachten, kombinieren, logisch schließen' },
  { id: 'buecher', name: 'Bücher', icon: 'book', color: '#F472B6', hint: 'Aktiv lesen, Notizen, Zitate' },
  { id: 'schule', name: 'Schule', icon: 'cap', color: '#5B8CFF', hint: 'Mathe, Englisch, Deutsch, Informatik, Facharbeit', school: true, future: true },
  { id: 'selbstverteidigung', name: 'Selbstverteidigung', icon: 'shield', color: '#FF4D4D', hint: 'Distanz, Stand, Deeskalation, Recht' },
];
export const topicById = (list, id) => list.find((t) => t.id === id);
