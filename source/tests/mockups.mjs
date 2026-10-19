import { chromium } from 'playwright';
const names = ['', '01_title', '02_hub', '03_ruby_boxing', '04_glassia_football', '05_interlude_victory', '06_cast_lineup'];
const b = await chromium.launch(); const errs = [];
for (let n = Number(process.env.FROM||1); n <= 6; n++) {
  const p = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://localhost:4199/?mock=${n}`);
  await p.waitForFunction(() => window.__mockReady, null, { timeout: 20000 }); await p.waitForTimeout(500);
  await p.screenshot({ path: `mockups/${names[n]}.png` }); await p.context().close();
}
console.log('errors', errs); await b.close();
