import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
await p.goto(process.argv[2] || 'http://localhost:4199/'); await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 120000 });
const r = await p.evaluate(() => Object.entries(window.__game.textures.list).filter(([k]) => !k.startsWith('__')).map(([k, t]) => [k, t.source.reduce((a, s) => a + s.width * s.height * 4, 0) / 1048576]).sort((a, b) => b[1] - a[1]));
const tot = r.reduce((a, x) => a + x[1], 0); console.log('total MB', tot.toFixed(1), 'n', r.length);
const groups = {}; for (const [k, m] of r) { const g = k.split('_')[0]; groups[g] = (groups[g] || 0) + m; }
console.log('by prefix', Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([g, m]) => g + ':' + m.toFixed(1)).join(' '));
console.log('top', r.slice(0, 15).map(([k, m]) => k + ':' + m.toFixed(1)).join(' '));
await b.close();
