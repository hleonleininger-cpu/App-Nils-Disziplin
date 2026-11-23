// UNGETESTET: Edge Function, die fällige Erinnerungen per Web-Push verschickt.
// Aufruf jede Minute per pg_cron + pg_net (siehe README, Abschnitt "Push bei geschlossener App").
// Benötigte Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), SUPABASE_SERVICE_ROLE_KEY.
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
      // 404/410: Abo ist weg, aufräumen
      if ([404, 410].includes((e as { statusCode?: number }).statusCode ?? 0)) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
}

Deno.serve(async () => {
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60000).toISOString();
  const { data: due } = await db.from('reminders').select('*').eq('sent', false).lte('fire_at', now.toISOString()).gte('fire_at', new Date(now.getTime() - 20 * 60000).toISOString());
  for (const r of due ?? []) {
    await push(r.user_id, { title: r.title, body: r.body, tag: r.tag ?? r.rid });
    await db.from('reminders').update({ sent: true }).match({ user_id: r.user_id, rid: r.rid });
  }
  // zweite, härtere Nachricht, wenn nach 10 Minuten keine Reaktion kam
  const { data: hard } = await db.from('reminders').select('*').eq('sent', true).eq('acked', false).eq('hard_sent', false).lte('fire_at', tenMinAgo).gte('fire_at', new Date(now.getTime() - 40 * 60000).toISOString());
  for (const r of hard ?? []) {
    if (r.hard_body) await push(r.user_id, { title: 'Nils.', body: r.hard_body, tag: (r.tag ?? r.rid) + '-hart' });
    await db.from('reminders').update({ hard_sent: true }).match({ user_id: r.user_id, rid: r.rid });
  }
  return new Response(JSON.stringify({ sent: due?.length ?? 0, hard: hard?.length ?? 0 }), { headers: { 'content-type': 'application/json' } });
});
