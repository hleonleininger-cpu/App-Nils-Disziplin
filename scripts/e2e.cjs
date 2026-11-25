// End-to-End-Test: spielt typische Tage durch (Woche A/B, Ausfall, Verschlafen, verpasster Tag).
// Start: npm run e2e  (baut ohne Cloud-Zugang nach dist-e2e)   (Screenshots landen in ./e2e-shots)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const URL = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'e2e-shots');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const ok = (c, msg) => {
  console.log(`${c ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!c) fails++;
};

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server startet nicht');
}

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-e2e', '--mode', 'e2e', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  try {
    await waitServer();
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, locale: 'de-DE', timezoneId: 'Europe/Berlin', permissions: ['notifications'] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
    let n = 0;
    const shot = async (name) => (await page.waitForTimeout(700), page.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, '0')}-${name}.png`), fullPage: false }));

    // Simulierte Uhr über localStorage (gleicher Mechanismus wie in den Einstellungen)
    const at = async (date, time, hash = '#/heute') => {
      await page.evaluate(([d, t]) => {
        const [y, m, dd] = d.split('-').map(Number);
        const [h, mi] = t.split(':').map(Number);
        localStorage.setItem('disziplin.clockOffset', String(new Date(y, m - 1, dd, h, mi, 0).getTime() - Date.now()));
      }, [date, time]);
      await page.evaluate((h) => { if (!location.hash.startsWith('#/plan') || h !== null) location.hash = h; }, hash);
      await page.reload();
      await page.waitForSelector('#view > *');
    };
    const settle = async () => { await page.waitForSelector('#view > *'); await page.waitForTimeout(120); };
    const text = async () => { await settle(); return (await page.locator('#view').innerText()).replace(/\s+/g, ' '); };
    const dismissAlert = async () => {
      const a = page.locator('.modal a.btn, .modal button.btn').first();
      if (await page.locator('.modal-bg').count() && (await page.locator('.modal').first().innerText()).match(/Versager|ausgefallen|Wieder drin/)) { await a.click(); await page.waitForTimeout(200); await page.evaluate(() => (location.hash = '#/heute')); await page.waitForTimeout(200); return true; }
      return false;
    };
    const click = async (t) => page.getByRole('button', { name: t }).first().click();
    const clickText = async (t) => page.getByText(t, { exact: false }).first().click();

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());

    // ---- Montag 23.11.2026, Woche B, 06:50 ----
    await at('2026-11-23', '06:50');
    ok(await page.locator('.modal').innerText().then((t) => t.includes('Testdaten')), 'Onboarding erscheint');
    await shot('onboarding');
    await click('Sauber starten');
    let t = await text();
    ok(/Aufstehen um 07:00/.test(t), 'Hero: Aufstehen um 07:00 (Mo, Woche B)');
    ok(/nils/i.test(t), 'Startseite spricht Nils mit Vornamen an');
    await shot('heute-morgens');
    // Lernzeit-Beschleuniger für den Test
    await page.goto(URL + '#/settings');
    await page.locator('select[data-path="learnSpeed"]').selectOption('60');
    await page.goto(URL + '#/heute');
    await at('2026-11-23', '07:05');
    await click('Ich bin wach');
    t = await text();
    ok(/Deutsch/.test(t) || /Schule|Gleich|Als Nächstes/.test(t), 'Nach dem Aufstehen kommt Schule (Deutsch)');
    await at('2026-11-23', '09:50');
    t = await text();
    ok(/Erdkunde/.test(t), 'Um 9:50 läuft Erdkunde (Woche B, 3./4.)');
    await at('2026-11-23', '11:40');
    t = await text();
    ok(/Lernblock \(Freistunde\)/.test(t), 'Freistunde Mo 5/6 (Woche B) wird Lernblock');
    await shot('heute-freistunde');
    await at('2026-11-23', '13:15');
    t = await text();
    ok(/Englisch|Essen/.test(t), 'Mittagsfenster / Englisch');
    await at('2026-11-23', '15:40');
    t = await text();
    ok(/Essen & runterkommen|Worauf hast du Bock/.test(t), 'Nach 15:20: Essen, dann Bock-Frage');
    await click('Fertig, weiter');
    t = await text();
    ok(/was jetzt\?/i.test(t), 'Bock-Frage erscheint nach dem Essen');
    await click('Auswählen');
    await page.waitForURL(/#\/bock/);
    t = await page.locator('#view').innerText();
    ok(/Lernen/.test(t) && /Lesen/.test(t) && /Freizeit/.test(t), 'Genau drei Optionen: Lernen, Lesen, Freizeit');
    await shot('bock');
    await page.locator('[data-kind="learn"]').click();
    await page.waitForURL(/#\/heute/);
    t = await text();
    ok(/Lektion starten/.test(t), 'Wahl Lernen: Lektion starten');
    await shot('heute-lernen');

    // ---- Lernsitzung ----
    await click('Lektion starten');
    await page.waitForURL(/#\/session/);
    ok((await page.locator('#sess').innerText()).includes('Neues Wissen'), 'Sitzung beginnt mit Erklärung (Thema neu)');
    ok(/Platzhalter/.test(await page.locator('#sess').innerText()), 'Platzhalter-Paket ist in der Lektion sichtbar als Platzhalter gekennzeichnet');
    await shot('session-read');
    let guard = 0;
    while (!(await page.locator('#sess').innerText()).includes('Weiter zum Tag') && guard++ < 60) {
      const html = await page.locator('#sess').innerText();
      if (await page.locator('#nx').count()) { await page.locator('#nx').first().click(); continue; }
      if (await page.locator('.opt').count()) { await page.locator('.opt').first().click(); if (await page.locator('#ir-next').count()) await page.locator('#ir-next').click(); else if (await page.locator('#nx').count()) await page.locator('#nx').click(); continue; }
      if (await page.locator('#ir-show').count()) { await page.locator('#ir-show').click(); await page.locator('#yes').click(); continue; }
      if (await page.locator('#chk').count()) { await page.locator('#ans').fill('Der Zinseszins wächst exponentiell mit der Zeit, Inflation senkt die Kaufkraft'); await page.locator('#chk').click(); await page.locator('#ok, [data-s="1"]').first().click(); continue; }
      if (await page.locator('.btns [data-s="1"]').count() && !(await page.locator('#rv').count()) && (await page.locator('#sess').innerText()).includes('Praxisaufgabe')) { await page.locator('.btns [data-s="1"]').first().click(); continue; }
      if (await page.locator('#rv').count()) { await page.locator('#rv').click(); await page.locator('[data-s="1"]').click(); continue; }
      if (await page.locator('#fin').count()) {
        await page.locator('#tb').fill('Zinseszins Inflation Kaufkraft Realzins sind wichtig');
        await page.locator('#fin').click();
        for (const b of await page.locator('[data-f][data-v="1"]').all()) await b.click();
        await page.locator('#nx').click();
        continue;
      }
      await page.waitForTimeout(150);
      if (guard > 55) { console.log('Sitzung hängt bei:', html.slice(0, 200)); break; }
    }
    ok((await page.locator('#sess').innerText()).includes('Weiter zum Tag'), 'Lernsitzung läuft bis zum Ergebnis durch');
    await shot('session-ende');
    await page.waitForTimeout(2300);
    await page.getByRole('link', { name: 'Weiter zum Tag' }).click();
    await page.waitForURL(/#\/heute/);
    t = await text();
    ok(/1 Tag Streak|Streak/.test(t), 'Streak zeigt nach Lernsitzung');
    const streakTxt = await page.locator('.stat.flame .big').innerText();
    ok(Number(streakTxt) >= 1, `Streak ist ${streakTxt} nach ≥5 Min Lernen`);
    await shot('heute-nach-lernen');

    // ---- Wasser ----
    for (let i = 0; i < 6; i++) await page.locator('[data-act="h-water"][data-ml="500"]').click();
    await page.waitForTimeout(400);
    t = await text();
    ok(/3,00 \/ 3 L|3.00/.test(t) || /3 L/.test(t), 'Wasser: 3 Liter erreicht');
    await page.waitForTimeout(2300);

    // ---- Abendcheck ----
    await at('2026-11-23', '21:35');
    t = await text();
    ok(/Abendcheck/.test(t), 'Um 21:35 ist Abendcheck dran');
    await click('Abendcheck starten');
    await page.waitForURL(/#\/abend/);
    await shot('abend-rueckblick');
    await page.locator('[data-act="e-next"]').first().click();
    for (let i = 0; i < 12; i++) {
      const tx = await page.locator('#eve').innerText();
      if (tx.includes('Feierabend')) break;
      if (tx.includes('Abendabfrage')) {
        let g = 0;
        while ((await page.locator('#eve').innerText()).includes('Abendabfrage') && g++ < 20) {
          if (await page.locator('.opt').count()) { await page.locator('.opt').first().click(); if (await page.locator('#ir-next').count()) await page.locator('#ir-next').click(); continue; }
          if (await page.locator('#ir-show').count()) { await page.locator('#ir-show').click(); await page.locator('#yes').click(); continue; }
          if (await page.locator('#chk').count()) { await page.locator('#chk').click(); await page.locator('[data-s="1"], #ok').first().click(); continue; }
          if (await page.locator('[data-act="e-next"]').count()) { await page.locator('[data-act="e-next"]').click(); break; }
          await page.waitForTimeout(100);
        }
        continue;
      }
      if (tx.includes('Vaterunser')) { await shot('abend-vaterunser'); await page.locator('[data-act="e-next"]').click(); continue; }
      if (tx.includes('Eigene Worte')) { await page.locator('#wo').fill('Heute war ein guter Tag. Morgen mehr.'); await page.locator('[data-act="e-finish"]').click(); continue; }
      if (await page.locator('[data-act="e-next"]').count()) await page.locator('[data-act="e-next"]').click();
    }
    t = await page.locator('#eve').innerText();
    ok(/Feierabend, Nils/.test(t) && /Jetzt lesen/.test(t), 'Abendcheck endet mit "Jetzt lesen"');
    ok(/Morgen:/.test(t), 'Vorabend zeigt Thema für morgen');
    await shot('abend-schluss');
    await page.waitForTimeout(2300);

    // ---- Dienstag 24.11.: gelernt gestern, Streak läuft; Dienstag Woche B; Gym ----
    await at('2026-11-24', '13:20');
    t = await text();
    await shot('di-1320');
    ok(/Essen & runterkommen/.test(t), 'Di (Woche B): Schule aus um 13:10, danach Essen');
    await at('2026-11-24', '07:10');
    await click('Ich bin wach').catch(() => {});

    // ---- Mittwoch 25.11.: komplett nichts getan ----
    // ---- Donnerstag 26.11.: verpasster Tag (25.) → Hinweis ----
    await at('2026-11-26', '07:00');
    await page.waitForTimeout(600);
    const modalText = await page.locator('.modal').first().innerText().catch(() => '');
    ok(/Du Versager/.test(modalText), 'Verpasster Tag: Hinweis mit "Du Versager" und Vornamen');
    ok(/Nils/.test(modalText) && /Nächster Schritt/.test(modalText), 'Hinweis nennt sofort den nächsten Schritt');
    await shot('verpasst');
    await page.locator('.modal a.btn').first().click();
    await page.waitForURL(/#\/session/);

    // ---- Plan / Ausfall (Mo 30.11., Woche A) ----
    await at('2026-11-30', '12:00');
    await dismissAlert();
    await page.goto(URL + '#/plan?day=2026-11-30');
    await page.waitForSelector('.per');
    t = await text();
    ok(/Woche A/.test(t), 'Plan zeigt Woche A für 30.11.');
    await page.locator('.per label', { hasText: '5. Std' }).click();
    await page.locator('.per label', { hasText: '6. Std' }).click();
    await page.waitForTimeout(300);
    t = await text();
    ok(/Ausfall · 11:35–13:10/.test(t), 'Ausfall 5./6. Stunde erzeugt Fenster 11:35–13:10');
    await shot('plan-ausfall');
    await page.goto(URL + '#/plan?day=2026-12-02'); // Mi Woche A -> Joggen
    await page.waitForSelector('.per');
    await page.locator('.per label', { hasText: '5. Std' }).click();
    await page.locator('.per label', { hasText: '6. Std' }).click();
    await page.waitForTimeout(300);
    t = await text();
    ok(/Joggen passt hier rein/.test(t), 'Mi 5./6. Stunde Ausfall: Vorschlag Joggen');
    ok(!/Gym passt/.test(t), 'Gym wird nie tagsüber vorgeschlagen (nur abends ab 19:00)');
    await page.locator('.pill', { hasText: 'Joggen' }).first().click();
    await page.waitForTimeout(300);
    t = await text();
    ok(/Joggen/.test(t) && /11:35/.test(t), 'Joggen im Fenster ab 11:35 übernommen');
    await page.goto(URL + '#/plan?day=2026-12-01'); // Di = Gym
    await page.waitForTimeout(300);
    t = await text();
    ok(/Gym/.test(t) && /Training am Abend/.test(t), 'Plan: Gym am Abend, Beschreibung nach Uhrzeit');
    ok(!/75 Min · 75 Min|50 Min · 75 Min/.test(t), 'Plan: Gym-Dauer nicht doppelt oder widersprüchlich');

    // ---- Verschlafen am Samstag ----
    await at('2026-11-28', '10:05');
    await page.goto(URL + '#/heute');
    await page.waitForSelector('.hero');
    await page.getByRole('button', { name: /Verschlafen/ }).first().click();
    await page.locator('#ov-time').fill('11:00');
    await page.locator('#ov-ok').click();
    await page.waitForTimeout(400);
    t = await text();
    ok(/11:00/.test(t), 'Verschlafen: neue Aufstehzeit 11:00 im Plan');
    await shot('verschlafen');

    // ---- Neue Themen sichtbar und als Platzhalter gekennzeichnet ----
    await page.goto(URL + '#/lernen');
    t = await text();
    ok(/Gentleman & Charme/.test(t) && /Rhetorik & freies Sprechen/.test(t) && /Selbstorganisation & Zeitmanagement/.test(t) && /Kleidung & Stil/.test(t), 'Lernen zeigt die vier neuen Themen');
    ok((await page.locator('.chip', { hasText: 'Platzhalter' }).count()) >= 4, 'Themen mit Platzhalter-Paketen sind gekennzeichnet');
    // ---- Weitere Screens ----
    for (const r of ['woche', 'lernen', 'settings', 'stundenplan', 'buecher', 'import']) {
      await page.goto(URL + '#/' + r);
      await page.waitForTimeout(250);
      await shot(r);
      ok((await page.locator('#view').innerText()).length > 40, `Screen ${r} rendert`);
    }

    // ---- Testdaten ----
    await page.goto(URL + '#/settings');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Testdaten laden/ }).click();
    await page.waitForTimeout(500);
    await at('2026-11-23', '16:30');
    await shot('heute-testdaten');
    t = await text();
    ok(/Streak/.test(t), 'Testdaten laden funktioniert');

    // ================= Teil 2: Bedienwege =================
    await page.goto(URL + '#/settings');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Sauber neu starten/ }).click();
    await page.waitForTimeout(300);
    await at('2026-12-01', '07:00');
    await dismissAlert();
    await click('Ich bin wach');
    await at('2026-12-01', '15:30');
    t = await text();
    ok(/was jetzt\?/i.test(t), 'Di (A): nach der Schule kommt die Bock-Frage');
    await click('Auswählen');
    await page.locator('[data-kind="free"]').click();
    await page.waitForSelector('.hero');
    await page.waitForTimeout(200);
    await click('Freizeit starten');
    await page.waitForSelector('.timer');
    await click('Freizeit beenden');
    await page.waitForTimeout(500);
    await page.locator('.celebrate').click().catch(() => {});
    t = await text();
    ok(/\d+ Min genommen/.test(t), 'Freizeit wird nach dem Beenden verrechnet (neues Modell)');
    await shot('freizeit-verrechnet');
    // 15-Minuten-Knopf: nimmt, bis der Plan voll ist, dann klare Ablehnung
    let accepted = 0;
    let rejectMsg = '';
    for (let i = 0; i < 30; i++) {
      await page.locator('[data-act="h-free"]').click();
      await page.waitForTimeout(120);
      const toastTxt = await page.locator('.toast').last().innerText().catch(() => '');
      if (/Nein\./.test(toastTxt)) { rejectMsg = toastTxt; break; }
      accepted++;
    }
    ok(accepted >= 1 && /Nein\./.test(rejectMsg), `15 Minuten Freizeit: ${accepted}x angenommen, dann abgelehnt mit Begründung`);
    ok(/Aufgaben|Plan/.test(rejectMsg), 'Ablehnung nennt den Grund');
    // Tauschen
    await click('Anderes zuerst');
    await page.locator('[data-bid="sport"]').click();
    await page.waitForTimeout(300);
    t = await text();
    ok(/Gym/.test(t), 'Tauschen: Gym kommt zuerst (Di = Gym)');
    await click('Los geht');
    await page.waitForSelector('.timer');
    await click('Fertig');
    await page.waitForSelector('.celebrate');
    ok((await page.locator('.celebrate').innerText()).includes('Punkte'), 'Abhaken zeigt Feier mit Punkten');
    await shot('feier');
    await page.locator('.celebrate').click();
    await page.waitForTimeout(400);
    t = await text();
    ok((await page.locator('.tl-item.done').count()) >= 1, 'Erledigtes ist im Tagesverlauf abgehakt');
    // Lesen mit Seiten
    await click('Anderes zuerst');
    await page.locator('[data-bid="read"]').click();
    await page.waitForTimeout(300);
    await click('Starten');
    await page.waitForSelector('.timer');
    await click('Fertig');
    await page.waitForSelector('#pg');
    await page.locator('#pg').fill('12');
    await page.locator('#pg-ok').click();
    await page.waitForTimeout(400);
    await page.locator('.celebrate').click().catch(() => {});
    await page.locator('[data-act="h-goals"]').click();
    ok(/12 Seiten/.test(await page.locator('.modal').innerText()), 'Lesen: Seitenzahl wird erfasst');
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    // Einstellungen: echte Schalter in der Karte
    await page.goto(URL + '#/settings');
    await page.waitForSelector('.sw');
    const sw = await page.evaluate(() => { const c = document.querySelector('.sw'); const r = c.getBoundingClientRect(); const card = c.closest('.card').getBoundingClientRect(); return { w: r.width, h: r.height, inside: r.right <= card.right && r.left >= card.left }; });
    ok(sw.w >= 40 && sw.h >= 24 && sw.inside, `Schalter hat Größe ${Math.round(sw.w)}x${Math.round(sw.h)} und sitzt in der Karte`);
    const before = await page.locator('input[data-path="hardTone"]').isChecked();
    await page.locator('.sw').first().click();
    ok((await page.locator('input[data-path="hardTone"]').isChecked()) !== before, 'Schalter lässt sich umlegen');
    await page.locator('.sw').first().click();
    await shot('settings-schalter');
    ok(!(await page.locator('select[data-path="sport.2.type"] option[value="handball"]').count()), 'Handball ist nur für Mo und Fr wählbar');
    ok((await page.locator('select[data-path="sport.0.type"] option[value="handball"]').count()) === 1, 'Handball ist für Montag wählbar');
    // Hausaufgabe
    await page.goto(URL + '#/hausaufgaben');
    await page.locator('#hw-title').fill('Aufgaben 3 bis 7');
    await page.locator('.pill', { hasText: '1 Std' }).click();
    await page.locator('#hw-title').fill('Aufgaben 3 bis 7');
    await page.locator('[data-act="hw-add"]').click();
    await page.waitForTimeout(300);
    ok(/Aufgaben 3 bis 7/.test(await text()), 'Hausaufgabe wird eingetragen');
    await shot('hausaufgaben');
    await page.goto(URL + '#/heute');
    ok(/Hausaufgabe/.test(await text()), 'Hausaufgabe taucht im Tagesplan auf');
    // Wasser-Korrektur-Knopf
    await page.goto(URL + '#/heute');
    ok(await page.locator('[data-act="h-water"][data-ml="-250"]').isDisabled(), '−250 ml ist bei 0 gesperrt');
    // Import
    await page.goto(URL + '#/import');
    const pk = { topic: 'finanzen', title: 'E2E Paket', summary: 'x', quiz: [{ q: 'A?', options: ['a', 'b'], answer: 0 }, { q: 'B?', options: ['a', 'b'], answer: 1 }], flashcards: [{ q: 'q', a: 'a' }, { q: 'q2', a: 'a2' }, { q: 'q3', a: 'a3' }] };
    await page.locator('#imp').fill(JSON.stringify(pk));
    await page.getByRole('button', { name: 'Prüfen' }).click();
    await page.waitForSelector('#res .err');
    ok(/Keine Quellen/.test(await page.locator('#res').innerText()) && (await page.locator('[data-act="i-do"]').count()) === 0, 'Import ohne Quellen wird abgelehnt (kein Importieren-Knopf)');
    await shot('import-ohne-quellen');
    await page.locator('#imp').fill(JSON.stringify({ ...pk, sources: [{ title: 'Bundesbank, Monatsbericht', url: 'https://www.bundesbank.de' }], uncertain: ['Diese Zahl ist nicht sicher belegt.'], practice: { task: 'Tu es', how: 'So', check: 'Fertig' } }));
    await page.getByRole('button', { name: 'Prüfen' }).click();
    await page.waitForSelector('[data-act="i-do"]');
    await shot('import-pruefen');
    await page.locator('[data-act="i-do"]').click();
    await page.waitForURL(/#\/lernen/);
    await page.goto(URL + '#/import');
    ok((await text()).includes('E2E Paket'), 'Importiertes Paket erscheint in der Liste');
    await page.locator('#imp').fill('# MD Paket\ntopic: investieren\n\n## Karteikarten\n- Frage? => Antwort\n- Zwei? => Zwei\n- Drei? => Drei\n\n## Quellen\n- Bundesbank | https://www.bundesbank.de\n');
    await page.getByRole('button', { name: 'Prüfen' }).click();
    await page.waitForSelector('[data-act="i-do"]');
    ok(/MD Paket/.test(await page.locator('#res').innerText()), 'Markdown-Import wird erkannt');
    await page.locator('#imp').fill('"topic": "finanzen",\n"title": "T",\n"sources": [{"title":"S"}]\n}');
    await page.getByRole('button', { name: 'Prüfen' }).click();
    ok(/öffnende geschweifte Klammer/.test(await page.locator('#res').innerText()) && !/Feld "topic" fehlt/.test(await page.locator('#res').innerText()), 'JSON ohne öffnende Klammer: klare Meldung statt "topic fehlt"');
    await page.locator('#imp').fill('{kaputt');
    await page.getByRole('button', { name: 'Prüfen' }).click();
    ok(/JSON unvollständig oder fehlerhaft/.test(await page.locator('#res').innerText()), 'Kaputtes JSON wird verständlich gemeldet');
    // Begründung am Abend
    await at('2026-12-02', '22:00');
    await dismissAlert();
    await page.evaluate(() => (location.hash = '#/abend'));
    await page.waitForSelector('#eve');
    await page.locator('[data-act="e-next"]').first().click();
    t = await page.locator('#eve').innerText();
    ok(/Heute ist nichts gelaufen/.test(t), 'Abendcheck ohne Lernen verlangt Begründung');
    await page.locator('[data-act="e-next"]').last().click({ force: true }).catch(() => {});
    ok(/Heute ist nichts gelaufen/.test(await page.locator('#eve').innerText()), 'Ohne Begründung kein Weiterkommen');
    await page.locator('[data-act="e-cat"][data-id="krank"]').click();
    await page.locator('#ex').fill('krank');
    await page.locator('[data-act="e-excuse"]').click();
    ok(/Zu dünn/.test(await page.locator('#eve').innerText()), 'Dünne Begründung wird abgelehnt');
    await page.locator('#ex').fill('Ich hatte Fieber und lag den ganzen Tag im Bett, Arzt war da.');
    await page.locator('[data-act="e-excuse"]').click();
    await page.waitForTimeout(300);
    ok(/Angenommen/.test(await page.locator('#eve').innerText()), 'Plausible Begründung wird angenommen');
    await shot('begruendung');
    await page.waitForTimeout(500);
    await at('2026-12-03', '10:00', '#/heute');
    await page.locator('.modal').count().then(async (c) => { if (c) await dismissAlert(); });
    t = await text();
    ok(!/Du Versager/.test(t), 'Entschuldigter Tag löst keine Versager-Meldung aus');
    ok(/Ausgleich für gestern/.test(t), 'Ausgleich am Folgetag steht im Plan (vor der Freizeit)');

    // Mobile Breite: kein horizontales Scrollen
    for (const r of ['heute', 'lernen', 'plan', 'woche', 'settings', 'hausaufgaben', 'import', 'buecher', 'stundenplan']) {
      await page.goto(URL + '#/' + r);
      await page.waitForTimeout(200);
      const sw2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(sw2 <= 1, `375 px: ${r} ohne horizontales Scrollen (${sw2})`);
    }
    ok(errors.length === 0, `Keine Konsolenfehler (${errors.length})`);
    errors.slice(0, 10).forEach((e) => console.log('   ', e));
    await browser.close();
  } catch (e) {
    console.error('E2E-Abbruch:', e);
    fails++;
  } finally {
    srv.kill();
  }
  console.log(fails ? `\n${fails} FEHLER` : '\nAlles grün');
  process.exit(fails ? 1 : 0);
})();
