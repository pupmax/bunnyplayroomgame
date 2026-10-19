import { chromium } from 'playwright';
import fs from 'fs';
const [game,mode,N,RAD]=[process.argv[2],process.argv[3],+process.argv[4],+(process.argv[5]||0)];
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true})).newPage();
await p.goto('http://localhost:4199/',{timeout:90000});
await p.evaluate(()=>{for(const k of ['ruby2','glassia3','zoe1','nana1'])localStorage.setItem('playroom.tut.'+k,'1');localStorage.setItem('playroom.beaten','4')});
await p.reload(); await p.waitForFunction(()=>window.__game&&window.__game.scene.isActive('Title')&&window.__artReady,null,{timeout:30000});
const res=[];
for(let g=0;g<N;g++){
 const r=await p.evaluate(([game,mode,RAD])=>new Promise(res=>{
  const G=window.__game; const key={box:'Boxing',fb:'Football',hive:'Hive',acorn:'Acorn'}[game];
  G.scene.getScenes(true).forEach(s=>s.scene.key!==key&&s.scene.stop()); G.scene.start(key);
  setTimeout(()=>{const S=G.scene.getScene(key);const R=Math.random,gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=R();return u/6*2-1};
   const log={};const done=(o)=>{S.events.off('update',f);res(o)};let f;
   if(game==='box'){let ws=null,react=0,dir=0,lastP=0,pend=false;log.dodges=0;
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,pupHp:st.pupHp,rubyHp:st.rubyHp,time:+st.time.toFixed(1),dodges:log.dodges,openings:log.open||0});if(!st.running)return;
     const now=S.time.now;
     if(st.state==='open'&&!log._o){log._o=1;log.open=(log.open||0)+1} if(st.state!=='open')log._o=0;
     if(mode==='mash'){if(now-lastP>150){lastP=now;S.press({x:360,y:1190})}return}
     if(st.state==='windup'){if(ws===null){ws=now;react=mode==="human"?Math.max(180,400+gauss()*200):350;dir=-st.side;if(mode==='human'&&R()<0.1)dir=-dir;pend=true}
       if(pend&&now-ws>=react){pend=false;log.dodges++;S.press({x:dir<0?110:610,y:1190})}} else {ws=null;pend=false}
     if(S.hb.visible&&now-lastP>200){lastP=now;S.press({x:360,y:1060});return}
     const rate=mode==='human'?170:120;
     if((st.state==='open'||st.state==='stun')&&now-lastP>rate){lastP=now;S.press({x:360,y:1190})}
    };
   } else if(game==='fb'){
    const covers=[{x:170,y:560,w:70,h:80},{x:560,y:470,w:70,h:80},{x:210,y:780,w:190,h:60},{x:610,y:720,w:40,h:170}];
    let readyAt=null,delay=0;
    const pathOK=(pc,th,tx,ty,px,py)=>{const B={x:400,y:1080},E={x:400+Math.cos(th)*1050,y:1080+Math.sin(th)*1050},C={x:(B.x+E.x)/2+pc*3.2,y:(B.y+E.y)/2};let md=1e9;for(let t=0;t<=1;t+=0.01){const q=(1-t)*(1-t),w=2*(1-t)*t,z=t*t;const x=q*B.x+w*C.x+z*E.x,y=q*B.y+w*C.y+z*E.y;const d=Math.hypot(x-tx,y-ty);if(d<md)md=d;if(d<50)return md; if(t>.15)for(const c of covers)if(Math.hypot(c.x-px,c.y-py)<90&&Math.abs(x-c.x)<c.w/2+10&&Math.abs(y-c.y)<c.h/2+6)return 1e9}return md};
    const solve=(tx,ty,pcs,px,py)=>{let best=1e9,bt=0,bp=0;for(const pc of pcs)for(let a=-175;a<=-5;a+=1){const th=a*Math.PI/180;const m=pathOK(pc,th,tx,ty,px,py);if(m<best-0.5||(Math.abs(m-best)<0.5&&Math.abs(pc)<Math.abs(bp))){best=m;bt=th;bp=pc}}return [bt,bp,best]};
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,hits:st.hits,kicks:st.kick,results:st.results.slice(),log});
     if(!st.ready||st.flying){readyAt=null;return}
     const now=S.time.now;const human=mode.startsWith('human')||mode==='careless';
     if(readyAt===null){readyAt=now;delay=human?300+R()*900:0}
     if(now-readyAt<delay)return;
     const px=S.pup.x,py=S.pup.y;let tx=px,ty=py-70;
     const behind=covers.some(c=>Math.hypot(c.x-px,c.y-py)<90);if(behind)log.behind=(log.behind||0)+1;
     let pcs=[0];
     if(mode==='perfect'||mode==='human')pcs=[0,-130,-110,-90,-70,-50,50,70,90,110,130];
     let [th,pc]=solve(tx,ty,pcs,px,py);
     if(human){const err=mode==='careless'?80+R()*80:40+R()*40;const ang=R()*Math.PI*2;
       // re-solve towards a noisy target with chosen curve, then add curve noise
       [th]=solve(tx+Math.cos(ang)*err,ty+Math.sin(ang)*err,[pc],-999,-999); if(pc)pc+=gauss()*30; else if(R()<.15)pc=gauss()*30;}
     pc=Math.max(-130,Math.min(130,pc));
     const s0={x:400,y:1100},e={x:400+Math.cos(th)*300,y:1100+Math.sin(th)*300};
     S.path=[s0,{x:(s0.x+e.x)/2+pc,y:(s0.y+e.y)/2},e];S.shoot();
    };
    if(RAD){const oh=S.dodgeHop.bind(S);S.dodgeHop=()=>{if(R()<RAD/45)oh()}}const ob=S.blocked.bind(S);S.blocked=c=>{log.blocked=(log.blocked||0)+1;return ob(c)};
   } else if(game==='hive'){
    const seen=new Map();let lastTap=0;log.taps=0;
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,score:st.score,bonks:st.bonks,stings:st.stings,spills:st.spills,best:st.best,taps:log.taps});
     if(!st.running)return;const now=S.time.now;
     S.pops.forEach((pp,i)=>{if(!pp||!pp.up||pp.done)return;if(!seen.has(pp.id)){
       const rt=mode==='slow'?Math.max(500,700+gauss()*100):mode==='perfect'?120:mode==='human'?Math.max(220,380+gauss()*150):Math.max(200,320+gauss()*150);
       let tapIt=pp.kind==='pup';if(pp.kind==='cano'&&mode!=='perfect')tapIt=rt<330?R()<0.85:R()<0.15;const mis=mode==='human'||mode==='slow'?0.08:mode==='careless'?0.3:0;
       if(R()<mis)tapIt=!tapIt; if(mode==='human'&&R()<0.1&&pp.kind==='pup')tapIt=false; // just missed noticing
       seen.set(pp.id,{t:now+rt,tap:tapIt,i,hp:pp.hp});if(pp.hp>1&&tapIt)seen.set(pp.id+'b',{t:now+rt+(mode==='perfect'?130:230),tap:true,i})}});
     for(const [id,s] of seen){if(s.t<=now){seen.delete(id);if(!s.tap)continue;if(mode!=='perfect'&&now-lastTap<180)continue;lastTap=now;log.taps++;
       const [hx,hy]=window.__pr.hives[s.i];const err=mode==='perfect'?0:mode==='human'||mode==='slow'?50:90;const a=R()*Math.PI*2,m=R()*err;S.tap(hx+Math.cos(a)*m,hy-60+Math.sin(a)*m)}}
     if(seen.size>50)seen.clear();
    };
   } else {
    let last=null,vel={x:0,y:0},nextShot=0;log.shots=0;
    f=()=>{const st=S.st;if(window.__pr.ended)return done({ended:window.__pr.ended,hits:st.hits,shots:st.shots,score:st.score,blocked:log.blocked||0});
     if(!st.running)return;const now=S.time.now;const px=S.pup.x,py=S.pup.y;
     if(last){const dt=(now-last.t)/1000;if(dt>0){vel={x:(px-last.x)/dt*0.5+vel.x*0.5,y:(py-last.y)/dt*0.5+vel.y*0.5}}}last={x:px,y:py,t:now};
     if(now<nextShot||st.cool>0)return;
     const shielded=st.umbrella||st.hiding>=0;
     if(mode==='perfect'){if(shielded&&!st.golden)return; let lead=0.46; let tx=px,ty=py; if(S.moveTw&&S.moveTw.isPlaying()){tx=px+vel.x*lead;ty=py+vel.y*lead}
       S.fling(tx,ty-60);nextShot=now+50;return}
     if(mode==='human'){if(shielded&&!st.golden&&R()<0.85){nextShot=now+300;return}
       const lead=0.46*(0.3+R()*0.7);const tx=px+vel.x*lead,ty=py+vel.y*lead;const a=R()*Math.PI*2,m=40+R()*40;
       S.fling(tx+Math.cos(a)*m,ty-60+Math.sin(a)*m);nextShot=now+500+R()*500;return}
     // careless
     const a=R()*Math.PI*2,m=60+R()*80;S.fling(px+Math.cos(a)*m,py-60+Math.sin(a)*m);nextShot=now+380+R()*200;
    };
    const ol=S.land.bind(S);S.land=(...a)=>{if(RAD){const [e,t,n]=a;const d=Math.hypot(e-S.pup.x,t-S.pup.y+60);if(d>(n?RAD*1.6:RAD))a=[e+5000,t,n]}ol(...a);if(window.__pr.last==='blocked')log.blocked=(log.blocked||0)+1};
   }
   S.events.on('update',f);
  },1500);
 }),[game,mode,RAD]);
 res.push(r); console.log(game,mode,g,JSON.stringify(r));
}
fs.writeFileSync(`b2-${game}-${mode}${RAD?'-r'+RAD:''}.json`,JSON.stringify(res));
await b.close();
