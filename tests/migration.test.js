import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

// Prüft die Migration gegen eine echte Postgres-Engine (mit Stubs für das Supabase-auth-Schema).
describe('SQL-Migration', () => {
  it('läuft durch, aktiviert RLS überall und trennt Nutzer', async () => {
    const db = new PGlite();
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create role authenticated; create role anon;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
    `);
    await db.exec(fs.readFileSync(new URL('../supabase/migrations/0001_disziplin.sql', import.meta.url), 'utf8'));
    const rls = await db.query(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`);
    expect(rls.rows.length).toBeGreaterThanOrEqual(12);
    for (const r of rls.rows) expect(r.relrowsecurity, r.relname).toBe(true);
    await db.exec(`grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated; grant select on auth.users to authenticated;`);
    const a = '11111111-1111-1111-1111-111111111111';
    const b = '22222222-2222-2222-2222-222222222222';
    await db.exec(`insert into auth.users values ('${a}'), ('${b}')`);
    await db.exec(`set role authenticated; set request.uid = '${a}';`);
    await db.exec(`insert into public.day_log (day, data) values ('2026-11-24', '{"v":{"water":500}}')`);
    expect((await db.query('select * from public.day_log')).rows).toHaveLength(1);
    await db.exec(`set request.uid = '${b}';`);
    expect((await db.query('select * from public.day_log')).rows).toHaveLength(0);
    await expect(db.exec(`insert into public.day_log (user_id, day, data) values ('${a}', '2026-11-25', '{}')`)).rejects.toThrow();
    // Einladung
    await db.exec(`reset role; insert into public.invites (code_hash) values (encode(sha256(convert_to('abc','UTF8')),'hex')); set role authenticated; set request.uid = '${b}';`);
    expect((await db.query(`select public.redeem_invite('abc') as ok`)).rows[0].ok).toBe(true);
    expect((await db.query(`select public.redeem_invite('abc') as ok`)).rows[0].ok).toBe(false);
    expect((await db.query(`select public.redeem_invite('falsch') as ok`)).rows[0].ok).toBe(false);
    expect((await db.query('select * from public.invites')).rows).toHaveLength(0); // Clients sehen keine Einladungen
  }, 60000);
});
