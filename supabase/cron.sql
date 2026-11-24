-- Jede Minute die Edge Function aufrufen. Im SQL Editor ausführen, NACHDEM die Funktion deployt
-- und die Secrets gesetzt sind. Den Platzhalter durch dein CRON_SECRET ersetzen (nicht committen!).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://hjlkaclimldsofvsevzd.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'HIER-DEIN-CRON-SECRET'),
    body := '{}'::jsonb
  );
  $$
);

-- Wieder abschalten:  select cron.unschedule('send-reminders');
