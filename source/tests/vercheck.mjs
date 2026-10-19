// Version check: server reports a newer build -> exactly one hop to ?v=<build>; it never loops even if the page stays old.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
for (const [url, title] of [[process.env.RUBY || 'http://localhost:4200/', 'SoloTitle'], [process.env.MAIN || 'http://localhost:4199/', 'Title']]) {
  const p = await (await b.newContext({ viewport: { width: 440, height: 956 } })).newPage();
  let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame()) navs++; });
  await p.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ build: '2999123123' }) }));
  await p.goto(url); await p.waitForTimeout(2500); await p.waitForFunction(t => window.__game?.scene.isActive(t), title, { timeout: 120000 }); await p.waitForTimeout(2500);
  ok(navs === 2 && p.url().includes('v=2999123123'), `${url} newer build: navigations ${navs}, url ${p.url()}`);
  await p.unroute('**/version.json*'); await p.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ build: '2000010100' }) }));
  const n0 = navs; await p.reload(); await p.waitForFunction(t => window.__game?.scene.isActive(t), title, { timeout: 120000 }); await p.waitForTimeout(2000);
  ok(navs - n0 === 1, `${url} older build on server: no hop (navigations ${navs - n0})`);
  await p.unroute('**/version.json*'); await p.route('**/version.json*', r => r.abort());
  const n1 = navs; await p.reload(); await p.waitForFunction(t => window.__game?.scene.isActive(t), title, { timeout: 120000 }); await p.waitForTimeout(1500);
  ok(navs - n1 === 1, `${url} version.json unreachable: game still boots, no hop`);
}
console.log('FAILS', fails); await b.close();
