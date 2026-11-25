# Supabase einrichten (einmalig, ca. 10 Minuten)

Projekt: `hjlkaclimldsofvsevzd` (Disziplin). Ich selbst habe keinen Zugriff auf dieses Projekt, deshalb machst du diese Schritte.

## 1. Tabellen anlegen
Dashboard > **SQL Editor** > New query. Den kompletten Inhalt von `supabase/migrations/0001_disziplin.sql` einfügen, **Run**.
Danach unter **Advisors > Security** prüfen, dass keine Warnung zu fehlendem RLS erscheint.

## 2. Anmeldung
Dashboard > **Authentication > Sign In / Providers > Email**: aktiv lassen. *Confirm email* für den Anfang ausschalten.
In der App ein Konto mit E-Mail und Passwort anlegen. **Registrierung (Allow new users to sign up) bleibt vorerst an.**
Sobald dein Konto existiert, sag mir Bescheid, dann schalten wir sie ab (Authentication > Sign In / Providers > "Allow new users to sign up" aus).

## 3. Push (optional, für Erinnerungen bei geschlossener App)
```bash
npm i -g supabase            # oder: brew install supabase/tap/supabase
supabase login
supabase link --project-ref hjlkaclimldsofvsevzd
npx web-push generate-vapid-keys   # gibt Public und Private Key aus
```
- **Public Key** in `.env` als `VITE_VAPID_PUBLIC_KEY` und in Vercel als Umgebungsvariable.
- **Private Key** nur als Secret (nirgends sonst, nie ins Repo, nie in den Chat):
```bash
supabase secrets set VAPID_PUBLIC_KEY="<public>" VAPID_PRIVATE_KEY="<private>" VAPID_SUBJECT="mailto:deine@mail.de" CRON_SECRET="<ein langer zufälliger Text, den du selbst wählst>"
supabase functions deploy send-reminders
```
- `CRON_SECRET` brauchst du gleich noch einmal, Supabase zeigt den Wert später nicht mehr im Klartext. Merk ihn dir.
- `supabase/cron.sql` im SQL Editor ausführen, vorher `HIER-DEIN-CRON-SECRET` durch denselben Wert ersetzen.
- In der App: **Mehr > Benachrichtigungen > Erlauben**, dann **Push aktivieren**.

Test der Funktion (zeigt `{"sent":0,"hard":0}`, wenn nichts fällig ist):
```bash
curl -X POST https://hjlkaclimldsofvsevzd.supabase.co/functions/v1/send-reminders -H "x-cron-secret: <dein secret>"
```

## 4. Einladungen (Grundlage, noch nicht erzwungen)
Einen Einladungscode anlegen (SQL Editor):
```sql
insert into public.invites (code_hash) values (encode(sha256(convert_to('MEIN-CODE', 'UTF8')), 'hex'));
```
Die App löst den Code beim Registrieren ein, wenn die Adresse `?invite=MEIN-CODE` enthält. Erzwungen wird er erst, wenn die offene Registrierung abgeschaltet ist und die Registrierung über eine Edge Function mit Service-Key läuft (dafür frage ich dich dann).


## 5. Zugang für Claude (Supabase und Vercel)

Stand: Meine Verbindung sieht dein Supabase-Projekt "Disziplin" nicht, und Vercel meldet 403 für das Team `j-arvis`. Das liegt an den Freigaben der beiden Verbindungen, nicht an der App. Es gibt zwei Wege. **Weg A ist der bessere, es muss kein Geheimnis weitergegeben werden.**

### Weg A: Verbindung neu freigeben (OAuth, kein Token)
**Supabase**
1. In Claude: *Einstellungen > Konnektoren* (Connectors) > **Supabase** > trennen (Disconnect), dann neu verbinden.
2. Auf der Supabase-Seite, die sich öffnet, unter **Organization** die Organisation auswählen, in der das Projekt **Disziplin** liegt. Die bisher sichtbaren Projekte (JARVIS OS, Geld-Verdienen) gehören zu einer anderen Organisation. Welche das ist, siehst du im Dashboard links oben beim Projekt-Namen.
3. Bestätigen. Danach kann ich Tabellen anlegen, Funktionen deployen und Auth-Einstellungen lesen.

**Vercel**
1. In Claude: *Einstellungen > Konnektoren* > **Vercel** > trennen, dann neu verbinden.
2. Auf der Vercel-Zustimmungsseite das **Team auswählen**, in dem das Projekt liegt (bei dir `JARVIS`, Scope `j-arvis`). Wenn es dort mehrere Teams gibt, nur dieses auswählen.
3. Bestätigen.

Die genauen Beschriftungen kann ich von hier nicht sehen, sie können abweichen.

### Weg B: Token über das sichere Formular (nur wenn A nicht klappt)
Gib mir **keinen Schlüssel im Chat**. Sag mir stattdessen, dass du Weg B nutzen willst. Dann öffne ich ein Formular, in das du den Wert einträgst. Er wird auf der Umgebung gespeichert, ich sehe ihn nie.

**Supabase: Personal Access Token**
1. Dashboard > Profilbild unten links > **Account Preferences** > **Access Tokens** (supabase.com/dashboard/account/tokens).
2. **Generate new token**, Name `claude-disziplin`, Ablauf möglichst kurz (z. B. 7 Tage).
3. Wert kopieren (er wird nur einmal gezeigt) und in das Formular einfügen.
Mindestrechte: Ein Personal Access Token hat die Rechte deines gesamten Kontos und lässt sich nicht auf ein Projekt beschränken (Stand meines Wissens, prüfe bitte, ob Supabase inzwischen feinere Rechte anbietet). Deshalb Ablauf kurz halten und das Token danach löschen. Benötigt werden: SQL ausführen, Migrationen, Edge Functions deployen, Auth-Einstellungen.

**Vercel: Access Token**
1. vercel.com > Profilbild oben rechts > **Account Settings** > **Tokens** (vercel.com/account/tokens).
2. **Create Token**, Name `claude-disziplin`, **Scope = nur das Team `JARVIS`** (nicht "Full Account"), Ablauf kurz (z. B. 7 Tage).
3. Wert kopieren und in das Formular einfügen.
Mindestrechte: Vercel-Tokens haben keine feineren Rechte als den Scope. Du brauchst eine Rolle im Team, die Projekte anlegen, Umgebungsvariablen setzen und deployen darf (Owner oder Member). Das Hobby-Team genügt.

### Danach
Sag mir Bescheid, welchen Weg du gegangen bist. Ich prüfe zuerst nur lesend (Projekte auflisten), bevor ich etwas ändere. Ich lege nichts an, was Geld kostet, ohne es dir vorher zu nennen.
