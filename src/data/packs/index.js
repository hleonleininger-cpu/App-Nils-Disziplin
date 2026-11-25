// Platzhalter-Inhalte pro Thema. Sie dienen dem Testen der App und sind NICHT quellengeprüft.
// Echte Pakete kommen von Claude über den Import (siehe README, Abschnitt "Inhaltsformat").
import { NEW_PACKS } from './neu.js';
const note = { title: 'Platzhalter-Inhalt von Claude, nicht quellengeprüft' };
const P = (o) => ({ format: 'disziplin-pack/1', level: 1, placeholder: true, sources: [note], ...o });

export const BUILTIN_PACKS = [
  ...NEW_PACKS,
  P({
    id: 'finanzen-zinseszins', topic: 'finanzen', title: 'Zinseszins und Inflation',
    summary: 'Wer Zinsen mitverzinsen lässt, wächst exponentiell. Inflation frisst Kaufkraft. Zusammen erklären sie, warum früh sparen und Geld arbeiten lassen so viel ausmacht.',
    explain: [
      { heading: 'Der Zinseszins-Effekt', text: 'Bleiben Zinsen auf dem Konto, werden sie im nächsten Jahr mitverzinst. Das Endkapital nach n Jahren ist K = K0 · (1 + p)^n. Beispiel: 1.000 € bei 5 % werden nach 10 Jahren zu rund 1.629 €, nach 30 Jahren zu rund 4.322 €.' },
      { heading: 'Zeit schlägt Betrag', text: 'Die Kurve wird erst spät steil. Deshalb zählt jedes Jahr früher mehr als ein höherer Betrag später. Faustregel (Rule of 72): Verdopplungszeit in Jahren ≈ 72 geteilt durch den Zinssatz in Prozent. Bei 6 % also etwa 12 Jahre.' },
      { heading: 'Inflation und Realzins', text: 'Steigen die Preise, kaufst du für denselben Betrag weniger. Der Realzins ist grob Nominalzins minus Inflationsrate. Bei 3 % Zins und 2 % Inflation bleibt etwa 1 % real übrig. Liegt die Inflation über dem Zins, schrumpft die Kaufkraft trotz Zinsen.' },
    ],
    terms: [
      { term: 'Zinseszins', def: 'Zinsen, die selbst wieder verzinst werden.' },
      { term: 'Nominalzins', def: 'Der Zinssatz, der auf dem Papier steht, ohne Inflation.' },
      { term: 'Realzins', def: 'Zins nach Abzug der Inflation, also das, was an Kaufkraft wirklich wächst.' },
      { term: 'Kaufkraft', def: 'Wie viel du für einen Geldbetrag kaufen kannst.' },
      { term: 'Rule of 72', def: 'Faustregel für die Verdopplungszeit: 72 / Zinssatz in %.' },
    ],
    flashcards: [
      { q: 'Formel für das Endkapital mit Zinseszins?', a: 'K = K0 · (1 + p)^n' },
      { q: 'Wie lange dauert eine Verdopplung bei 8 %?', a: 'Rund 9 Jahre (72 / 8).' },
      { q: 'Was ist der Realzins?', a: 'Nominalzins minus Inflationsrate, grob gerechnet.' },
      { q: 'Warum ist früh anfangen so stark?', a: 'Zinsen auf Zinsen wachsen exponentiell, der Effekt kommt spät, braucht also Zeit.' },
    ],
    quiz: [
      { q: '1.000 € werden 2 Jahre mit 10 % verzinst, Zinsen bleiben liegen. Was ist es danach?', options: ['1.200 €', '1.210 €', '1.100 €', '1.220 €'], answer: 1, explain: '1.000 · 1,1 · 1,1 = 1.210 €.' },
      { q: 'Rule of 72: Zinssatz 8 %. Verdopplung nach etwa …', options: ['6 Jahren', '9 Jahren', '12 Jahren', '18 Jahren'], answer: 1, explain: '72 / 8 = 9.' },
      { q: 'Zins 2 %, Inflation 3 %. Was passiert mit der Kaufkraft?', options: ['Sie wächst um 1 %', 'Sie bleibt gleich', 'Sie sinkt um rund 1 %', 'Sie verdoppelt sich'], answer: 2, explain: 'Realzins ≈ 2 % − 3 % = −1 %.' },
    ],
    questions: [
      { q: 'Erkläre, warum früh anfangen beim Sparen so viel ausmacht.', keyPoints: ['Zinseszins', 'Zeit', 'exponentiell', 'Zinsen auf Zinsen'] },
      { q: 'Warum ist Geld auf dem Girokonto bei Inflation ein Verlust?', keyPoints: ['Inflation', 'Kaufkraft', 'kein Zins', 'weniger kaufen'] },
    ],
    teachBack: {
      prompt: 'Erkläre einem Freund in 3 Minuten, was Zinseszins ist und warum Inflation Sparen auf dem Girokonto gefährlich macht.',
      mustInclude: ['Zinseszins', 'Inflation', 'Kaufkraft', 'Realzins'],
      followUps: ['Was ändert sich, wenn der Zinssatz von 5 auf 3 % sinkt?', 'Warum macht 1 % Unterschied langfristig so viel aus?'],
    },
    practice: { task: 'Rechne heute dein eigenes Beispiel durch.', how: 'Nimm einen Betrag, den du dir vorstellen kannst (zum Beispiel 500 €), einen Zinssatz von 3 % und 5 %, und rechne 10 und 30 Jahre mit K = K0 · (1 + p)^n.', check: 'Du kannst den Unterschied zwischen 3 % und 5 % nach 30 Jahren laut erklären.' },
    scenarios: [{
      situation: 'Du bekommst 500 € zum Geburtstag und brauchst sie die nächsten Jahre nicht. Was machst du?',
      options: [
        { text: 'Alles sofort ausgeben.', feedback: 'Spaß ist okay, aber dann arbeitet nichts für dich.' },
        { text: '100 € für Spaß, 400 € langfristig anlegen.', feedback: 'Ausgewogen. Der Zinseszins bekommt Zeit, du bekommst trotzdem etwas davon.', best: true },
        { text: 'Alles auf dem Girokonto liegen lassen.', feedback: 'Ohne Zinsen frisst die Inflation jedes Jahr ein Stück.' },
      ],
    }],
    cases: [{
      type: 'fall', title: 'Zwei Sparer',
      story: 'Anna zahlt von 20 bis 29 jedes Jahr 1.200 € ein und hört dann auf. Ben zahlt von 30 bis 59 jedes Jahr 1.200 € ein. Beide bekommen 5 % pro Jahr. Wer hat mit 60 mehr?',
      question: 'Schätze zuerst, dann rechne. Wer gewinnt, und um wie viel ungefähr?',
      solution: 'Ben hat rund 79.700 €, Anna rund 65.200 €. Anna hat aber nur 12.000 € eingezahlt, Ben 36.000 €. Der frühe Start macht den Unterschied.',
    }],
  }),
  P({
    id: 'finanzen-chefwissen', topic: 'finanzen', level: 2, title: 'Chefwissen: Marge, Deckungsbeitrag, Liquidität',
    summary: 'Drei Begriffe, die ein Geschäftsführer im Handel jeden Tag braucht, zum Beispiel bei Euro Wellness: Was bleibt pro Verkauf? Was decken die Fixkosten? Und ist genug Geld auf dem Konto?',
    explain: [
      { heading: 'Aufschlag und Marge sind nicht dasselbe', text: 'Einkauf 100 €, Verkauf netto 150 €. Der Aufschlag auf den Einkauf ist 50 %. Die Marge (Handelsspanne) bezieht sich auf den Verkaufspreis: 50 / 150 = 33,3 %. Wer beides verwechselt, kalkuliert falsch.' },
      { heading: 'Deckungsbeitrag', text: 'Deckungsbeitrag = Verkaufspreis netto minus variable Kosten pro Stück. Die Summe aller Deckungsbeiträge muss die Fixkosten (Miete, Gehälter, Versicherung) decken. Erst darüber bleibt Gewinn.' },
      { heading: 'Gewinn ist nicht Geld auf dem Konto', text: 'Ein Saunahersteller liefert, du zahlst in 30 Tagen, verkaufst aber erst in drei Monaten. Das Lager bindet Kapital. Liquidität heißt: Du kannst deine Rechnungen bezahlen, wenn sie fällig sind. Viele gesunde Firmen scheitern an Liquidität, nicht an Gewinn.' },
    ],
    terms: [
      { term: 'Marge (Handelsspanne)', def: 'Rohertrag geteilt durch Verkaufspreis netto.' },
      { term: 'Aufschlag', def: 'Rohertrag geteilt durch Einkaufspreis.' },
      { term: 'Deckungsbeitrag', def: 'Verkaufspreis netto minus variable Kosten.' },
      { term: 'Fixkosten', def: 'Kosten, die unabhängig von der Menge anfallen, etwa Miete.' },
      { term: 'Liquidität', def: 'Fähigkeit, fällige Zahlungen zu leisten.' },
      { term: 'Lagerumschlag', def: 'Wie oft das Lager pro Jahr komplett verkauft wird.' },
    ],
    flashcards: [
      { q: 'Aufschlag oder Marge: worauf bezieht sich was?', a: 'Aufschlag auf den Einkaufspreis, Marge auf den Verkaufspreis.' },
      { q: 'Deckungsbeitrag pro Stück?', a: 'Verkaufspreis netto minus variable Kosten.' },
      { q: 'Wie hoch ist der Regelsteuersatz der Umsatzsteuer in Deutschland?', a: '19 % (ermäßigt 7 %).' },
      { q: 'Warum kann eine Firma mit Gewinn pleitegehen?', a: 'Weil das Geld im Lager oder in offenen Forderungen steckt und die Zahlungen fällig werden (Liquiditätsproblem).' },
    ],
    quiz: [
      { q: 'Einkauf 80 €, Verkauf netto 120 €. Wie hoch ist die Marge?', options: ['25 %', '33,3 %', '40 %', '50 %'], answer: 1, explain: 'Rohertrag 40 € / Verkaufspreis 120 € = 33,3 %. Der Aufschlag wäre 50 %.' },
      { q: 'Was gehört NICHT zu den Fixkosten?', options: ['Miete', 'Gehalt der Festangestellten', 'Einkaufspreis der verkauften Ware', 'Versicherung'], answer: 2, explain: 'Der Wareneinsatz ist variabel, er hängt von der Menge ab.' },
      { q: 'Häufigste Ursache für Geldmangel trotz Gewinn?', options: ['Zu hohe Steuern', 'Gebundenes Kapital im Lager und bei Zahlungszielen', 'Zu viele Kunden', 'Zu niedrige Preise bei jedem Verkauf'], answer: 1, explain: 'Gewinn steht in der Buchhaltung, Geld muss auf dem Konto sein.' },
    ],
    questions: [
      { q: 'Erkläre den Unterschied zwischen Gewinn und Liquidität an einem Beispiel aus dem Saunahandel.', keyPoints: ['Lager', 'Zahlungsziel', 'Gewinn', 'Konto', 'fällig'] },
    ],
    teachBack: {
      prompt: 'Erkläre einem Freund, warum ein Geschäft mit Gewinn trotzdem zahlungsunfähig werden kann und was der Deckungsbeitrag damit zu tun hat.',
      mustInclude: ['Liquidität', 'Deckungsbeitrag', 'Fixkosten', 'Lager'],
      followUps: ['Was würdest du tun, wenn das Lager zu voll ist?', 'Woran erkennst du, ob ein Produkt sich lohnt?'],
    },
    practice: { task: 'Berechne Aufschlag und Marge für ein Produkt.', how: 'Nimm ein Produkt (zum Beispiel aus dem Saunahandel), schätze Einkaufs- und Verkaufspreis netto und rechne beides aus.', check: 'Du hast zwei verschiedene Prozentzahlen und kannst den Unterschied erklären.' },
    scenarios: [{
      situation: 'Ein Lieferant bietet 8 % Mengenrabatt, wenn du vor der Saison das Doppelte bestellst. Dein Konto ist knapp. Was machst du?',
      options: [
        { text: 'Sofort das Doppelte bestellen, der Rabatt ist sicher.', feedback: 'Der Rabatt ist sicher, der Verkauf nicht. Du bindest Kapital und riskierst Liquidität.' },
        { text: 'Bedarf prüfen, Zahlungsziel verhandeln, nur bestellen, was sicher abverkauft wird.', feedback: 'So denkt ein Chef: Rabatt gegen Kapitalbindung abwägen.', best: true },
        { text: 'Gar nicht bestellen und den Rabatt ignorieren.', feedback: 'Zu vorsichtig. Rechnen statt Bauchgefühl.' },
      ],
    }],
    cases: [],
  }),
  P({
    id: 'investieren-etf', topic: 'investieren', title: 'ETF-Grundlagen',
    summary: 'Ein ETF bildet einen Index nach und streut dein Geld auf viele Unternehmen. Er ist günstig, aber nicht risikofrei. Kein Anlagetipp, nur Grundlagen.',
    explain: [
      { heading: 'Was ist ein ETF?', text: 'ETF steht für Exchange Traded Fund, einen börsengehandelten Indexfonds. Er kauft die Wertpapiere eines Index (zum Beispiel einen Weltaktienindex mit über tausend Unternehmen) und gibt dir einen Anteil daran. Du kaufst und verkaufst ihn wie eine Aktie.' },
      { heading: 'Streuung und Kosten', text: 'Diversifikation heißt: Das Risiko einer einzelnen Firma fällt kaum ins Gewicht. Die laufenden Kosten stehen in der TER (Gesamtkostenquote), bei großen Index-ETFs oft deutlich unter 0,5 % pro Jahr. Thesaurierende ETFs legen Erträge wieder an, ausschüttende zahlen sie aus.' },
      { heading: 'Risiko und Zeit', text: 'Aktienkurse schwanken stark, zeitweise um 30 % und mehr nach unten. Wer Geld in absehbarer Zeit braucht, gehört nicht an die Börse. Ein Sparplan kauft regelmäßig und mittelt den Einstiegspreis. Steuern: In Deutschland gibt es einen Sparer-Pauschbetrag von 1.000 € pro Jahr, darüber greift die Abgeltungsteuer. Stand prüfen, Regeln ändern sich.' },
    ],
    terms: [
      { term: 'ETF', def: 'Börsengehandelter Fonds, der einen Index nachbildet.' },
      { term: 'Index', def: 'Eine Auswahl von Wertpapieren, die einen Markt abbildet.' },
      { term: 'Diversifikation', def: 'Streuung des Risikos auf viele Anlagen.' },
      { term: 'TER', def: 'Total Expense Ratio, jährliche laufende Kosten in Prozent.' },
      { term: 'thesaurierend', def: 'Erträge bleiben im Fonds und werden wieder angelegt.' },
      { term: 'Sparplan', def: 'Regelmäßige, automatische Käufe über einen festen Betrag.' },
    ],
    flashcards: [
      { q: 'Was bedeutet TER?', a: 'Gesamtkostenquote: die jährlichen laufenden Kosten des Fonds in Prozent.' },
      { q: 'Thesaurierend oder ausschüttend: was ist der Unterschied?', a: 'Thesaurierend legt Erträge wieder an, ausschüttend zahlt sie aus.' },
      { q: 'Warum streuen?', a: 'Damit der Absturz einer Firma das Ganze kaum trifft.' },
      { q: 'Für welchen Zeithorizont sind Aktien-ETFs gedacht?', a: 'Langfristig, mehrere Jahre bis Jahrzehnte.' },
    ],
    quiz: [
      { q: 'Was ist ein Index?', options: ['Ein Steuerformular', 'Eine Auswahl von Wertpapieren, die einen Markt abbildet', 'Eine Bankgebühr', 'Ein Sparbuch'], answer: 1, explain: 'Zum Beispiel ein Index mit den großen Unternehmen eines Marktes.' },
      { q: 'Welche Aussage über ETFs stimmt?', options: ['Sie sind garantiert risikofrei', 'Sie streuen über viele Titel, Kurse schwanken trotzdem', 'Sie zahlen immer feste Zinsen', 'Man kann sie nur bei Banken kaufen, nie an der Börse'], answer: 1, explain: 'Streuung senkt das Einzelrisiko, nicht das Marktrisiko.' },
      { q: 'Du brauchst das Geld in 1 Jahr für ein Auto. Aktien-ETF?', options: ['Ja, auf jeden Fall', 'Eher nein, zu kurzer Zeithorizont', 'Ja, ETFs steigen immer', 'Nur ausschüttend'], answer: 1, explain: 'Kurzfristig kann der Kurs deutlich unter dem Kaufpreis liegen.' },
    ],
    questions: [
      { q: 'Erkläre, was ein ETF ist und warum er als Einstieg gilt.', keyPoints: ['Index', 'streut', 'Diversifikation', 'günstig', 'Kosten'] },
    ],
    teachBack: {
      prompt: 'Erkläre einem Freund in 3 Minuten, was ein ETF ist, was Diversifikation bedeutet und welches Risiko bleibt.',
      mustInclude: ['Index', 'Diversifikation', 'TER', 'Risiko'],
      followUps: ['Warum gehört Geld, das du bald brauchst, nicht in einen Aktien-ETF?', 'Was macht ein Sparplan?'],
    },
    practice: { task: 'Schau dir den Kostenwert (TER) eines ETF an.', how: 'Suche beim Anbieter eines großen Welt-ETF das Factsheet und notiere TER, Index und Ausschüttungsart.', check: 'Du hast drei Angaben notiert und kannst erklären, was jede bedeutet.' },
    scenarios: [], cases: [],
  }),
  P({
    id: 'programmieren-basics', topic: 'programmieren', title: 'Variablen, Schleifen, Funktionen',
    summary: 'Drei Bausteine, aus denen fast jedes Programm besteht. Beispiele in Python, das Prinzip gilt überall.',
    explain: [
      { heading: 'Variablen', text: 'Eine Variable ist ein benannter Speicherplatz: x = 5. Du kannst sie lesen und ändern: x = x + 1. Der Name sollte sagen, was drinsteht (preis, anzahl).' },
      { heading: 'Bedingungen und Schleifen', text: 'if entscheidet, ob Code läuft. Eine for-Schleife wiederholt Code: for i in range(3): print(i) gibt 0, 1, 2 aus. Eine while-Schleife läuft, solange eine Bedingung wahr ist. Achtung vor Endlosschleifen.' },
      { heading: 'Funktionen', text: 'Eine Funktion bündelt Code unter einem Namen: def quadrat(x): return x * x. Parameter gehen rein, return gibt ein Ergebnis zurück. Funktionen vermeiden Wiederholung und machen Code testbar.' },
    ],
    terms: [
      { term: 'Variable', def: 'Benannter Speicherplatz für einen Wert.' },
      { term: 'Schleife', def: 'Code, der mehrfach ausgeführt wird.' },
      { term: 'Funktion', def: 'Benannter Codeblock mit Parametern und Rückgabewert.' },
      { term: 'Parameter', def: 'Wert, den eine Funktion beim Aufruf bekommt.' },
      { term: 'Bug', def: 'Fehler im Programm.' },
    ],
    flashcards: [
      { q: 'Was gibt for i in range(3): print(i) aus?', a: '0, 1, 2' },
      { q: 'Wofür ist return da?', a: 'Gibt das Ergebnis einer Funktion an den Aufrufer zurück.' },
      { q: 'Unterschied for und while?', a: 'for läuft über eine bekannte Folge, while läuft, solange eine Bedingung wahr ist.' },
      { q: 'Was ist ein Parameter?', a: 'Ein Wert, den du einer Funktion übergibst.' },
    ],
    quiz: [
      { q: 'x = 2; x = x * 3. Was ist x?', options: ['2', '5', '6', '23'], answer: 2, explain: '2 · 3 = 6.' },
      { q: 'def f(a): return a + 1. Was ist f(4)?', options: ['4', '5', '1', 'Fehler'], answer: 1, explain: '4 + 1 = 5.' },
      { q: 'Wie oft läuft for i in range(5)?', options: ['4 Mal', '5 Mal', '6 Mal', 'Endlos'], answer: 1, explain: 'range(5) liefert 0 bis 4, also 5 Durchläufe.' },
    ],
    questions: [{ q: 'Wozu braucht man Funktionen?', keyPoints: ['Wiederholung', 'Name', 'Parameter', 'return', 'lesbar'] }],
    teachBack: {
      prompt: 'Erkläre einem Freund, der noch nie programmiert hat, was eine Variable, eine Schleife und eine Funktion sind. Nimm Beispiele aus dem Alltag.',
      mustInclude: ['Variable', 'Schleife', 'Funktion', 'Parameter'],
      followUps: ['Was passiert bei einer Endlosschleife?', 'Warum nennt man Variablen nicht einfach x1, x2, x3?'],
    },
    practice: { task: 'Schreib eine kleine Funktion.', how: 'Schreibe eine Funktion, die eine Liste von Zahlen addiert, mit Schleife und return. Teste sie mit drei Beispielen.', check: 'Die Funktion liefert bei allen drei Beispielen das richtige Ergebnis.' },
    scenarios: [],
    cases: [{
      type: 'detektiv', title: 'Der Summen-Fehler',
      story: 'for i in range(1, 5):\n    total = total + i\nprint(total)\nDas Programm bricht mit einem Fehler ab.',
      question: 'Was ist der Fehler und wie behebst du ihn?',
      solution: 'total wurde vorher nie gesetzt. Vor der Schleife muss total = 0 stehen. Danach gibt das Programm 10 aus (1+2+3+4). range(1, 5) endet vor der 5.',
    }],
  }),
  P({
    id: 'gespraech-zuhoeren', topic: 'gespraech', title: 'Aktiv zuhören und gute Fragen',
    summary: 'Gute Gespräche entstehen durch Zuhören und echte Fragen. Das gilt beim Verhandeln, im Verkauf und beim Kennenlernen. Immer ehrlich, nie als Trick.',
    explain: [
      { heading: 'Offene Fragen', text: 'Geschlossene Fragen haben ein Ja oder Nein als Antwort. Offene Fragen (Wie, Was, Woran, Erzähl mir mehr) öffnen das Gespräch. "Wie war dein Tag?" bringt mehr als "War dein Tag gut?".' },
      { heading: 'Paraphrasieren', text: 'Gib in eigenen Worten wieder, was du verstanden hast: "Du meinst also, dass der Termin zu knapp ist?" Das zeigt Interesse, klärt Missverständnisse und lässt dem anderen Raum, dich zu korrigieren.' },
      { heading: 'Pausen und Haltung', text: 'Lass Pausen zu und unterbrich nicht. Blickkontakt, Nicken, ein zugewandter Körper zeigen, dass du da bist. Beim Verhandeln hilft es, zuerst die Interessen des anderen zu verstehen, nicht nur die Forderung.' },
      { heading: 'Ehrlichkeit', text: 'Gespräche sind keine Technik zum Austricksen. Wer Interesse nur spielt, merkt man. Echte Neugier wirkt besser als jede Methode. Ein Nein akzeptierst du.' },
    ],
    terms: [
      { term: 'offene Frage', def: 'Frage, die nicht mit Ja oder Nein beantwortet wird.' },
      { term: 'Paraphrasieren', def: 'Gehörtes in eigenen Worten wiedergeben.' },
      { term: 'aktives Zuhören', def: 'Zuhören mit Rückmeldung: Nicken, Nachfragen, Zusammenfassen.' },
      { term: 'Interesse', def: 'Das, was jemand wirklich will, hinter der Forderung.' },
    ],
    flashcards: [
      { q: 'Beispiel für eine offene Frage?', a: 'Wie ist das Projekt gelaufen? (statt: War das Projekt gut?)' },
      { q: 'Was bringt Paraphrasieren?', a: 'Klärt Missverständnisse und zeigt, dass du zuhörst.' },
      { q: 'Position oder Interesse: was verhandelst du?', a: 'Hinter der Position (Forderung) steckt das Interesse. Dort liegt die Lösung.' },
    ],
    quiz: [
      { q: 'Welche Frage ist offen?', options: ['Hat es dir gefallen?', 'Bist du müde?', 'Was hat dir daran gefallen?', 'Kommst du morgen?'], answer: 2, explain: '"Was" öffnet, die anderen lassen sich mit Ja/Nein beantworten.' },
      { q: 'Was ist Paraphrasieren?', options: ['Dem anderen widersprechen', 'Das Gehörte in eigenen Worten wiedergeben', 'Das Thema wechseln', 'Mitschreiben'], answer: 1, explain: 'So prüfst du, ob du richtig verstanden hast.' },
    ],
    questions: [{ q: 'Wie hörst du aktiv zu? Nenne mindestens drei Dinge, die du tust.', keyPoints: ['Nachfragen', 'Paraphrasieren', 'Blickkontakt', 'nicht unterbrechen', 'Pausen'] }],
    teachBack: {
      prompt: 'Erkläre einem Freund, wie man ein gutes Gespräch führt: offene Fragen, aktives Zuhören und Paraphrasieren.',
      mustInclude: ['offene Fragen', 'Paraphrasieren', 'aktiv zuhören'],
      followUps: ['Was machst du, wenn der andere nichts sagt?', 'Wie bleibst du ehrlich, wenn du etwas ablehnen willst?'],
    },
    practice: { task: 'Paraphrasiere heute dreimal.', how: 'Gib in drei Gesprächen mit eigenen Worten wieder, was du verstanden hast, und stelle danach eine offene Frage.', check: 'Du hast drei Mal paraphrasiert und notierst, wie die Reaktion war.' },
    scenarios: [{
      situation: 'Ein Freund erzählt, dass er Stress mit seinen Eltern hat und wirkt genervt. Was sagst du?',
      options: [
        { text: 'Sofort Ratschläge geben: "Mach einfach X."', feedback: 'Gut gemeint, aber er will erst gehört werden.' },
        { text: '"Klingt, als ging es um die Abmachung vom Wochenende, hab ich das richtig verstanden? Erzähl mal, was genau passiert ist."', feedback: 'Paraphrasieren plus offene Frage. Genau das.', best: true },
        { text: 'Das Thema wechseln, weil es unangenehm ist.', feedback: 'Wirkt wie Desinteresse.' },
      ],
    }],
    cases: [],
  }),
  P({
    id: 'mentalist-koerpersprache', topic: 'mentalist', title: 'Menschen lesen: Baseline und Signale',
    summary: 'Körpersprache verrät Stimmung, aber keine Gedanken. Ehrlich lesen heißt: Veränderungen bemerken, im Kontext deuten und lieber nachfragen als raten.',
    explain: [
      { heading: 'Baseline', text: 'Jeder Mensch hat ein Normalverhalten: wie er sitzt, redet, gestikuliert. Erst die Abweichung von der Baseline sagt etwas aus. Verschränkte Arme können Kälte bedeuten, nicht Ablehnung.' },
      { heading: 'Mehrere Signale und Kontext', text: 'Ein einzelnes Signal beweist nichts. Achte auf mehrere zusammen (Cluster) und auf die Situation. Ein nervöser Blick vor einer Prüfung ist normal. Deutung ist eine Vermutung, die du im Gespräch prüfst.' },
      { heading: 'Grenzen', text: 'Studien zeigen, dass Menschen Lügen nur wenig besser als Zufall erkennen (um die 54 %, Bond & DePaulo 2006). Mikroausdrücke, also sehr kurze Gesichtsausdrücke, sind als Lügenzeichen wissenschaftlich umstritten. Nutze das Wissen, um empathischer zu sein, nicht um andere zu überführen.' },
    ],
    terms: [
      { term: 'Baseline', def: 'Das normale Verhalten einer Person als Vergleichsmaßstab.' },
      { term: 'Cluster', def: 'Mehrere zusammenpassende Signale statt eines einzelnen.' },
      { term: 'Mikroausdruck', def: 'Sehr kurzer Gesichtsausdruck, in seiner Aussagekraft umstritten.' },
      { term: 'Kontext', def: 'Die Situation, in der ein Signal auftritt.' },
    ],
    flashcards: [
      { q: 'Was ist eine Baseline?', a: 'Das normale Verhalten einer Person, mit dem du Veränderungen vergleichst.' },
      { q: 'Warum reicht ein Signal nicht?', a: 'Es kann viele Gründe haben. Erst Cluster und Kontext geben ein Bild.' },
      { q: 'Wie gut erkennen Menschen Lügen?', a: 'Nur knapp besser als Zufall (rund 54 %).' },
    ],
    quiz: [
      { q: 'Jemand verschränkt die Arme. Was ist die beste Reaktion?', options: ['Er lügt', 'Er lehnt mich ab', 'Nicht voreilig deuten, auf Baseline und Kontext achten, nachfragen', 'Ignorieren, Körpersprache ist Unsinn'], answer: 2, explain: 'Es kann Kälte, Gewohnheit oder Unsicherheit sein.' },
      { q: 'Wozu sollte man Körpersprache vor allem nutzen?', options: ['Um Menschen zu überführen', 'Um empathischer zu reagieren', 'Um zu manipulieren', 'Um zu gewinnen'], answer: 1, explain: 'Verstehen statt kontrollieren.' },
    ],
    questions: [{ q: 'Warum ist die Baseline wichtig?', keyPoints: ['Normalverhalten', 'Veränderung', 'Vergleich', 'Kontext'] }],
    teachBack: {
      prompt: 'Erkläre einem Freund, wie man Körpersprache ehrlich einschätzt und warum man nicht einfach Lügen "erkennen" kann.',
      mustInclude: ['Baseline', 'Kontext', 'Cluster', 'nachfragen'],
      followUps: ['Was machst du, wenn du etwas Auffälliges bemerkst?', 'Warum sind Mikroausdrücke umstritten?'],
    },
    practice: { task: 'Lerne eine Baseline kennen.', how: 'Beobachte eine vertraute Person heute fünf Minuten im normalen Gespräch: Haltung, Stimme, Gesten. Notiere nur Beobachtungen, keine Deutung.', check: 'Du hast mindestens vier beobachtbare Punkte und keine Deutung aufgeschrieben.' },
    scenarios: [], cases: [],
  }),
  P({
    id: 'sherlock-beobachten', topic: 'sherlock', title: 'Beobachten, Schließen, Prüfen',
    summary: 'Sherlock-Denken heißt: sauber beobachten, Fakten von Deutungen trennen, mehrere Erklärungen sammeln und die beste prüfen.',
    explain: [
      { heading: 'Beobachten ist nicht Deuten', text: 'Beobachtung: "Der Schuh ist nass." Deutung: "Er war im Regen." Trenne beides im Kopf. Erst Fakten sammeln, dann Hypothesen bilden.' },
      { heading: 'Deduktion, Induktion, Abduktion', text: 'Deduktion schließt vom Allgemeinen auf den Fall (alle Menschen sind sterblich, Sokrates ist ein Mensch, also ...). Induktion verallgemeinert aus Fällen. Abduktion sucht die beste Erklärung für eine Beobachtung. Holmes arbeitet eigentlich meist abduktiv.' },
      { heading: 'Denkfehler', text: 'Bestätigungsfehler: Wir suchen Belege für das, was wir schon glauben. Gegenmittel: aktiv nach dem suchen, was die Idee widerlegen würde, und mindestens zwei Erklärungen aufschreiben.' },
    ],
    terms: [
      { term: 'Hypothese', def: 'Vermutete Erklärung, die du prüfen kannst.' },
      { term: 'Deduktion', def: 'Schluss vom Allgemeinen auf den Einzelfall.' },
      { term: 'Induktion', def: 'Verallgemeinerung aus Einzelfällen.' },
      { term: 'Abduktion', def: 'Schluss auf die beste Erklärung.' },
      { term: 'Bestätigungsfehler', def: 'Neigung, nur Bestätigendes wahrzunehmen.' },
    ],
    flashcards: [
      { q: 'Beobachtung oder Deutung: "Er ist wütend"?', a: 'Deutung. Beobachtung wäre: "Seine Stimme ist laut, die Fäuste sind geballt."' },
      { q: 'Was ist Abduktion?', a: 'Die beste Erklärung für eine Beobachtung finden.' },
      { q: 'Was hilft gegen den Bestätigungsfehler?', a: 'Gezielt nach Gegenbeweisen suchen und mindestens zwei Erklärungen aufschreiben.' },
    ],
    quiz: [
      { q: 'Welcher Satz ist eine reine Beobachtung?', options: ['Sie war traurig.', 'Ihre Augen waren gerötet.', 'Sie hat geweint, weil sie durchgefallen ist.', 'Sie lügt.'], answer: 1, explain: 'Alles andere enthält Deutung.' },
      { q: 'Alle Katzen haben Fell. Tom ist eine Katze. Also hat Tom Fell. Das ist …', options: ['Induktion', 'Deduktion', 'Abduktion', 'Raten'], answer: 1, explain: 'Vom Allgemeinen auf den Einzelfall.' },
    ],
    questions: [{ q: 'Warum schreibst du mindestens zwei Erklärungen auf?', keyPoints: ['Bestätigungsfehler', 'Alternativen', 'prüfen', 'Hypothese'] }],
    teachBack: {
      prompt: 'Erkläre einem Freund, wie man wie Sherlock denkt: Beobachtung, Hypothese und Prüfung.',
      mustInclude: ['Beobachtung', 'Hypothese', 'Bestätigungsfehler'],
      followUps: ['Wie prüfst du eine Hypothese?', 'Warum ist "wahrscheinlich" ehrlicher als "sicher"?'],
    },
    practice: { task: 'Trenne Beobachtung und Deutung.', how: 'Schau dir einen Ort genau eine Minute an (Klassenraum, Bahnhof) und schreibe fünf Beobachtungen und zwei mögliche Erklärungen auf.', check: 'Fünf Beobachtungen ohne Wertung, zwei verschiedene Erklärungen.' },
    scenarios: [],
    cases: [{
      type: 'detektiv', title: 'Die warme Tasse',
      story: 'Im Zimmer steht eine Kaffeetasse, noch warm. Die Jacke hängt über dem Stuhl, das Handy liegt auf dem Tisch, die Straßenschuhe stehen nicht an der Tür.',
      question: 'Trenne Fakten und Deutung. Was ist wahrscheinlich passiert, und was weißt du nicht?',
      solution: 'Fakten: warme Tasse, Jacke da, Handy da, Schuhe fehlen. Wahrscheinlich: Die Person ist vor kurzem gegangen und kommt vermutlich bald zurück (Handy und Jacke blieben). Unsicher: ob sie in Hausschuhen draußen ist, ob jemand anderes die Schuhe nahm. Eine Hypothese, kein Beweis.',
    }],
  }),
  P({
    id: 'buecher-aktiv-lesen', topic: 'buecher', title: 'Bücher aktiv lesen',
    summary: 'Wer nur liest, vergisst viel. Wer markiert, zusammenfasst und wiederholt, behält mehr.',
    explain: [
      { heading: 'SQ3R', text: 'Survey (überfliegen), Question (Fragen stellen), Read (lesen), Recite (laut zusammenfassen), Review (wiederholen). Fünf Schritte, die aus Lesen Lernen machen.' },
      { heading: 'Notizen und Zitate', text: 'Schreib pro Kapitel drei Sätze in eigenen Worten. Sammle Lieblingszitate mit Seitenzahl. Notiere, was du morgen anders machst.' },
      { heading: 'Kleine Menge, jeden Tag', text: '10 Seiten am Tag sind etwa 3.600 Seiten im Jahr, also rund zwölf Bücher. Die Regelmäßigkeit zählt mehr als die Länge der einzelnen Sitzung.' },
    ],
    terms: [
      { term: 'SQ3R', def: 'Lesemethode: Survey, Question, Read, Recite, Review.' },
      { term: 'Recite', def: 'Das Gelesene laut in eigenen Worten wiedergeben.' },
      { term: 'Zusammenfassung', def: 'Kernaussagen in wenigen eigenen Sätzen.' },
    ],
    flashcards: [
      { q: 'Wofür steht SQ3R?', a: 'Survey, Question, Read, Recite, Review.' },
      { q: 'Wie viele Seiten im Jahr sind 10 Seiten am Tag?', a: 'Rund 3.650.' },
      { q: 'Warum nach jedem Kapitel zusammenfassen?', a: 'Aktives Abrufen festigt das Gelernte.' },
    ],
    quiz: [
      { q: 'Welcher Schritt von SQ3R ist "Recite"?', options: ['Überfliegen', 'Fragen stellen', 'Laut zusammenfassen', 'Verschenken'], answer: 2, explain: 'Recite = das Gelesene in eigenen Worten wiedergeben.' },
    ],
    questions: [{ q: 'Wie machst du aus Lesen echtes Lernen?', keyPoints: ['zusammenfassen', 'eigene Worte', 'wiederholen', 'Notizen', 'Fragen'] }],
    teachBack: {
      prompt: 'Erkläre einem Freund, wie man ein Sachbuch so liest, dass man danach wirklich etwas weiß.',
      mustInclude: ['SQ3R', 'zusammenfassen', 'Notizen'],
      followUps: ['Wie viel liest du am Tag und warum?'],
    },
    practice: { task: 'Fasse ein Kapitel in drei Sätzen zusammen.', how: 'Lies heute ein Kapitel deines Buchs und schreibe danach drei Sätze in eigenen Worten, ohne ins Buch zu schauen.', check: 'Drei Sätze stehen, die du ohne Buch erklären kannst.' },
    scenarios: [], cases: [],
  }),
  P({
    id: 'schule-ableitung', topic: 'schule', title: 'Mathe: Ableitungsregeln',
    summary: 'Die vier Grundregeln, mit denen du fast jede Funktion in der Oberstufe ableitest.',
    explain: [
      { heading: 'Potenz-, Faktor- und Summenregel', text: 'Potenzregel: f(x) = x^n hat die Ableitung n · x^(n−1). Faktorregel: Konstanten bleiben stehen, (c · f)\' = c · f\'. Summenregel: Summen werden gliedweise abgeleitet. Beispiel: f(x) = 5x^4 + 3x gibt f\'(x) = 20x^3 + 3.' },
      { heading: 'Produktregel', text: '(u · v)\' = u\' · v + u · v\'. Beispiel: (x · e^x)\' = 1 · e^x + x · e^x = e^x (1 + x).' },
      { heading: 'Kettenregel', text: 'Für verschachtelte Funktionen: (f(g(x)))\' = f\'(g(x)) · g\'(x). Äußere Ableitung mal innere Ableitung. Beispiel: ((2x+1)^2)\' = 2(2x+1) · 2 = 4(2x+1).' },
    ],
    terms: [
      { term: 'Ableitung', def: 'Steigung der Funktion an einer Stelle, Änderungsrate.' },
      { term: 'Produktregel', def: '(u·v)\' = u\'v + uv\'.' },
      { term: 'Kettenregel', def: 'Äußere Ableitung mal innere Ableitung.' },
      { term: 'Extremstelle', def: 'Stelle mit f\'(x) = 0 und Vorzeichenwechsel der Ableitung.' },
    ],
    flashcards: [
      { q: 'Ableitung von x^n?', a: 'n · x^(n−1)' },
      { q: 'Produktregel?', a: '(u·v)\' = u\'·v + u·v\'' },
      { q: 'Kettenregel?', a: 'f\'(g(x)) · g\'(x)' },
      { q: 'Ableitung einer Konstanten?', a: '0' },
    ],
    quiz: [
      { q: 'f(x) = x^3. f\'(x) = ?', options: ['x^2', '3x^2', '3x^3', 'x^4/4'], answer: 1, explain: 'n = 3, also 3x^2.' },
      { q: 'f(x) = 5x^4. f\'(x) = ?', options: ['5x^3', '20x^3', '20x^4', '4x^3'], answer: 1, explain: '5 · 4 = 20, Exponent 3.' },
      { q: 'f(x) = (2x+1)^2. f\'(x) = ?', options: ['2(2x+1)', '4(2x+1)', '(2x+1)', '2x'], answer: 1, explain: 'Außen 2(2x+1), innen 2, also 4(2x+1).' },
    ],
    questions: [{ q: 'Wann brauchst du die Kettenregel?', keyPoints: ['verschachtelt', 'innere', 'äußere', 'Klammer'] }],
    teachBack: {
      prompt: 'Erkläre einem Freund, was eine Ableitung ist und wie Potenz- und Kettenregel funktionieren.',
      mustInclude: ['Steigung', 'Potenzregel', 'Kettenregel'],
      followUps: ['Wie findest du ein Maximum mit der Ableitung?', 'Wo siehst du Ableitungen im Alltag?'],
    },
    practice: { task: 'Leite drei Funktionen ab.', how: 'Wähle eine Funktion mit Potenz, eine mit Produkt und eine mit Kettenregel und leite sie ab. Kontrolliere mit einem Rechner.', check: 'Alle drei Ergebnisse stimmen mit der Kontrolle überein.' },
    scenarios: [], cases: [],
  }),
  P({
    id: 'schule-facharbeit', topic: 'schule', level: 2, title: 'Facharbeit: Aufbau und Quellen',
    summary: 'Eine gute Facharbeit hat eine klare Fragestellung, einen sauberen Aufbau und nachvollziehbare Quellen.',
    explain: [
      { heading: 'Aufbau', text: 'Titelblatt, Inhaltsverzeichnis, Einleitung (Fragestellung, Vorgehen), Hauptteil (Argumentation oder Untersuchung), Fazit (Antwort auf die Frage), Quellenverzeichnis, Erklärung zur selbständigen Arbeit. Genaue Vorgaben stehen in den Hinweisen deiner Schule.' },
      { heading: 'Fragestellung', text: 'Eine Fragestellung ist eng genug zum Beantworten und weit genug für Argumente. "Wie wirkt sich Inflation auf Sparer in Deutschland seit 2021 aus?" ist besser als "Inflation".' },
      { heading: 'Quellen und Zitieren', text: 'Gute Quellen: Fachbücher, Studien, Behörden. Vorsicht bei Blogs und Wikipedia (Einstieg, nicht Beleg). Jede übernommene Idee gehört in die Fußnote. Einheitliche Zitierweise, sonst droht ein Plagiatsverdacht.' },
    ],
    terms: [
      { term: 'Fragestellung', def: 'Zentrale Frage, die die Arbeit beantwortet.' },
      { term: 'Primärquelle', def: 'Originaltext oder Originaldaten.' },
      { term: 'Sekundärquelle', def: 'Darstellung oder Auswertung über eine Primärquelle.' },
      { term: 'Plagiat', def: 'Fremde Gedanken ohne Quellenangabe als eigene ausgeben.' },
    ],
    flashcards: [
      { q: 'Was steht im Fazit?', a: 'Die Antwort auf die Fragestellung.' },
      { q: 'Primär- oder Sekundärquelle: eine Studie über ein Gesetz?', a: 'Sekundärquelle. Der Gesetzestext selbst ist die Primärquelle.' },
      { q: 'Warum einheitlich zitieren?', a: 'Nachvollziehbarkeit und Schutz vor Plagiatsvorwurf.' },
    ],
    quiz: [
      { q: 'Welche Fragestellung ist am besten?', options: ['Inflation', 'Alles über Geld', 'Wie hat die Inflation seit 2021 die Kaufkraft von Sparbüchern in Deutschland verändert?', 'Ist Geld gut?'], answer: 2, explain: 'Eng, prüfbar, beantwortbar.' },
    ],
    questions: [{ q: 'Wie baust du eine Facharbeit auf?', keyPoints: ['Einleitung', 'Hauptteil', 'Fazit', 'Quellenverzeichnis', 'Fragestellung'] }],
    teachBack: { prompt: 'Erkläre einem Freund, wie man eine Facharbeit anfängt: Thema, Fragestellung, Quellen.', mustInclude: ['Fragestellung', 'Quellen', 'Gliederung'], followUps: ['Wie erkennst du eine gute Quelle?'] },
    practice: { task: 'Formuliere eine Fragestellung.', how: 'Schreibe drei Entwürfe für eine Fragestellung deiner Facharbeit und wähle die beste, die eng und beantwortbar ist.', check: 'Du hast eine Frage, die du in einem Satz beantworten könntest.' },
    scenarios: [], cases: [],
  }),
  P({
    id: 'selbstverteidigung-deeskalation', topic: 'selbstverteidigung', title: 'Distanz, Stand, Deeskalation, Notwehr',
    summary: 'Die beste Selbstverteidigung ist, gar nicht erst kämpfen zu müssen. Distanz, klare Stimme, Rückzug. Wenn es nicht anders geht: sicherer Stand und rechtliche Grenzen kennen.',
    explain: [
      { heading: 'Vermeiden und Deeskalieren', text: 'Gefährliche Orte und Situationen meiden, Abstand halten, ruhig und klar sprechen ("Stopp, ich will keinen Streit"), Hände sichtbar auf Brusthöhe, Fluchtweg im Blick. Wegrennen und Hilfe holen ist kein Verlust.' },
      { heading: 'Stand und Distanz', text: 'Schulterbreiter Stand, ein Fuß leicht versetzt, Knie locker, Gewicht auf den Fußballen. Halte mindestens eine Armlänge Abstand, so kannst du reagieren. Das trainierst du beim Schattenboxen.' },
      { heading: 'Notwehr (§ 32 StGB)', text: 'Notwehr ist die Verteidigung, die erforderlich ist, um einen gegenwärtigen rechtswidrigen Angriff von sich oder anderen abzuwenden. Sie darf nicht übertrieben sein und dient nicht der Rache. Ist der Angriff vorbei, schlägt man nicht mehr zu. Keine Rechtsberatung, nur Grundwissen.' },
    ],
    terms: [
      { term: 'Deeskalation', def: 'Eine Situation beruhigen statt anheizen.' },
      { term: 'Distanz', def: 'Abstand zum Gegenüber, der Reaktionszeit gibt.' },
      { term: 'Notwehr', def: 'Erforderliche Verteidigung gegen einen gegenwärtigen rechtswidrigen Angriff (§ 32 StGB).' },
      { term: 'Erforderlichkeit', def: 'Das mildeste gleich wirksame Mittel.' },
    ],
    flashcards: [
      { q: 'Was ist die erste Wahl in einer Konfrontation?', a: 'Vermeiden, deeskalieren, weggehen.' },
      { q: 'Welche Distanz mindestens?', a: 'Mindestens eine Armlänge.' },
      { q: 'Was verlangt Notwehr?', a: 'Gegenwärtiger rechtswidriger Angriff, erforderliche Verteidigung, kein Racheakt.' },
    ],
    quiz: [
      { q: 'Jemand pöbelt dich an, ist aber noch 3 Meter weg. Was ist am besten?', options: ['Zuerst zuschlagen', 'Abstand halten, ruhig sprechen, Weg suchen', 'Zurückpöbeln', 'Stehen bleiben und starren'], answer: 1, explain: 'Deeskalation und Rückzug zuerst.' },
      { q: 'Notwehr endet, wenn …', options: ['der andere beleidigt hat', 'der Angriff vorbei ist', 'du wütend bist', 'Zuschauer da sind'], answer: 1, explain: 'Nach dem Angriff ist keine Verteidigung mehr nötig, alles weitere wäre Rache.' },
    ],
    questions: [{ q: 'Welche Schritte gehst du in einer bedrohlichen Situation, bevor es zu Körperkontakt kommt?', keyPoints: ['Abstand', 'Stimme', 'Hände', 'Fluchtweg', 'Hilfe'] }],
    teachBack: { prompt: 'Erkläre einem Freund, wie man brenzlige Situationen entschärft und was Notwehr bedeutet.', mustInclude: ['Deeskalation', 'Distanz', 'Notwehr'], followUps: ['Wann endet das Recht auf Notwehr?'] },
    practice: { task: 'Übe Stand und Abstand.', how: 'Übe drei Minuten vor dem Spiegel: schulterbreiter Stand, Hände sichtbar auf Brusthöhe, ein ruhiger Satz wie „Stopp, ich will keinen Streit“.', check: 'Du stehst stabil und sprichst den Satz ruhig und laut genug.' },
    scenarios: [{
      situation: 'Du gehst abends an einer Gruppe vorbei, einer ruft dir etwas Aggressives hinterher.',
      options: [
        { text: 'Umdrehen und zurückschreien.', feedback: 'Heizt an und bringt dich in Gefahr.' },
        { text: 'Weitergehen, Abstand halten, belebte Straße wählen, notfalls Hilfe holen.', feedback: 'Vermeiden und Distanz sind die beste Verteidigung.', best: true },
        { text: 'Hingehen und klären.', feedback: 'Riskant, es gibt nichts zu gewinnen.' },
      ],
    }],
    cases: [],
  }),
];
