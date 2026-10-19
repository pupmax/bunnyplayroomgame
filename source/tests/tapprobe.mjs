import { chromium } from 'playwright';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto(process.env.URL||'http://localhost:4199/');
await p.evaluate(()=>{for(const n of ['playroom','playroom-ruby'])localStorage.setItem(n+'.tut.rubybag','1')});await p.reload();
await p.waitForFunction(()=>window.__game&&window.__artReady,null,{timeout:60000});
const r=await p.evaluate(()=>new Promise(res=>{const G=window.__game;G.scene.getScenes(true).forEach(s=>s.scene.stop());G.scene.start('Boxing');
 setTimeout(()=>{const S=G.scene.getScene('Boxing');const out={centre:[0,0],away:[0,0],outsideIn:[0,0]};let last=-1e9,px=0,pend=null;
  const f=()=>{const st=S.st;if(!st.running||window.__pr.ended){S.events.off('update',f);return res(out)}
   st.rubyHp=100;const now=S.time.now;const v=st.x-px;px=st.x;
   if(pend&&now-pend.t>250){out[pend.k][1]++;if(st.landed>pend.l)out[pend.k][0]++;pend=null}
   if(pend||st.state!=='guard'||st.cool>0||st.dizzy>0||now-last<700)return;
   let k=null;const a=Math.abs(st.x);
   if(a<0.06)k='centre';else if(a>0.18&&a<0.28&&Math.sign(v)===Math.sign(st.x))k='away';else if(a>0.4&&a<0.5&&Math.sign(v)!==Math.sign(st.x))k='outsideIn';
   if(k&&out[k][1]<8){last=now;pend={k,t:now,l:st.landed};S.punch()}
   if(out.centre[1]>=8&&out.away[1]>=8&&out.outsideIn[1]>=8){S.events.off('update',f);res(out)}};
  S.events.on('update',f)},1200)}));
console.log(JSON.stringify(r),'errors',errs.length);await b.close();
