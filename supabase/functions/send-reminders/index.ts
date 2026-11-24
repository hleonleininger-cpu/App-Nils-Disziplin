// Edge Function: verschickt fällige Erinnerungen per Web-Push (auch bei geschlossener App).
// Wird jede Minute von pg_cron aufgerufen (supabase/cron.sql) und ist über ein geteiltes Geheimnis geschützt.
// Secrets (nie im Code): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase der Funktion automatisch bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

async function push(userId: string, payload: Record<string, string>) {
  const { data: subs } = await db.from('push_subscriptions').select('endpoint,subscription').eq('user_id', userId);
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify(payload));
    } catch (e) {
      // 404/410: das Abo ist abgelaufen, aufräumen
      if ([404, 410].includes((e as { statusCode?: number }).statusCode ?? 0)) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('forbidden', { status: 403 });

  const now = new Date();
  const iso = (ms: number) => new Date(now.getTime() - ms).toISOString();
  // Fällig und höchstens 20 Minuten alt (damit nach einer Pause nicht alles auf einmal kommt)
  const { data: due } = await db.from('reminders').select('*').eq('sent', false).lte('fire_at', now.toISOString()).gte('fire_at', iso(20 * 60000));
  for (const r of due ?? []) {
    await push(r.user_id, { title: r.title, body: r.body, tag: r.tag ?? r.rid });
    await db.from('reminders').update({ sent: true }).match({ user_id: r.user_id, rid: r.rid });
  }
  // Zweite, härtere Nachricht, wenn nach 10 Minuten keine Reaktion kam
  const { data: hard } = await db.from('reminders').select('*').eq('sent', true).eq('acked', false).eq('hard_sent', false).lte('fire_at', iso(10 * 60000)).gte('fire_at', iso(40 * 60000));
  for (const r of hard ?? []) {
    if (r.hard_body) await push(r.user_id, { title: 'Nils.', body: r.hard_body, tag: (r.tag ?? r.rid) + '-hart' });
    await db.from('reminders').update({ hard_sent: true }).match({ user_id: r.user_id, rid: r.rid });
  }
  return new Response(JSON.stringify({ sent: due?.length ?? 0, hard: hard?.length ?? 0 }), { headers: { 'content-type': 'application/json' } });
});
