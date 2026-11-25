# Disziplin

Persönliche Lern- und Alltags-App für Nils. Sie kennt den ganzen Tag (Stundenplan, feste Termine, flexible Aufgaben) und zeigt jederzeit genau eine Sache: **Das ist jetzt dran.** Motto: Disziplin schlägt Motivation.

Version 1 mit Überarbeitung. Sie läuft und ist getestet (Unit-Tests, ein End-to-End-Lauf mit simulierten Tagen in 375 px Breite). Bekannte Lücken stehen unten. **Noch nicht deployt.**

## Start

```bash
npm install
npm run dev        # Entwicklung, http://localhost:5173
npm test           # Unit-Tests (Plan, Streak, Import, Lernen, Aktionen)
npm run build      # Produktions-Build nach dist/
npm run e2e        # baut ohne Cloud-Zugang und spielt Tage im Browser durch, Screenshots in ./e2e-shots
```

Ohne weitere Einrichtung läuft die App im **Lokal-Modus**: alles liegt im Browser dieses Geräts, kein Login, keine Synchronisierung. Für Sync zwischen iPhone, MacBook und PC braucht es Supabase (nächster Abschnitt).

Beim ersten Start fragt die App: **Mit Testdaten starten** (14 Tage Verlauf mit einem verpassten und einem entschuldigten Tag, zwei Bücher) oder **Sauber starten**. Beides lässt sich unter *Mehr* jederzeit wiederholen.

### Test-Werkzeuge (Mehr, ganz unten)

- **Test-Uhr:** Datum und Uhrzeit simulieren. So spielst du Morgen, Schulschluss, Abendcheck, den nächsten Tag oder einen verpassten Tag durch, ohne zu warten. Ein roter Hinweis unten links zeigt, dass die Test-Uhr aktiv ist.
- **Lernzeit-Beschleuniger:** ×60 lässt eine Sekunde als Minute zählen, damit die 5-Minuten-Regel in ein paar Sekunden erfüllt ist. Danach wieder auf ×1.

## Cloud-Sync mit Supabase

Das Projekt "Disziplin" (`hjlkaclimldsofvsevzd`) existiert. Die App liest URL und Publishable Key aus `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, Vorlage `.env.example`). Der Publishable Key ist öffentlich gedacht, die Daten schützt Row Level Security. Der Secret Key kommt **nie** in die App oder ins Repository.

**Ich habe keinen Zugriff auf dein Supabase-Projekt** (die Verbindung in meiner Sitzung sieht es nicht). Deshalb sind Tabellen und Funktion noch nicht angelegt. Das machst du einmalig nach `scripts/setup-supabase.md`: im SQL Editor `supabase/migrations/0001_disziplin.sql` ausführen. Die Migration habe ich lokal gegen eine echte Postgres-Engine geprüft (Test `tests/migration.test.js`: Tabellen, RLS auf allen Tabellen, ein zweiter Nutzer sieht nichts).

Tabellen (alle mit RLS, jede Zeile gehört genau einem Nutzer): `settings`, `day_log` (Tageslog), `streak`, `books`, `topics`, `packs`, `excuses` (Begründungen), `homework`, `tasks`, `push_subscriptions`, `reminders`, `invites`.

**Sync:** Login mit E-Mail und Passwort (Code per E-Mail zusätzlich). Jeder Tag, die Einstellungen, der Stundenplan, Lernstand, Bücher, Hausaufgaben und Pakete sind einzelne Einträge mit Zeitstempel, die der jeweiligen Tabelle zugeordnet werden (`src/core/sync.js`). Beim Start, beim Zurückkehren in die App und alle 60 Sekunden werden neuere Einträge geholt und lokale Änderungen hochgeladen. Pro Eintrag gewinnt die jüngere Änderung. **Ohne Verbindung läuft alles lokal weiter** und wird später nachgeholt. "Ohne Anmeldung weitermachen" nutzt nur dieses Gerät.

**Registrierung:** Bleibt vorerst offen. Die Grundlage für Einladungen ist da (Tabelle `invites`, Funktion `redeem_invite`, die App löst `?invite=CODE` beim Registrieren ein), aber nichts wird erzwungen. Sobald dein Konto existiert, schaltest du in Supabase "Allow new users to sign up" aus. Ich sage dir in der Zusammenfassung, wann.

Anmeldung am iPhone: Passwort funktioniert in der Homescreen-App am zuverlässigsten. Ein Link-Login per E-Mail würde Safari statt der Homescreen-App öffnen.

## Deployment (Vercel, kostenloser Hobby-Tarif)

Die App ist eine statische Vite-App, `vercel.json` ist vorbereitet. Mein Zugriff auf Vercel wurde mit 403 abgewiesen, ein Deployment steht deshalb noch aus (Schritte in der Zusammenfassung und in `FRAGEN.md`).

1. Auf vercel.com *Add New > Project*, Repository `App-Nils-Disziplin` importieren.
2. Branch: Die App liegt auf `claude/festive-edison-q7qml9`. Entweder unter *Settings > Git > Production Branch* diesen Branch eintragen oder den Branch nach `main` mergen.
3. *Environment Variables* setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (Werte wie in `.env`), später `VITE_VAPID_PUBLIC_KEY`.
4. Deploy. Die Adresse ist der Link für das iPhone (HTTPS, nötig für Homescreen und Benachrichtigungen).

## Auf den iPhone-Homescreen

1. Link in **Safari** öffnen (nicht in einer anderen App).
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. **Zum Home-Bildschirm** wählen, **Hinzufügen**.
4. Von dort öffnen. Nur so laufen Vollbild und Benachrichtigungen.

Auf Mac/PC reicht der Browser. In Chrome und Edge gibt es oben rechts ein Installieren-Symbol.

## Fokus-Kurzbefehl (iPhone)

Der Button **Fokus starten** auf der Lern-Karte ruft den Kurzbefehl `shortcuts://run-shortcut?name=Fokus%20Lernen` auf. Anlegen:

1. *Einstellungen > Fokus > +* einen Fokus "Disziplin" erstellen. Dort festlegen, welche Personen und Apps Meldungen schicken dürfen (am besten: keine) und optional, welche Homescreen-Seiten sichtbar sind.
2. *Kurzbefehle*-App öffnen, **+**, Aktion **Fokus festlegen** hinzufügen: Fokus *Disziplin*, *Einschalten*, *Bis ich ihn ausschalte*.
3. Den Kurzbefehl genau **Fokus Disziplin** nennen. Anderen Namen? Dann unter *Mehr > Fokus und Benachrichtigungen* den Namen anpassen.
4. Test: In Safari `shortcuts://run-shortcut?name=Fokus%20Lernen` eintippen.

Ehrlich dazu: Ein Fokus stellt Meldungen ab und kann Homescreen-Seiten ausblenden. Er **sperrt keine Apps**. Eine echte App-Sperre geht auf dem iPhone nur mit einer nativen App (Screen-Time-API). Ich habe den Aufruf nicht auf einem echten iPhone ausprobieren können.
Auf Mac und PC zeigt der Button einen Hinweis auf Website-Blocker (Fokus-Modus des Systems oder ein Blocker wie Cold Turkey).

## Benachrichtigungen auf iOS: was geht, was nicht

| Situation | Geht? |
|---|---|
| App offen oder im Vordergrund | Ja. Alle Erinnerungen (Wasser, Lernen, Hausaufgabe, Sport, Handball-Weg, Lesen, Abendcheck) als Hinweis in der App, mit Ein-Tipp-Antwort. Nach 10 Minuten ohne Reaktion kommt eine zweite, härtere Nachricht. |
| Homescreen-App, geschlossen | Ja, **mit Server-Push** (Supabase Edge Function plus Zeitplan, siehe `scripts/setup-supabase.md`). Ohne den Server kommt im Hintergrund nichts. |
| Nur in einem Safari-Tab | **Nein.** Web-Push gibt es auf dem iPhone nur in der zum Homescreen hinzugefügten App (iOS 16.4 oder neuer). |
| Erlaubnis | Muss per Tipp in der App erfragt werden (*Mehr > Benachrichtigungen > Erlauben*). Wer ablehnt, muss es in den iOS-Einstellungen ändern. |
| Aktionsknöpfe in der Systemmeldung (+250 ml) | **Nein**, iOS zeigt sie nicht. Tippen öffnet die App, dort steht der Ein-Tipp-Knopf. |
| Zuverlässigkeit | iOS entscheidet über Zustellung und Zeitpunkt. Eine Zustellung auf die Minute ist nicht garantiert. |

**Was ich eingerichtet habe:** Service Worker (`public/sw.js`: zeigt Push an, öffnet die App beim Tippen), Abo-Verwaltung und Zeitplan-Abgleich im Client (`src/core/notify.js`), Tabellen `push_subscriptions` und `reminders`, Edge Function `supabase/functions/send-reminders` (VAPID, zweite harte Nachricht, Aufräumen abgelaufener Abos), Zeitplan per `supabase/cron.sql`. **Was ich nicht konnte:** deployen und mit einem echten iPhone ausprobieren, weil ich keinen Zugriff auf dein Supabase-Projekt und kein iPhone habe. Die Funktion ist deshalb ungetestet. Der Client baut jeden Tag die Erinnerungen für heute und morgen und legt sie in `reminders` ab, solange Push aktiv ist.

Der gesamte Client-Code liegt in `src/core/notify.js` und `public/sw.js`. Eine spätere native App ersetzt nur dieses Modul.

## Struktur

```
src/
  main.js, styles.css
  core/      store.js (lokaler Speicher), sync.js (Supabase), actions.js (alle Aktionen),
             notify.js (Erinnerungen), defaults.js, events.js
  engine/    plan.js (Tagesplan), discipline.js (Streak, Punkte, Ziele), learning.js (Themen, Sitzungen),
             importer.js (JSON/Markdown-Import mit Prüfung)
  data/      timetable.js (Stundenplan A/B), topics.js, texts.js, packs/index.js (Platzhalter-Inhalte)
  ui/        app.js (Router), heute.js, bock.js, lernen.js, session.js, itemrunner.js, plan.js, abend.js,
             woche.js, settings.js, stundenplan.js, buecher.js, import.js, auth.js, mascot.js, fx.js
public/      manifest, Service Worker, Icons
supabase/    schema.sql, functions/send-reminders
tests/       Unit-Tests (vitest)
scripts/     e2e.cjs (Playwright), make-icons.cjs
```

Die Plan-Engine (`engine/plan.js`) ist eine reine Funktion: Stundenplan, feste Termine, Tageszustand, offene Aufgaben und aktuelle Uhrzeit rein, Zeitleiste und "Das ist jetzt dran" raus. Sie wird bei jedem Zeichnen neu berechnet. Deshalb passt sich der Tag von selbst an, wenn Nils tauscht, verschläft oder Stunden ausfallen.

## Bildschirme

1. **Heute:** Streak-Flamme mit Maskottchen, Tagesring, Uhrzeit und nächster fester Termin, große Karte "Das ist jetzt dran", Wasser, Zukunftswissen, Freizeitkonto, Tagesziele, Denkaufgabe des Tages, ganzer Tag, Verschlafen-Knopf.
2. **Worauf hast du Bock?** drei Optionen nach der Schule (am Wochenende nach dem Aufstehen).
3. **Lernen:** Heutiges Thema, Wissensstand je Thema, Mini-Lektion, Auftrag für morgen kopieren, Themen anlegen und pausieren, Bücher, Import.
4. **Lernsitzung:** Wissenscheck bei Wiederkehr, Erklärung, dann wechselnde Formate (Karteikarten, Mini-Quiz, kurze Frage, mündlich per Sprache, Szenario, Fallrätsel/Detektiv, Erklär es einem Freund).
5. **Plan:** Woche A/B, Wochentage, Ausfall-Eingabe mit Vorschlägen für die Lücke.
6. **Abendcheck:** Rückblick, Begründung bei Ausfall, Abendabfrage zum Tagesthema, Vaterunser, eigene Worte, "Jetzt lesen".
7. **Woche:** Zahlen ohne Schönfärberei, Lernzeit je Tag, Streak-Verlauf, Wochenherausforderung, Nutzung der Mechaniken.
8. **Mehr:** Zeiten, Wochentyp A/B, Sport pro Wochentag, Stundenplan-Editor, Motivationsmechaniken an/aus, Benachrichtigungen, Cloud, Sicherung, Testdaten, Test-Werkzeuge.

## Inhaltsformat (Pakete von Claude)

So läuft es: Unter *Lernen* (bei jedem Thema und unter *Importieren*) erzeugt die App einen **Auftrag zum Kopieren**. Du gibst ihn Claude im Chat, Claude liefert ein Paket, du importierst es unter *Lernen > Importieren* (JSON oder Markdown, einfügen oder Datei). Die App übernimmt den Inhalt **unverändert** (nur Leerraum am Rand entfällt). Sie kürzt nichts und lässt nichts stillschweigend weg: Ist etwas fehlerhaft, lehnt sie das Paket ab und sagt genau, was.

**Der Auftrag schreibt Claude vor:**
- Jede Aussage hat eine Quelle: Gesetze mit Paragraph, Fachbücher mit Autor und Ausgabe, offizielle Seiten (Bundesbank, EZB, Bundesregierung, Statistisches Bundesamt, Behörden, Hochschulen). Keine Blogs ohne Autor.
- Was nicht belegbar ist, wird als „unsicher“ markiert (`"uncertain": true` an der Stelle und in der Liste `uncertain`). Keine erfundenen Quellen, Paragraphen oder Zahlen.
- Das Feld `sources` ist immer da. Die App ordnet Erklärabschnitten ihre Quellen über `refs` zu.
- Eine Praxisaufgabe (`practice`) ist Pflicht.

**Was der Import prüft:** Ein Paket **ohne Quellen wird abgelehnt**, nicht nur gewarnt. Auch ein Paket, dessen einzige „Quelle“ ein Platzhalter ist, wird abgelehnt. Unvollständige Quizfragen, Szenarien oder Fälle führen zur Ablehnung. Zu lange Texte (über 20.000 Zeichen) werden gemeldet, nicht gekürzt. Fehlt am Anfang die öffnende geschweifte Klammer `{`, meldet die App „JSON unvollständig oder fehlerhaft“ mit Zeile oder fehlender Klammer, statt irreführend „topic fehlt“. Code-Zäune und Einleitungstext um das JSON stören nicht.

**In der Lektion:** Unsichere Aussagen stehen mit einem gelben Kennzeichen „unsicher“ im Text, in einem Kasten „Unsichere Aussagen“ und an einzelnen Karten und Fragen („unsicher belegt“). Die Quellen stehen unter jedem Abschnitt und am Ende.

Ein Paket (JSON) enthält: `topic`, `title`, `level`, `summary`, `sources`, `uncertain`, `explain` (mit `refs`), `terms`, `flashcards`, `quiz`, `questions`, `teachBack`, `practice` (Praxisaufgabe: `task`, `how`, `check`), `scenarios`, `cases`. Das vollständige Format steht in der App (aufklappbar) und in `src/engine/importer.js`. Markdown-Variante mit Abschnitten `## Erklärung`, `## Fachbegriffe`, `## Karteikarten`, `## Quiz`, `## Fragen`, `## Erkläre es einem Freund`, `## Praxisaufgabe`, `## Unsicher`, `## Quellen`. Mehrere Pakete trennt eine Zeile `---`.

**Themen:** Finanzen & Wirtschaft, Investieren, Programmieren, Verhandeln & Gesprächsführung, Menschen lesen, Sherlock-Denken, Bücher, Schule, Selbstverteidigung und neu **Gentleman & Charme**, **Rhetorik & freies Sprechen**, **Selbstorganisation & Zeitmanagement**, **Kleidung & Stil**. Jedes Thema hat Pakete mit Erklärung, Karten, Quiz und einer Praxisaufgabe am Ende der Lektion. Zukunftswissen umfasst weiter Schule und Finanzen.

**Platzhalter:** Die 16 mitgelieferten Pakete sind Platzhalter und nicht quellengeprüft. Sie sind sichtbar gekennzeichnet (Kennzeichen „Platzhalter“ bei jedem Thema und in jeder Lektion), bis ein importiertes Paket mit Quellen sie ersetzt. Ein Paket mit derselben ID ersetzt das Platzhalter-Paket.

Menschen lesen, Gesprächsführung, Gentleman und Rhetorik sind ausschließlich als ehrliche Kommunikation angelegt. Keine Anleitungen zum Manipulieren.

## Regeln der App (so habe ich sie umgesetzt)

- **Abendcheck:** Keine feste Uhrzeit. Nils startet ihn per Knopf, sobald er zu Hause ist. Der Plan reserviert die Zeit nach dem letzten Block (frühestens zur Richtzeit aus den Einstellungen, 21:30 Mo bis Fr). Eine Erinnerung darf kommen, aber der Abendcheck gilt nie automatisch als verpasst. Der Streak hängt nur an der Lernzeit.
- **Fokus:** Aufgaben zuerst. Freizeit gibt es erst nach den Aufgaben, über einen Knopf.
- **Freizeit:** Kein festes Limit mehr. Der Knopf **15 Minuten Freizeit** (Heute, auch in der Bock-Frage) fügt einen 15-Minuten-Block ganz vorn ein und schiebt alles Folgende nach hinten. Die App rechnet vorher durch: Würde dadurch eine Aufgabe nicht mehr vor den Abendcheck passen, lehnt sie ab und nennt die Aufgabe. So oft, wie der Tag es hergibt.
- **Streak:** Ein Tag zählt ab 5 Minuten Lernzeit (Lektionen, Hausaufgaben). Tagesring mit sechs Zielen: Lernen, Sport, Wasser, Selbstverteidigung, Lesen, 15 Minuten Zukunftswissen.
- **Zukunftswissen:** Lernzeit in Schule und Finanzen (Finanzen & Wirtschaft, Investieren, Schule) und Hausaufgaben. Lesen zählt nicht mehr dazu.
- **Verpasster Tag:** Keine 5 Minuten und keine akzeptierte Begründung bis Mitternacht: Tag verloren, Streak reißt. Beim nächsten Öffnen kommt die Meldung ("Du Versager", nur dafür, mit Vornamen, abschaltbar unter *Harter Ton*) und sofort der nächste Schritt.
- **Wiedereinstieg:** Drei Mini-Lektionen am Tag nach dem Ausfall setzen die Kette auf die **Hälfte des früheren Stands** (aufgerundet, der heutige Lerntag ist mitgezählt). Streak war 10, danach steht sie bei 5. Die App zeigt das oben auf Heute: „Noch 2 Mini-Lektionen, dann bist du bei 5“.
- **Begründung:** Eine akzeptierte pro Kalenderwoche. Sie braucht eine Kategorie, mindestens zwei Sätze und darf nicht "kein Bock/vergessen/keine Zeit" enthalten. Ausgleich am nächsten Tag: ein Block "Ausgleich für gestern" (15 Minuten) kommt vor die Freizeit, dazu eine Seite mehr lesen. Das ersetzt "15 Minuten weniger Freizeit", weil es kein festes Freizeitkonto mehr gibt (siehe `FRAGEN.md`).
- **Selbstverteidigung:** Jeden Tag 15 Minuten (3 Aufwärmen, 7 Schattenboxen, 5 Seilspringen), auch an Gym-Tagen. Sie wird vor Sport und Lesen eingeplant und fällt nicht aus dem Plan. Die Einstellung heißt *Selbstverteidigung pro Tag* (15, 20 oder 30 Minuten).
- **Gym:** Abends, frühestens 19:00, immer **75 Minuten inklusive Hin- und Rückweg** (einstellbar), ungekürzt, auch bei spätem Start (20:10 bis 21:25). Es gibt nur diese eine Zahl, überall. Die Beschreibung richtet sich nach der Uhrzeit („Training am Abend, inklusive Hin- und Rückweg“) und nennt keine Minuten. Passt es nicht mehr in den Tag, wird es nicht verkürzt, sondern wandert auf die nächsten Tage. **Joggen** ist flexibel, frühestens 16:00. In einer Ausfall-Lücke wird nur Joggen vorgeschlagen, nie Gym.
- **Handball:** Nur Montag (18:30 bis 20:15) und Freitag (18:00 bis 20:00). 20 Minuten Hinweg und 20 Minuten Rückweg sind als feste Blöcke eingeplant. In den Einstellungen ist Handball nur für Mo und Fr wählbar.
- **Hausaufgaben:** Unter *Hausaufgaben* eintragen (Fach, Aufgabe, Frist, Aufwand 30 Min, 1 Std oder 2 Std). Die App plant sie nach Frist in Stücken von höchstens 60 Minuten vor dem Lernen ein. Die Zeit zählt als Lernzeit und als Zukunftswissen.
- **Bücher:** "Die 1 %-Methode" und "Think and Grow Rich" sind angelegt (Seitenzahlen kannst du eintragen). Weitere Bücher fügst du unter *Lernen > Bücher* hinzu.
- **Nachholen:** Was bis zum Tagesende nicht mehr passt oder ausgelassen wurde (Lernen, Lesen, Selbstverteidigung, Sport), wandert auf die nächsten Tage (höchstens zwei Blöcke am Tag, nach 6 Tagen verfällt es).
- **Themenwahl:** Ein Thema bleibt mindestens 3 und höchstens 10 Tage dran, solange Lücken bleiben. Sitzt die Grundlage (Wissensstand ab 70 %, "Erklär es einem Freund" bestanden, mindestens zwei Sitzungen), wechselt die App zum am längsten nicht gelernten Thema. Bei Wiederkehr beginnt jede Sitzung mit einem Wissenscheck.
- **Wochenherausforderung:** Die Zielzahl für „Seitenfresser“ (120 Seiten) steht in den Einstellungen und ist jederzeit änderbar.
- **Wochentyp A/B:** Fortlaufend abwechselnd ab KW 47 = A (KW 48 = B), auch über den Jahreswechsel. Unter *Mehr* umstellbar. Der Stundenplan wurde gegen deine Tabelle geprüft: Montag A hat Informatik in 5/6, Montag B ist 5/6 frei. Freitag hat in Woche A Kunst und in Woche B Philosophie in 7/8, also nie früher Schluss.

### Annahmen

- Lernziel 45 Minuten Mo bis Fr, 60 am Wochenende. Ein Lernblock in einer Freistunde zählt dazu.
- Nach der Schule kommen 30 Minuten "Essen & runterkommen", dann die Frage "Was jetzt?". Am Wochenende 30 Minuten nach dem Aufstehen.
- Wer 2 Stunden nach der Aufstehzeit nicht "Ich bin wach" getippt hat, gilt als aufgestanden. Verschlafen geht jederzeit über den Knopf; Schulstunden vor der angegebenen Aufstehzeit werden als verschlafen markiert.
- Der Handball-Termin zählt als Sport, sobald er vorbei ist, außer Nils markiert ihn als ausgefallen.

## Design

Der Fokus der App heißt „Disziplin“, der iPhone-Kurzbefehl „Fokus Disziplin“. Ruhige dunkle Fläche, ein Akzent (Orange), starke Typografie, keine Emojis (eigene Linien-Symbole in `src/ui/icons.js`), kein Maskottchen. Die nächste Aufgabe ist die größte Karte auf der Startseite. Titel der Stufen: Stufe I, Konsequent, Verlässlich, Hartnäckig, Souverän, Eisern, Meister, Elite, Unbeugsam, Legende. Getestet in 375 px Breite (iPhone).

## Bekannte Lücken

- **Supabase ist noch nicht eingerichtet** (Tabellen, Push-Funktion, Zeitplan). Das kann ich ohne Zugriff auf dein Projekt nicht. Der Sync ist deshalb nicht gegen die echte Instanz getestet, die Migration nur lokal gegen Postgres. Erster echter Login ist der Test; Fehler stehen unter *Mehr > Cloud-Sync*.
- **Push bei geschlossener App** ist geschrieben, aber nicht deployt und nicht auf einem iPhone ausprobiert.
- **Kein Deployment**, Vercel gab 403.
- **Gleichzeitige Bearbeitung** auf zwei Geräten: pro Eintrag gewinnt die jüngere Änderung. Wer auf beiden gleichzeitig Wasser einträgt, überschreibt sich.
- **Echte App-Sperre** gibt es nicht (nur der Fokus-Kurzbefehl). Dafür braucht es die native App.
- **Mündliche Abfrage** nutzt die Spracherkennung des Browsers. In der Homescreen-App ist sie unzuverlässig. Fallback: Diktierfunktion der Tastatur.
- **Fokus-Kurzbefehl, Homescreen-Installation und Spracheingabe** habe ich nicht auf einem echten iPhone probiert.
- **Inhalte** sind Platzhalter, nicht quellengeprüft.
- **Abendcheck-Texte** liegen im Klartext in der Datenbank deines Kontos, ohne Ende-zu-Ende-Verschlüsselung.
- **Zeitzone** ist die des Geräts.
- Die Bonuspunkte der Wochenherausforderung holt Nils in der Woche-Ansicht per Knopf ab.
- **Übergänge:** Ich habe das Aufblitzen alten Inhalts beim Tab-Wechsel auf einfache Einblendung umgestellt und Schreibzugriffe beim Zeichnen entfernt, die zu einem zweiten Zeichnen führten. Ein Browser-Test sieht kein Flackern, auf deinem Gerät bitte nochmal prüfen.

## Daten und Sicherheit

- Keine Passwörter oder Schlüssel im Code. Zugang nur über Umgebungsvariablen (`.env` ist in `.gitignore`).
- Alle Cloud-Daten hängen an `auth.uid()` (Row Level Security). Ohne Login sieht niemand etwas.
- *Mehr > Sicherung* exportiert alles als JSON, *Sicherung laden* spielt es zurück.
