import {chromium,devices} from 'playwright';
export const BASE='http://localhost:4201/';
export const DOORS={Boxing:[90,1080],Football:[270,1080],Hive:[450,1080],Acorn:[630,1080],Shadow:[90,750],Trash:[270,750],Pounce:[450,750],Dive:[630,750],Lasso:[360,300]};
export async function mk(dpr=3){const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:dpr});const p=await ctx.newPage();
 const L={errs:[],warns:[],reqs:[]};p.on('pageerror',e=>L.errs.push('PE '+e.message.slice(0,200)));p.on('console',m=>{if(m.type()==='error')L.errs.push('CE '+m.text().slice(0,200));if(m.type()==='warning'&&!/GPU stall|GL Driver/.test(m.text()))L.warns.push(m.text().slice(0,150))});
 p.on('framenavigated',f=>{if(f===p.mainFrame())L.reqs.push('NAV '+f.url())});
 const sleep=ms=>p.waitForTimeout(ms);
 const inst=()=>p.evaluate(()=>{window.__C=window.__C||{};window.__game.scene.scenes.forEach(s=>{if(s.__hk)return;s.__hk=1;s.sys.events.on('create',()=>{__C[s.scene.key]=(__C[s.scene.key]||0)+1})});
  window.__tap=(plan)=>new Promise(res=>{const c=document.querySelector('canvas');let id=Math.floor(Math.random()*1e6);if(!plan.length)return res();
   plan.forEach((e,k)=>setTimeout(()=>{const r=c.getBoundingClientRect();const ts=e.pts.map(([gx,gy])=>{const x=r.left+gx*r.width/720,y=r.top+gy*r.width/720;return new Touch({identifier:id++,target:c,clientX:x,clientY:y,pageX:x,pageY:y,radiusX:4,radiusY:4,force:1})});
    c.dispatchEvent(new TouchEvent('touchstart',{touches:ts,targetTouches:ts,changedTouches:ts,bubbles:true,cancelable:true}));
    setTimeout(()=>c.dispatchEvent(new TouchEvent('touchend',{touches:[],targetTouches:[],changedTouches:ts,bubbles:true,cancelable:true})),12);if(k===plan.length-1)setTimeout(res,40)},e.t))});return 0});
 const tap=(x,y)=>p.evaluate(([x,y])=>window.__tap([{t:0,pts:[[x,y]]}]),[x,y]);
 const ham=(x,y,n=18,dt=35)=>p.evaluate(([x,y,n,dt])=>window.__tap([...Array(n)].map((_,i)=>({t:i*dt,pts:i%4===3?[[x,y],[x+20,y+8]]:[[x+(i%3)*5,y]]}))),[x,y,n,dt]);
 const active=()=>p.evaluate(()=>window.__game.scene.getScenes(true).map(s=>s.scene.key).join(','));
 const C=()=>p.evaluate(()=>({...window.__C}));const resetC=()=>p.evaluate(()=>{window.__C={};return 0});
 return {b,ctx,p,L,sleep,inst,tap,ham,active,C,resetC};
}
