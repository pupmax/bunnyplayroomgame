import { chromium } from 'playwright';
const [mode,N]=[process.argv[2],+process.argv[3]];
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true})).newPage();
const URL=process.env.URL||'http://localhost:4199/'; await p.goto(URL,{timeout:90000});
await p.evaluate(()=>{for(const n of ['playroom','playroom-ruby']){localStorage.setItem(n+'.tut.rubybag','1');localStorage.setItem(n+'.tut.ruby2','1')}});
await p.reload({timeout:90000}); await p.waitForFunction(()=>window.__game&&window.__game&&(window.__game.scene.isActive('Title')||window.__game.scene.isActive('SoloTitle'))&&window.__artReady,null,{timeout:60000});
for(let g=0;g<N;g++){
 const r=await p.evaluate((mode)=>new Promise(res=>{
  const G=window.__game;G.scene.getScenes(true).forEach(s=>s.scene.key!=='Boxing'&&s.scene.stop());G.scene.start('Boxing');
  setTimeout(()=>{const S=G.scene.getScene('Boxing');const R=Math.random,gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=R();return (u/6*2-1)*1.7};
   const P=mode==='perfect',H=mode==='human',SL=mode==='slow';
   const L={dodges:0,bonks:0,taps:0,guardTries:0};let ws=null,react=0,cueAt=null,early=false,earlyAt=0,pressed=false,dir=0,lastP=-1e9,openGap=0,skipPass=false,lastSign=0;
   const f=()=>{const st=S.st,pr=window.__pr;
    if(pr.ended){S.events.off('update',f);return res({ended:pr.ended,hpLeftPct:Math.round(st.pupHp/1250*100),time:+st.time.toFixed(1),rubyHp:st.rubyHp,dodges:L.dodges,bonks:st.bonks,taps:L.taps,perf:st.perfects,ctr:st.counters,landed:st.landed,feints:st.feints,doubles:st.doubles,snaps:st.snaps})}
    if(!st.running)return;const now=S.time.now;
    const tap=()=>{L.taps++;lastP=now;S.punch()};
    if(mode==='mash'){if(now-lastP>150){if(R()<0.15)S.dodge(R()<.5?-1:1);else tap()}return}
    if(S.hb.visible&&st.dizzy<=0&&(st.state==='open'||st.state==='guard')&&R()<(P?1:0.05)){S.superSwing();return}
    if(st.state==='windup'||st.state==='punch'){
      // plays from what's on screen: the windup ring, the side the bag pulled back to, and the safe DODGE button lighting up (dodge-now cue)
      const glowOn=[S.dl,S.dr].some(c=>c.getByName('glow').visible);
      if(ws!==st.atk){ws=st.atk;cueAt=null;early=P?false:R()<(H?0.2:0.35);earlyAt=now+(P?0:(SL?350:250)+R()*250);dir=-st.side;if(H&&R()<0.06)dir=-dir;if(SL&&R()<0.12)dir=-dir;pressed=false}
      if(P&&st.state==='windup'&&S.stT<=0.18&&st.cool<=0){tap();return}
      if(glowOn&&cueAt===null)cueAt=now+(P?60:H?Math.max(150,250+gauss()*80):Math.max(250,380+gauss()*110));
      if(!pressed&&early&&now>=earlyAt){pressed=true;L.dodges++;S.dodge(dir)}            // jumped the gun (a feint punishes this)
      if(cueAt!==null&&now>=cueAt&&st.dodge<50){cueAt=1e18;L.dodges++;S.dodge(dir)}     // reacts to the dodge-now cue
      return}
    ws=null;
    if(st.dizzy>0)return;
    if(st.state==='open'||st.state==='stun'){const gap=P?230:H?200+R()*120:320+R()*200;if(now-lastP>gap&&st.cool<=0)tap();return}
    if(st.state==='guard'){
      const om=2*Math.PI/[1.7,1.45,1.2][st.round-1];
      const sg=Math.sign(st.x);if(sg!==lastSign){lastSign=sg;skipPass=SL?R()<0.5:H?R()<0.15:false}
      if(skipPass||st.cool>0||now-lastP<250)return;
      const err=P?0:H?gauss()*0.06:gauss()*0.12;
      const fut=Math.sin(st.ph+om*err); // the game judges at the tap now: aim at where the marker is (plus human timing error), not 90 ms ahead
      if(Math.abs(fut)<(P?0.07:0.2)){L.guardTries++;tap();skipPass=true}
    }};
   S.events.on('update',f);
  },1200)}),mode);
 console.log('bag',mode,g,JSON.stringify(r));
}
await b.close();
