// Boot memory: iPhone 13 emulation (DPR 3), 4x CPU throttle. node tests/bootmem.mjs <url>
import { chromium, devices } from 'playwright';
import { execSync } from 'child_process';
const URL = process.argv[2] || 'http://localhost:4199/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
const bpid = Number(execSync(`ps -eo pid,ppid,comm | awk '$2==${process.pid} && $3 ~ /chrom|headless/ {print $1}' | head -1`, { encoding: 'utf8' }).trim()) || null;
const tree = () => { try { const out = execSync('ps -eo pid,ppid,rss', { encoding: 'utf8' }).trim().split('\n').slice(1).map(l => l.trim().split(/\s+/).map(Number)); const kids = new Set([bpid]); let grown = true; while (grown) { grown = false; for (const [pid, pp] of out) if (kids.has(pp) && !kids.has(pid)) { kids.add(pid); grown = true; } } return out.filter(r => kids.has(r[0])).reduce((a, r) => a + r[2], 0) / 1024; } catch { return 0; } };
let rssPeak = 0, rss0 = 0;
let peak = 0, t0 = Date.now(), ready = false, readyT = 0;
const poll = setInterval(async () => { try { const m = await cdp.send('Performance.getMetrics'); const h = m.metrics.find(x => x.name === 'JSHeapUsedSize').value / 1048576; peak = Math.max(peak, h); } catch {} rssPeak = Math.max(rssPeak, tree()); }, 100);
rss0 = tree(); await p.goto(URL, { timeout: 120000 });
await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 240000, polling: 200 }); readyT = (Date.now() - t0) / 1000;
await p.waitForTimeout(1500); clearInterval(poll);
const info = await p.evaluate(() => { const G = window.__game; let px = 0, n = 0;
  for (const [k, t] of Object.entries(G.textures.list)) { if (k.startsWith('__')) continue; for (const s of t.source) { px += (s.width * s.height); n++; } }
  const c = G.canvas; return { textures: n, texMB: +(px * 4 / 1048576).toFixed(1), canvas: c.width + 'x' + c.height, backbufMB: +(c.width * c.height * 4 / 1048576).toFixed(1), dpr: devicePixelRatio, scenes: G.scene.getScenes(true).map(s => s.scene.key).join('+') }; });
console.log(JSON.stringify({ url: URL, peakHeapMB: +peak.toFixed(1), rssBeforeMB: Math.round(rss0), rssPeakMB: Math.round(rssPeak), rssEndMB: Math.round(tree()), readyS: readyT, ...info, errors: errs.length }));
await b.close();
