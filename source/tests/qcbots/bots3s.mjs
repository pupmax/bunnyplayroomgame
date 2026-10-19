import { chromium } from 'playwright';
import fs from 'fs';
const [game,mode,N]=[process.argv[2],process.argv[3],+process.argv[4]];
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true})).newPage();
p.on('pageerror',e=>console.log('PAGEERROR',e.message));
await p.goto('http://localhost:4199/',{timeout:90000});
await p.evaluate(()=>{for(const k of ['midnight1','noir1','iris1','linye1','bunny1'])localStorage.setItem('playroom.tut.'+k,'1');localStorage.setItem('playroom.beaten','8')});
await p.reload({timeout:90000}); await p.waitForFunction(()=>window.__game&&window.__game.scene.isActive('Title')&&window.__artReady,null,{timeout:30000});
const res=[];
for(let g=0;g<N;g++){
 const r=await p.evaluate(([game,mode])=>new Promise(res=>{
  const G=window.__game; const key={dive:'Dive',pounce:'Pounce',trash:'Trash',shadow:'Shadow',lasso:'Lasso'}[game];
  G.scene.getScenes(true).forEach(s=>s.scene.key!==key&&s.scene.stop()); G.scene.start(key);
  setTimeout(()=>{const S=G.scene.getScene(key);const R=Math.random,gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=R();return u/6*2-1};
   const SL=mode==='slow';const H=mode==='human'||SL,C=mode==='careless',P=mode==='perfect';
   let f;const done=o=>{S.events.off('update',f);res(o)};const L={};let next=0,pend=null;
   const T=()=>S.time.now;
   if(game==='dive'){let plan=null;
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,catches:st.catches,score:st.score,time:+st.time.toFixed(1),bonks:L.b||0,spots:L.s||0});if(!st.running)return;
     const now=T();const pp=S.pup&&!S.pup.done?S.pup:null;
     // obstacle ahead: chimney within 150px ahead -> need y < top-130
     let ceil=1e9;for(const r of S.roofs){if(r.chim!==undefined){const x=r.x+r.chim;if(x+60>140&&x<190+200)ceil=Math.min(ceil,r.top-135)}}
     let want=560;
     if(pp){const dx=pp.x-190;const ty=pp.roof.top-70-40; // need y ~ ty while vy>120
       const tArr=dx/210; // seconds
       // time to fall from y with vy to ty under 1250 accel
       const dist=ty-st.y;const v=Math.max(st.vy,0);const tf=dist>0?(-v+Math.sqrt(v*v+2*1250*dist))/1250:0;
       const jitter=H?(L.j??=gauss()*(SL?0.25:0.12)):C?(L.j??=gauss()*0.3):0;
       if(dx>-60&&tArr<=tf+0.05+jitter&&ceil>ty)want=9999; }
     else L.j=undefined;
     if(want===9999){st.hold=false}else{const target=Math.min(want,ceil);const hold=st.y>target-(st.vy>0?st.vy*0.25:0);
       if(C){if(now>next){st.hold=R()<0.5;next=now+200+R()*400}}else st.hold=hold}
    };
    const ob=S.bonk.bind(S);S.bonk=(...a)=>{L.b=(L.b||0)+1;return ob(...a)};const os=S.spot.bind(S);S.spot=(...a)=>{L.s=(L.s||0)+1;return os(...a)};
   } else if(game==='pounce'){let warnSeen=null;
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,catches:st.catches,escapes:st.escapes,time:+st.time.toFixed(1)});if(!st.running||st.busy){st.hold=false;return}
     const now=T();const inRange=st.px-st.x<=240;const hidden=Math.abs(st.x-330)<55;
     const react=P?0:SL?Math.max(500,700+gauss()*100):H?Math.max(150,300+gauss()*120):600;
     if(st.look!=='away'){if(warnSeen===null)warnSeen=now}else warnSeen=null;
     const frozenNeeded=warnSeen!==null&&now-warnSeen>=react;
     if(inRange&&st.look==='away'&&(P?st.lookT>0.32:true)){ if(H&&R()<0.03||P||C){S.pounce();return} }
     if(C&&inRange&&R()<0.05){S.pounce();return}
     if(P){const goal=Math.min(st.px-240+5,380);st.hold=st.look==='away'&&st.lookT>0.15&&st.x<goal||(hidden&&st.x<goal&&false);return}
     if(frozenNeeded&&!hidden)st.hold=false; else if(!inRange||C)st.hold=true; else st.hold=false;
     if(H&&inRange&&!hidden&&st.x<380)st.hold=!frozenNeeded;
    };
   } else if(game==='trash'){
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,bonks:st.bonks,misses:st.misses,time:+st.time.toFixed(1)});if(!st.running||st.cool>0)return;
     const now=T();if(now<next)return;
     const sp=st.mode==='run'?330:st.mode==='walk'?140:0;
     let pred=st.px+Math.sign(st.pv)*sp*0.45;if(pred>640)pred=1280-pred;if(pred<80)pred=160-pred;
     if(H){pred=st.px+(pred-st.px)*(0.5+R()*0.5)+gauss()*35}
     if(C){pred=st.px+gauss()*40}
     if(st.umbrella&&!C)return;
     const tol=P?20:H?35:60;
     if(Math.abs(st.ix-pred)<tol){if(H&&pend===null){pend=now+(SL?Math.max(450,650+gauss()*100):Math.max(80,200+gauss()*80));return}
       if(H&&now<pend)return; pend=null;S.drop();next=now+(P?0:H?300:200)}
     else pend=null;
    };
   } else if(game==='shadow'){
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,tags:st.tags,time:+st.time.toFixed(1),taps:L.t||0});if(!st.running||st.cool>0)return;
     const now=T();if(now<next)return;
     let px=S.pup.x,py=S.pup.y; if(P&&S.pupTw&&S.pupTw.isPlaying()){const d=S.pupTw.data;try{const tx=d.find(x=>x.key==='x').end,ty=d.find(x=>x.key==='y').end;const k=Math.min(1,0.25/ (S.pupTw.duration/1000));px=px+(tx-px)*k;py=py+(ty-py)*k}catch(e){}}
     const lit=window.__pr.lit();let best=-1,bd=1e9;window.__pr.pools.forEach(([x,y],i)=>{if(lit[i])return;const d=Math.hypot(x-px,y-py);if(d<bd){bd=d;best=i}});
     if(best<0)return;const [x,y]=window.__pr.pools[best];
     if(P){if(bd<140){S.tapAt(x,y);L.t=(L.t||0)+1}next=now+50;return}
     if(H){if(pend===null){pend=now+(SL?Math.max(500,700+gauss()*100):Math.max(200,380+gauss()*150));return}if(now<pend)return;pend=null;S.tapAt(x+gauss()*30,y+gauss()*30);L.t=(L.t||0)+1;next=now+300;return}
     S.tapAt(x+gauss()*40,y+gauss()*40);L.t=(L.t||0)+1;next=now+600;
    };
   } else { // lasso
    let aimLead=0;
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,ropes:st.ropes,throws:st.throws,time:+st.time.toFixed(1)});if(!st.running||st.flying)return;
     const now=T();
     if(!st.hold){if(now<next)return;st.hold=true;L.rel=P?0.75:H?0.75+gauss()*(SL?0.3:0.18):R();L.ph0=st.phase;return}
     const ph=st.phase-L.ph0;let px=S.pup.x,py=S.pup.y;
     let lead=P?1:H?0.3+R()*0.7:0;let vx=0,vy=0;if(S.moveTw&&S.moveTw.isPlaying()){try{const d=S.moveTw.data;const tx=d.find(x=>x.key==='x').end,ty=d.find(x=>x.key==='y').end;const dd=Math.hypot(tx-px,ty-py)||1;const sp=230+st.ropes*30;vx=(tx-px)/dd*sp;vy=(ty-py)/dd*sp}catch(e){}}
     let ax=px+vx*0.42*lead,ay=py+vy*0.42*lead;if(H){ax+=gauss()*50;ay+=gauss()*50}if(C){ax+=gauss()*80;ay+=gauss()*80}
     S.setAim(ax,ay);
     const target=Math.floor(ph)+((L.rel%1)+1)%1; if(ph>=Math.max(0.5,L.rel)&&(st.phase%1+1)%1>=((L.rel%1)+1)%1-0.02){st.hold=false;S.aim.clear();S.throwLasso();next=now+(P?100:SL?900+R()*600:H?400+R()*400:300)}
    };
   }
   S.events.on('update',f);
  },1500);
 }),[game,mode]);
 res.push(r); console.log(game,mode,g,JSON.stringify(r));
}
fs.writeFileSync(`b3-${game}-${mode}.json`,JSON.stringify(res));
await b.close();
