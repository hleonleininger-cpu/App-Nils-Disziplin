# Disziplin

Persönliche Lern- und Alltags-App für Nils. Sie kennt den ganzen Tag (Stundenplan, feste Termine, flexible Aufgaben) und zeigt jederzeit genau eine Sache: **Das ist jetzt dran.** Motto: Disziplin schlägt Motivation.

Version 1, über Nacht gebaut. **Noch nicht deployt** (Vercel-Zugriff wurde abgewiesen, siehe FRAGEN.md Nr. 13). Sie läuft, ist getestet (57 Unit-Tests, ein End-to-End-Lauf mit simulierten Tagen) und hat bekannte Lücken, die unten stehen.

## Start

```bash
npm install
npm run dev        # Entwicklung, http://localhost:5173
npm test           # Unit-Tests (Plan, Streak, Import, Lernen, Aktionen)
npm run build      # Produktions-Build nach dist/
npm run e2e        # spielt Tage im Browser durch, Screenshots in ./e2e-shots (vorher npm run build)
```

Ohne weitere Einrichtung läuft die App im **Lokal-Modus**: alles liegt im Browser dieses Geräts, kein Login, keine Synchronisierung. Für Sync zwischen iPhone, MacBook und PC braucht es Supabase (nächster Abschnitt).

Beim ersten Start fragt die App: **Mit Testdaten starten** (14 Tage Verlauf mit einem verpassten und einem entschuldigten Tag, zwei Bücher) oder **Sauber starten**. Beides lässt sich unter *Mehr* jederzeit wiederholen.

### Test-Werkzeuge (Mehr, ganz unten)

- **Test-Uhr:** Datum und Uhrzeit simulieren. So spielst du Morgen, Schulschluss, Abendcheck, den nächsten Tag oder einen verpassten Tag durch, ohne zu warten. Ein roter Hinweis unten links zeigt, dass die Test-Uhr aktiv ist.
- **Lernzeit-Beschleuniger:** ×60 lässt eine Sekunde als Minute zählen, damit die 5-Minuten-Regel in ein paar Sekunden erfüllt ist. Danach wieder auf ×1.

## Cloud-Sync mit Supabase (kostenloser Tarif)

Ich habe **kein** Supabase-Projekt angelegt, weil dafür ein Konto und je nach Organisation Kosten anfallen können. Der kostenlose Tarif reicht. Einrichtung, etwa 10 Minuten:

1. Auf supabase.com ein Projekt anlegen (Free).
2. Im *SQL Editor* den Inhalt von `supabase/schema.sql` ausführen. Das legt die Tabelle `records` mit Row Level Security an: jeder Eintrag gehört nur dem eigenen Konto.
3. *Authentication > Providers > Email* aktivieren. Für den Anfang *Confirm email* ausschalten, dann geht die Anmeldung sofort.
4. In der App ein Konto mit E-Mail und Passwort anlegen.
5. **Danach unter Authentication > Sign In / Providers "Allow new users to sign up" ausschalten.** Sonst könnte jeder, der die Adresse kennt, ein eigenes Konto anlegen (er sähe zwar nur seine eigenen Daten, aber der Platz ist begrenzt).
6. Unter *Project Settings > API* die *Project URL* und den *anon public key* kopieren und als Umgebungsvariablen setzen:
   - lokal: `.env.local` (Vorlage `.env.example`)
   - Vercel: *Project Settings > Environment Variables*: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Der anon-Key ist öffentlich gedacht. Geschützt werden die Daten durch Row Level Security, nicht durch Geheimhaltung des Keys. Der `service_role`-Key kommt **nie** in die App.

**Wie der Sync arbeitet:** Jeder Tag (`day:2026-11-23`), die Einstellungen, der Stundenplan, Lernstand, Bücher und importierte Pakete sind einzelne Einträge mit Zeitstempel. Beim Start, beim Zurückkehren in die App und alle 60 Sekunden werden neuere Einträge geholt, lokale Änderungen hochgeladen. Bei Konflikten gewinnt pro Eintrag die jüngere Änderung. Wer auf zwei Geräten gleichzeitig denselben Tag bearbeitet, kann einzelne Änderungen verlieren (siehe Lücken).

Anmeldung am iPhone: Passwort funktioniert in der Homescreen-App am zuverlässigsten. Der Link-Login per E-Mail öffnet Safari statt der Homescreen-App und meldet dort an, nicht in der App. Deshalb gibt es zusätzlich die Anmeldung mit 6-stelligem Code (im E-Mail-Template von Supabase muss dafür `{{ .Token }}` stehen).

## Deployment (Vercel, kostenloser Hobby-Tarif)

Die App ist eine statische Vite-App, `vercel.json` ist vorbereitet.

1. Repository bei Vercel importieren (*Add New > Project*). Build-Befehl `npm run build`, Ausgabe `dist` (steht schon in `vercel.json`).
2. Umgebungsvariablen aus dem vorigen Abschnitt eintragen.
3. Deploy. Die URL ist der Link für Nils.

Mit `npx vercel` aus dem Projektordner geht es auch direkt von der Kommandozeile.

## Auf den iPhone-Homescreen

1. Link in **Safari** öffnen (nicht in einer anderen App).
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. **Zum Home-Bildschirm** wählen, **Hinzufügen**.
4. Von dort öffnen. Nur so laufen Vollbild und Benachrichtigungen.

Auf Mac/PC reicht der Browser. In Chrome und Edge gibt es oben rechts ein Installieren-Symbol.

## Fokus-Kurzbefehl (iPhone)

Der Button **Fokus starten** auf der Lern-Karte ruft den Kurzbefehl `shortcuts://run-shortcut?name=Fokus%20Lernen` auf. Anlegen:

1. *Einstellungen > Fokus > +* einen Fokus "Lernen" erstellen. Dort festlegen, welche Personen und Apps Meldungen schicken dürfen (am besten: keine) und optional, welche Homescreen-Seiten sichtbar sind.
2. *Kurzbefehle*-App öffnen, **+**, Aktion **Fokus festlegen** hinzufügen: Fokus *Lernen*, *Einschalten*, *Bis ich ihn ausschalte*.
3. Den Kurzbefehl genau **Fokus Lernen** nennen. Anderen Namen? Dann unter *Mehr > Fokus und Benachrichtigungen* den Namen anpassen.
4. Test: In Safari `shortcuts://run-shortcut?name=Fokus%20Lernen` eintippen.

Ehrlich dazu: Ein Fokus stellt Meldungen ab und kann Homescreen-Seiten ausblenden. Er **sperrt keine Apps**. Eine echte App-Sperre geht auf dem iPhone nur mit einer nativen App (Screen-Time-API). Ich habe den Aufruf nicht auf einem echten iPhone ausprobieren können.
Auf Mac und PC zeigt der Button einen Hinweis auf Website-Blocker (Fokus-Modus des Systems oder ein Blocker wie Cold Turkey).

## Benachrichtigungen auf iOS: was geht, was nicht

| | Geht | Geht nicht |
|---|---|---|
| App offen oder im Vordergrund | Alle Erinnerungen (Wasser, Lernen, Sport, Lesen, Abendcheck) als Hinweis in der App, mit Ein-Tipp-Antwort und zweiter, härterer Nachricht nach 10 Minuten ohne Reaktion | |
| Homescreen-App, geschlossen | Nur mit Server-Push (siehe unten) | Ohne Server kommt nichts. Das ist eine Grenze von iOS, nicht der App. |
| Safari-Tab | | Web-Push geht auf iOS nur in der zum Homescreen hinzugefügten App (iOS 16.4 oder neuer) |
| Zeitgesteuert lokal planen | | Das Notification-Triggers-API gibt es in Safari nicht |

Der gesamte Code dafür liegt in `src/core/notify.js` und in `public/sw.js`. Eine spätere native App ersetzt nur dieses Modul.

**Push bei geschlossener App (Grundgerüst, ungetestet):**
1. `npx web-push generate-vapid-keys`. Public Key als `VITE_VAPID_PUBLIC_KEY` setzen.
2. In `supabase/functions/send-reminders` liegt eine Edge Function. Deployen (`supabase functions deploy send-reminders`) und Secrets setzen: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
3. Jede Minute aufrufen, z. B. mit `pg_cron` und `pg_net`:
   ```sql
   select cron.schedule('send-reminders', '* * * * *', $$
     select net.http_post('https://<projekt>.supabase.co/functions/v1/send-reminders',
       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb)
   $$);
   ```
4. In der App *Mehr > Benachrichtigungen erlauben*. Die App legt die Erinnerungen des Tages in der Tabelle `reminders` ab (`syncReminders` in `notify.js`). Diese Verdrahtung ist noch nicht an einen Button gehängt, siehe Lücken.

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

Unter *Lernen > Importieren* fügst du ein Paket als **JSON** oder **Markdown** ein. Die App prüft es, zeigt Fehler und Warnungen und legt es erst nach Bestätigung ab. Der Knopf *Auftrag kopieren* erzeugt den fertigen Text für Claude Code, inklusive Format, Hinweis auf verlässliche Quellen und bereits vorhandener Lektionen. Am Vorabend zeigt der Abendcheck das Thema für morgen.

Ein Paket (JSON) enthält: `topic`, `title`, `level`, `summary`, `sources`, `explain` (Abschnitte), `terms` (Fachbegriffe), `flashcards`, `quiz` (Auswahl mit `answer`-Index), `questions` (offene Fragen mit Stichwörtern `keyPoints`), `teachBack` (Aufgabe, Pflichtbegriffe, Nachfragen), `scenarios`, `cases` (Fallrätsel und Detektiv). Das vollständige Format steht in der App (aufklappbar) und in `src/engine/importer.js`. Markdown-Variante: Überschriften `## Erklärung`, `## Fachbegriffe`, `## Karteikarten`, `## Quiz`, `## Fragen`, `## Erkläre es einem Freund`, `## Quellen`. Mehrere Pakete trennt eine Zeile `---`.

Mitgeliefert sind 11 **Platzhalter-Pakete** (eines bis zwei pro Thema). Sie sind **nicht quellengeprüft** und dienen nur zum Testen. Ersetzen, sobald echte Pakete da sind.

Menschen lesen und Gesprächsführung sind ausschließlich als ehrliche Kommunikation angelegt (Zuhören, Fragen, Körpersprache einordnen, Grenzen kennen). Keine Anleitungen zum Manipulieren.

## Regeln der App (so habe ich sie umgesetzt)

- **Streak:** Ein Tag zählt ab 5 Minuten echter Lernzeit (gemessen, solange die Lernsitzung sichtbar ist). Der Tagesring zeigt sechs Ziele: Lernen, Sport, Wasser, Selbstverteidigung, Lesen, 15 Minuten Zukunftswissen.
- **Verpasster Tag:** Keine 5 Minuten und keine akzeptierte Begründung bis Mitternacht heißt: Tag verloren, Streak reißt. Beim nächsten Öffnen kommt die Meldung ("Du Versager", nur dafür, mit Vornamen, abschaltbar unter *Harter Ton*) und sofort der nächste Schritt.
- **Wiedereinstieg:** Drei Mini-Lektionen am Tag nach dem Ausfall stellen die **Hälfte** der alten Kette wieder her (aufgerundet).
- **Begründung:** Am Abendcheck, wenn weniger als 5 Minuten gelernt wurden. Angenommen wird sie, wenn eine Kategorie gewählt ist, mindestens zwei Sätze (20 Zeichen, vier Wörter) dastehen, kein "kein Bock/vergessen/keine Zeit" drinsteht und in den letzten 7 Tagen weniger als 2 Begründungen akzeptiert wurden (einstellbar). Ausgleich am nächsten Tag: 15 Minuten weniger Freizeit, eine Seite mehr lesen. Die Prüfung ist eine Heuristik, die App kann die Wahrheit nicht prüfen.
- **Freizeit:** 60 Minuten pro Tag (einstellbar). Wird beim Beenden mit der echten Zeit verrechnet. Ist das Limit verbraucht, sperrt die App die Option und sagt es deutlich.
- **Nachholen:** Was bis zum Tagesende nicht mehr passt oder ausgelassen wurde (Lernen, Lesen, Selbstverteidigung, Sport), wandert auf die nächsten Tage (maximal zwei Blöcke am Tag, nach 6 Tagen verfällt es).
- **Themenwahl:** Ein Thema bleibt mindestens 3 und höchstens 10 Tage am Stück, solange noch Lücken da sind. Sitzt die Grundlage (Wissensstand ab 70 %, mindestens einmal "Erklär es einem Freund" bestanden, mindestens zwei Sitzungen), wechselt die App zum am längsten nicht gelernten Thema. Bei Wiederkehr beginnt jede Sitzung mit einem Wissenscheck.
- **Wochentyp A/B:** Fortlaufend abwechselnd ab KW 47 = A (KW 48 = B). Das entspricht ungerade = A, gerade = B, läuft aber auch über den Jahreswechsel mit KW 53 sauber weiter. Unter *Mehr* umstellbar.

### Annahmen, die ich getroffen habe

- Alle sieben Wochentage haben Sport (Mo/Fr Handball, Di/Do/So Gym, Mi/Sa Joggen). Deshalb sind es bei Selbstverteidigung immer die gekürzten 15 Minuten. Schalter für immer 30 unter *Mehr*.
- Gym dauert 75 Minuten, Joggen 45 (einstellbar). Sport frühestens 16:00.
- Lernziel 45 Minuten Mo bis Fr, 60 am Wochenende. Ein Lernblock in einer Freistunde zählt dazu.
- Zukunftswissen = Lernzeit in allen Themen außer Schule, plus Lesezeit.
- Nach der Schule kommt 30 Minuten "Essen & runterkommen", dann die Frage "Worauf hast du Bock?". Am Wochenende kommt die Frage 30 Minuten nach dem Aufstehen.
- Wer 2 Stunden nach der Aufstehzeit nicht "Ich bin wach" getippt hat, gilt als aufgestanden (sonst hinge der Tag fest). Verschlafen geht jederzeit über den Knopf.
- Schulstunden, die vor einer verschlafenen Aufstehzeit liegen, werden als verschlafen markiert.
- Der Handball-Termin zählt als Sport, sobald er vorbei ist, außer Nils markiert ihn als ausgefallen.
- Stundenplan: Ausfälle aus dem Schulplan werden ignoriert, alles zählt als regulärer Unterricht. Ausfälle trägt Nils selbst ein.

## Bekannte Lücken

- **Push bei geschlossener App** ist nur als Grundgerüst vorhanden (Schema, Edge Function, Client-Code), nicht eingerichtet, nicht getestet und nicht an einen Knopf in der Oberfläche gehängt. Ohne das gibt es Erinnerungen nur, solange die App offen oder kurz im Hintergrund ist.
- **Cloud-Sync ist nicht gegen echte Supabase-Instanz getestet**, weil ich kein Projekt angelegt habe. Die Logik ist geschrieben und der Build läuft, aber der erste echte Login ist der Test. Fehler stehen dann unter *Mehr > Cloud-Sync*.
- **Gleichzeitige Bearbeitung** auf zwei Geräten: pro Eintrag gewinnt die jüngere Änderung. Zwei Geräte, die gleichzeitig Wasser eintragen, überschreiben sich.
- **Echte App-Sperre** gibt es nicht (nur der Fokus-Kurzbefehl). Dafür braucht es die native App.
- **Mündliche Abfrage** nutzt die Spracherkennung des Browsers. In der iPhone-Homescreen-App ist sie unzuverlässig oder fehlt. Fallback: die Diktierfunktion der Tastatur.
- **Fokus-Kurzbefehl, Homescreen-Installation und Spracheingabe** habe ich nicht auf einem echten iPhone probiert. Getestet wurde mit Chromium in Handy-Größe.
- **Inhalte** sind Platzhalter, nicht quellengeprüft. Es gibt keine Bilder, Audio oder Videos.
- **Texte des Abendcheck** (Rückblick, Gebet, eigene Worte) bleiben lokal und in der Cloud als Klartext in der Datenbank deines Kontos. Es gibt keine Ende-zu-Ende-Verschlüsselung.
- **Zeitzone** ist die des Geräts. Reisen in andere Zeitzonen sind nicht bedacht.
- **Design:** Das ist ein erster Wurf. Farben, Maskottchen und Animationen sind Vorschläge für Nils' Feedback.
- Die Bonuspunkte der Wochenherausforderung muss Nils in der Woche-Ansicht per Knopf abholen.
- Systemmeldungen haben keine Aktionsknöpfe (+250 ml). Die gibt es nur in der App selbst.

## Daten und Sicherheit

- Keine Passwörter oder Schlüssel im Code. Zugang nur über Umgebungsvariablen (`.env.local` ist in `.gitignore`).
- Alle Cloud-Daten hängen an `auth.uid()` (Row Level Security). Ohne Login sieht niemand etwas.
- *Mehr > Sicherung* exportiert alles als JSON, *Sicherung laden* spielt es zurück.
