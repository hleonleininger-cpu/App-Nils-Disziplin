export const VATERUNSER = [
  'Vater unser im Himmel,',
  'geheiligt werde dein Name.',
  'Dein Reich komme.',
  'Dein Wille geschehe,',
  'wie im Himmel, so auf Erden.',
  'Unser tägliches Brot gib uns heute.',
  'Und vergib uns unsere Schuld,',
  'wie auch wir vergeben unseren Schuldigern.',
  'Und führe uns nicht in Versuchung,',
  'sondern erlöse uns von dem Bösen.',
  'Denn dein ist das Reich und die Kraft',
  'und die Herrlichkeit in Ewigkeit.',
  'Amen.',
];

export const MOTTOS = [
  'Disziplin schlägt Motivation.',
  'Du musst nicht wollen. Du musst anfangen.',
  'Aufgaben zuerst. Freizeit ist die Belohnung.',
  'Müde zählt nicht. Anfangen schon.',
  'Dein zukünftiges Ich zahlt, was du heute aufschiebst.',
  'Gewohnheit schlägt Willenskraft.',
  'Jeder Tag ist ein Beleg. Was belegt der heutige?',
  'Gute Absichten ändern nichts. Erledigte Aufgaben schon.',
  'Wer Ausreden sucht, findet welche.',
  'Ein verlorener Tag ist nicht verhandelbar.',
  'Leistung kommt aus Wiederholung.',
  'Fünf Minuten sind der Mindestpreis. Zahl ihn.',
  'Erst arbeiten, dann ausruhen.',
  'Später ist ein Ort, an dem nichts passiert.',
  'Aufschieben ist Zinsen zahlen.',
  'Wissen ist Zinseszins im Kopf.',
  'Heute entscheidet, wer du in einem Jahr bist.',
  'Der Plan steht. Führ ihn aus.',
  'Nicht diskutieren. Erledigen.',
  'Kein Druck, kein Diamant. Los.',
  'Wer nicht liefert, hat keinen Anspruch auf Freizeit.',
  'Ein Tag, an dem du nichts tust, kostet dich zwei.',
  'Mach es jetzt, so lange es noch klein ist.',
  'Kleine Pflichten, jeden Tag, sind der Unterschied.',
  'Dein Streak ist nur so stark wie der heutige Tag.',
];

export const FORMATS_OF_DAY = [
  { id: 'cards', name: 'Karteikarten-Tag', hint: 'Heute viele Karten, wenig Text.' },
  { id: 'quiz', name: 'Quiz-Tag', hint: 'Heute schnelle Fragen mit Auswahl.' },
  { id: 'teach', name: 'Erklär-Tag', hint: 'Heute erklärst du es einem Freund.' },
  { id: 'detective', name: 'Detektiv-Tag', hint: 'Heute wird kombiniert.' },
  { id: 'scenario', name: 'Szenario-Tag', hint: 'Heute: Was würdest du tun?' },
  { id: 'voice', name: 'Mündlicher Tag', hint: 'Heute antwortest du laut.' },
];

export const SURPRISES = [
  { type: 'points', text: 'Bonus-Runde: doppelte Punkte für die letzte Aufgabe.', points: 15 },
  { type: 'points', text: 'Kleine Belohnung vom Haus.', points: 10 },
  { type: 'points', text: 'Goldener Moment. Das war stark.', points: 25 },
  { type: 'points', text: 'Sauber durchgezogen. Das war Arbeit.', points: 12 },
  { type: 'fact', text: 'Wusstest du: Wer eine Gewohnheit 66 Tage durchzieht, hat sie im Schnitt automatisiert. Streuung ist groß, von 18 bis 254 Tagen (Lally et al., 2009).' },
  { type: 'fact', text: 'Schlaf festigt Gelerntes. Wer abends lernt und gut schläft, behält mehr.' },
  { type: 'fact', text: 'Wiederholen in Abständen schlägt Pauken am Stück. Genau deshalb fragt die App abends nach.' },
  { type: 'quote', text: 'Ein Tag ohne Lernen ist kein Weltuntergang. Zwei hintereinander sind der Anfang vom Ende der Gewohnheit.' },
];

export const NEXT_STEP_HARD = [
  'Nächster Schritt: Fang jetzt mit 5 Minuten an.',
  'Nächster Schritt: Eine Lektion. Jetzt. Mehr nicht.',
  'Nächster Schritt: Handy weg, Lektion auf.',
];

export const PROMPT_TEMPLATE = (topicName, packSpec) => `Recherchiere das Thema "${topicName}" für Nils (Schüler, bald 18, Q1, Dortmund; Ziele: Finanzbranche, später Geschäftsführung im Fachhandel für Schwimmbad und Sauna).

REGELN FÜR QUELLEN (zwingend)
1. Jede Aussage hat eine Quelle. Erlaubt sind: Gesetze mit Paragraph (zum Beispiel "BGB § 488"), Fachbücher mit Autor und Ausgabe (zum Beispiel "Autor, Titel, 3. Auflage, Verlag, Jahr") und offizielle Seiten (Bundesbank, EZB, Bundesregierung, Statistisches Bundesamt, Behörden, Hochschulen).
2. Keine Blogs ohne Autor, keine Foren, keine Content-Seiten ohne Autor oder Datum.
3. Was sich nicht belegen lässt, wird nicht als Tatsache geschrieben. Markiere es mit "uncertain": true an der Stelle (explain, terms, flashcards, quiz, questions) und trage die Aussage zusätzlich in die Liste "uncertain" des Pakets ein. Erfinde keine Quellen, Paragraphen oder Zahlen. Wenn du etwas nicht sicher weißt, sag es.
4. Das Feld "sources" ist Pflicht und darf nie leer sein. Die App lehnt ein Paket ohne echte Quellen ab. Ordne jedem Erklärabschnitt in "refs" die passenden Quellentitel zu.
5. Ist etwas umstritten, schreib das dazu.
6. Menschen lesen, Gesprächsführung, Gentleman, Rhetorik und Charme nur als ehrliche Kommunikation: Zuhören, gute Fragen, Körpersprache einordnen. Keine Anleitungen zum Manipulieren oder Täuschen.

AUFBAU
- Liefere ein einziges JSON-Objekt, ohne Text davor oder danach und ohne Code-Zaun.
- Kurze, klare Sätze. Beispiele aus dem Alltag eines Schülers.
- Das Feld "practice" (Praxisaufgabe, eine Alltagsaufgabe für heute mit Vorgehen und Erfolgskontrolle) ist Pflicht.
- Das Paket wird in der App genau so übernommen, wie du es lieferst. Prüfe vor der Ausgabe, dass das JSON vollständig ist (alle Klammern geschlossen).

FORMAT
${packSpec}`;

export const DAILY_TEASERS = [
  { q: 'Ein Schläger und ein Ball kosten zusammen 1,10 €. Der Schläger kostet 1 € mehr als der Ball. Was kostet der Ball?', a: '5 Cent. (Schläger 1,05 €, zusammen 1,10 €.)' },
  { q: 'Fünf Maschinen brauchen 5 Minuten für 5 Teile. Wie lange brauchen 100 Maschinen für 100 Teile?', a: '5 Minuten. Jede Maschine macht ein Teil in 5 Minuten.' },
  { q: 'Seerosen verdoppeln täglich ihre Fläche. Nach 48 Tagen ist der See voll. Wann war er halb voll?', a: 'An Tag 47. Exponentielles Wachstum fühlt sich lange harmlos an.' },
  { q: 'Du überholst beim Rennen den Zweiten. Auf welchem Platz bist du jetzt?', a: 'Auf dem zweiten Platz.' },
  { q: 'Ein Vater ist 30 Jahre älter als sein Sohn. In 5 Jahren ist er dreimal so alt. Wie alt sind beide jetzt?', a: 'Sohn 10, Vater 40. (In 5 Jahren: 15 und 45.)' },
  { q: 'Kopfrechnen: Wie viel sind 15 % von 80?', a: '12. (10 % = 8, 5 % = 4.)' },
  { q: 'Was wird nasser, je mehr es trocknet?', a: 'Ein Handtuch.' },
  { q: 'Bei 7 % Zinseszins: Wie lange dauert es ungefähr, bis sich Geld verdoppelt?', a: 'Rund 10 Jahre (Rule of 72: 72 / 7).' },
  { q: 'Wie viele Monate haben 28 Tage?', a: 'Alle zwölf.' },
  { q: 'Zwei Münzen ergeben zusammen 30 Cent. Eine davon ist kein 10-Cent-Stück. Welche sind es?', a: '20 Cent und 10 Cent. Nur eine ist kein 10-Cent-Stück.' },
  { q: 'Wie geht die Reihe weiter? 2, 6, 12, 20, 30, ?', a: '42. Die Zahlen sind n · (n+1).' },
  { q: 'Wenn du mich hast, willst du mich teilen. Wenn du mich teilst, hast du mich nicht mehr. Was bin ich?', a: 'Ein Geheimnis.' },
  { q: 'Du hast 3 Streichhölzer und eine Kerze, eine Öllampe und einen Ofen im dunklen Raum. Was zündest du zuerst an?', a: 'Das Streichholz.' },
];
export const DAY_COLORS = ['#ff7a1a', '#2fa8ff', '#19c37d', '#b15cff', '#ff4d6d', '#f5b800', '#14b8a6'];
