// Erzeugt die PNG-Icons (Homescreen) aus dem Maskottchen mit Playwright.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(out, { recursive: true });
const flame = `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE066"/><stop offset=".5" stop-color="#FF9A1F"/><stop offset="1" stop-color="#FF3D5A"/></linearGradient></defs><path d="M32 2C37 15 55 23 55 45C55 60 45 70 32 70C19 70 9 60 9 45C9 35 15 29 19 23C20 31 25 33 28 31C26 21 28 11 32 2Z" fill="url(#g)"/><path d="M32 30C36 38 44 42 44 54C44 62 38 68 32 68C26 68 20 62 20 54C20 46 28 40 32 30Z" fill="#FFD76A" opacity=".5"/><circle cx="24" cy="38" r="5" fill="#fff"/><circle cx="40" cy="38" r="5" fill="#fff"/><circle cx="25" cy="39" r="2.6" fill="#3a1200"/><circle cx="41" cy="39" r="2.6" fill="#3a1200"/><circle cx="26" cy="38" r=".9" fill="#fff"/><circle cx="42" cy="38" r=".9" fill="#fff"/><path d="M25 47Q32 54 39 47" stroke="#3a1200" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`;
const page = (size, pad) => `<html><body style="margin:0;width:${size}px;height:${size}px;background:radial-gradient(circle at 70% 10%,#7b50ff,#1b1450 55%,#110c2b);display:flex;align-items:center;justify-content:center"><div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${flame}</div></body></html>`;
(async () => {
  const b = await chromium.launch();
  for (const [name, size, pad] of [['icon-192.png', 192, 26], ['icon-512.png', 512, 70], ['icon-maskable-512.png', 512, 120], ['apple-touch-icon.png', 180, 26]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(page(size, pad));
    await p.screenshot({ path: path.join(out, name) });
    await p.close();
  }
  await b.close();
  console.log('Icons fertig');
})();
