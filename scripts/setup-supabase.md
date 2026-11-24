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
