import {mk,BASE} from './_qc_h18.mjs';
const MODES=process.argv[2].split(',');const N=+process.argv[3]||5;const PATCH=JSON.parse(process.argv[4]||"{}");
const o=await mk(1);const {p,L,sleep}=o;
await p.goto(BASE);await p.evaluate(()=>{localStorage.clear();for(const k of ['noir3','linye1','midnight1','iris1','bunny1'])localStorage.setItem('playroom-test.tut.'+k,'1')});await p.reload();
await p.waitForFunction(()=>window.__game&&window.__game.scene.isActive('Title'),null,{timeout:60000});await sleep(800);
const all={};
for(const mode of MODES){const res=[];
for(let g=0;g<N;g++){
 const r=await p.evaluate(async([mode,PATCH])=>{const G=window.__game;G.scene.getScenes(true).forEach(s=>s.scene.key!=='Pounce'&&s.scene.stop());G.scene.start('Pounce');
  const W=ms=>new Promise(r=>setTimeout(r,ms));await W(400);const S=G.scene.getScene('Pounce');
  G.loop.sleep();const RR=G.renderer,sv=[RR.preRender,RR.render,RR.postRender];RR.preRender=RR.render=RR.postRender=()=>{};
  let ft=performance.now();const DN=Date.now,ft0=ft,d0=DN();Date.now=()=>d0+(ft-ft0);const step=n=>{for(let i=0;i<n;i++){ft+=16.667;G.step(ft,16.667)}};
  let k=0;while(!(S.st&&S.st.running)&&k<600){step(6);k++;if(k%20==0)await W(0)}
  Object.assign(window.__pr.K,PATCH);if(PATCH.TIME)S.st.time=PATCH.TIME;const st=S.st;const R=Math.random;const T=()=>S.time.now;let lastP=-1e9;const log={pounces:0,dodges:0,spots:0,tooFar:0,sniffs:0,maxSus:0};
  const od=S.dodged.bind(S);S.dodged=()=>{log.dodges++;return od()};const osp=S.spot.bind(S);S.spot=()=>{log.spots++;return osp()};
  const opn=S.pounce.bind(S);S.pounce=()=>{if(!st.busy&&st.running&&!st.over){log.pounces++;if(st.px-st.x>280)log.tooFar++}return opn()};
  const hist=[];const seenAt=(lag)=>{const t=T()-lag;let v='away',since=-1e9;for(const h of hist){if(h.t<=t){if(h.l!==v){v=h.l;since=h.t}}else break}return {v,age:t-since}};
  let lag=mode.startsWith('casual')?350:mode==='noob'?520:250;let curLag=lag,lastSeenV='away',plan={};let prevSniff=0;
  let frames=0;
  while(!st.over&&frames<12000){hist.push({t:T(),l:st.yarnT>0?'away':st.look});if(hist.length>400)hist.shift();
   if(st.sniffT===0&&prevSniff>1)log.sniffs++;prevSniff=st.sniffT;log.maxSus=Math.max(log.maxSus,st.sus|0);
   const d=st.px-st.x;const now=T();const free=!st.busy;
   const s=seenAt(curLag);if(s.v!==lastSeenV){lastSeenV=s.v;if(mode.startsWith('casual'))curLag=300+R()*100+(R()<0.2?250:0);if(mode==='noob')curLag=450+R()*200+(R()<0.3?300:0);plan.dec=null}
   const away=s.v==='away';
   if(mode==='ignore'){st.hold=true;if(d<=280&&free)S.pounce()}
   else if(mode==='spam'){st.hold=true;if(now-lastP>300){lastP=now;S.pounce()}}
   else if(mode==='holdcap'){st.hold=true;if(d<=280&&free&&away)S.pounce()}
   else if(mode==='lookaway'){st.hold=away;if(d<=280&&free&&away)S.pounce()}
   else if(mode==='coverdash'){const inCover=Math.abs(st.x-410)<40;const target=st.x<410-20?410:9999;
     if(target===410){st.hold=away||st.x<300;if(st.x>=405)st.hold=false}else{st.hold=away&&s.age<400;}
     if(d<=280&&free&&away)S.pounce()}
   else if(mode==='maxrange'){st.hold=away&&d>272;if(d<=280&&free&&away&&s.age<350)S.pounce()}
   else if(mode==='sniffedge'){st.hold=away&&d>158;if(d<=280&&free&&away&&s.age<350)S.pounce()}
   else if(mode==='metergame'){st.hold=st.sus<45&&(away||st.look==='warn');if(d<=280&&free&&away)S.pounce()}
   else if(mode.startsWith("casual")||mode==="noob"){const mis=mode.startsWith('casual')?0.15:0.3;
     if(!plan.stopD)plan.stopD=mode.startsWith('casual')?(R()<0.6?200+R()*70:120+R()*80):90+R()*120;
     if(plan.dec===null||plan.dec===undefined){plan.dec={late:R()<mis?(200+R()*300):0,early:R()<mis,coverWait:mode.startsWith('casual')&&R()<0.35,t:now}}
     const inCover=[250,410].some(c=>Math.abs(st.x-c)<40);
     let want=away&&d>plan.stopD;if(plan.dec.coverWait&&inCover&&away&&s.age>600)want=false;
     if(!away&&now-plan.dec.t<plan.dec.late)want=d>plan.stopD; // moves late
     st.hold=want;
     if(free&&d<=280){if(away&&(d<=plan.stopD+10||!st.hold)){if(R()<0.25&&(mode!=="casualF"||s.age<500))S.pounce()}else if(!away&&plan.dec.early&&R()<0.02){S.pounce();plan.dec.early=false}}
     if(!free)plan.stopD=null}
   step(1);frames++;if(frames%60==0)await W(0)}
  step(5);Date.now=DN;[RR.preRender,RR.render,RR.postRender]=sv;G.loop.wake();
  return {ended:window.__pr.ended,catches:st.catches,escapes:st.escapes,timeLeft:+st.time.toFixed(1),...log}},[mode,PATCH]);
 res.push(r);console.log(mode,g,JSON.stringify(r));}
 const w=res.filter(r=>r.ended==='win');const sum=`SUM ${mode} ${w.length}/${N} wins avgTimeLeft(win) ${w.length?(w.reduce((a,r)=>a+r.timeLeft,0)/w.length).toFixed(1):'-'} avgCatches ${(res.reduce((a,r)=>a+r.catches,0)/N).toFixed(1)} runoffs/game ${(res.reduce((a,r)=>a+r.escapes,0)/N).toFixed(1)} spots/game ${(res.reduce((a,r)=>a+r.spots,0)/N).toFixed(1)} dodges/game ${(res.reduce((a,r)=>a+r.dodges,0)/N).toFixed(1)}`;console.log(sum);all[mode]=sum}
console.log('ERRS',JSON.stringify(L.errs));await o.b.close();
