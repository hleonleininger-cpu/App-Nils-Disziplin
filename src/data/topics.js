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
  { id: 'gentleman', name: 'Gentleman & Charme', icon: 'user', color: '#8E7CF0', hint: 'Auftreten, Körpersprache, Gesprächsführung, Manieren, Selbstvertrauen ohne Show' },
  { id: 'rhetorik', name: 'Rhetorik & freies Sprechen', icon: 'mic', color: '#E4572E', hint: 'Klar und frei sprechen, wichtig für spätere Geschäftsführung' },
  { id: 'selbstorganisation', name: 'Selbstorganisation & Zeitmanagement', icon: 'clock', color: '#4DA3E8', hint: 'Prioritäten, Wochenplanung, Gewohnheiten' },
  { id: 'kleidung', name: 'Kleidung & Stil', icon: 'shirt', color: '#B08968', hint: 'Passform, Anlässe, Grundgarderobe, Pflege' },
];
export const topicById = (list, id) => list.find((t) => t.id === id);
