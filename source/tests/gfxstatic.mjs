// Which Graphics are static (never cleared over 2 s) vs redrawn, per scene, with a hint of where they live.
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4199/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 })).newPage();
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.getScenes(true).length && window.__artReady, null, { timeout: 120000 });
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); for (const k of ['rubybag','glassia3','zoe1','nana1','midnight1','noir3','iris1','linye1','bunny1']) localStorage.setItem('playroom.tut.' + k, '1'); });
for (const SK of (process.env.SCENES || 'Hive,Acorn').split(',')) {
  await p.evaluate(k => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start(k); }, SK); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => new Promise(res => { const G = window.__game; const proto = Object.getPrototypeOf(G.scene.getScenes(true)[0].add.graphics()); const oc = proto.clear; const cnt = new Map();
    proto.clear = function () { cnt.set(this, (cnt.get(this) || 0) + 1); return oc.call(this); };
    setTimeout(() => { proto.clear = oc; const out = [];
      for (const s of G.scene.getScenes(true)) { const walk = (l, path) => { for (const o of l) { if (o.type === 'Graphics') { const par = o.parentContainer; const sib = par ? par.list.filter(x => x !== o).map(x => x.texture?.key && x.texture.key !== '__DEFAULT' ? x.texture.key : x.text ? 'T:' + x.text.slice(0, 10) : x.type).slice(0, 4).join('|') : ''; const nm = Object.keys(s).find(k => s[k] === o) || ''; out.push([s.scene.key, nm, o.commandBuffer.length, cnt.get(o) || 0, Math.round(par ? par.x : o.x), Math.round(par ? par.y : o.y), path, sib]); } if (o.list) walk(o.list, path + '/C'); } }; walk(s.children.list, ''); }
      res(out.sort((a, b) => b[2] - a[2])); }, 2000); }));
  console.log('== ' + SK); for (const x of r) if (x[2] > 40) console.log((x[3] ? 'DYN ' : 'STATIC ') + x.join(' '));
}
await b.close();
