// Physics regression checks: bodies and liquid exchange momentum (splash, drag, currents, jets), floating, fire and air,
// latent heat of boiling, heat conduction in metals. Optional BASELINE_HTML prints the same measurements for an older build.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const measure=async page=>page.evaluate(()=>{
  const R={};TEXQ.length=0;
  const reset=()=>{clearAll();setQuality(0);};
  const box=(x0,y0,x1,y1,t)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)setCell(y*W+x,t);};
  const floor=t=>box(0,H-4,W-1,H-1,t);
  const liquid=(x0,y0,x1,y1,e,T)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(type[y*W+x]===0)addLiquid(e,x+0.5,y+0.5,T);};
  const run=n=>{for(let i=0;i<n;i++)step();};
  const count=t=>{let n=0;for(let i=0;i<N;i++)if(type[i]===t)n++;return n;};
  const where=t=>{let n=0,x0=W,x1=-1,y0=H,y1=-1;for(let i=0;i<N;i++)if(type[i]===t){const x=i%W,y=(i/W)|0;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}return{n,x0,x1,y0,y1};};
  const surface=x=>{for(let y=0;y<H;y++)if(lOcc[y*W+x])return y;return -1;};
  const pool=(x0,x1,depth,wall,e)=>{box(x0-4,H-wall,x0-1,H-5,ID.WALL);box(x1+1,H-wall,x1+4,H-5,ID.WALL);liquid(x0,H-4-depth,x1,H-5,e||ID.WATER);};
  const burning=t=>{let n=0;for(let i=0;i<N;i++)if(type[i]===t&&life[i]>0)n++;return n;};
  const light=(x0,x1,y)=>{for(let k=0;k<40;k++){for(let x=x0;x<x1;x+=3)addGas(y*W+x,ID.FIRE,0.5);step();}};
  const cx=W>>1;

  // 1. a rock dropped into a pool throws the water up; nothing is created or lost
  reset();floor(ID.WALL);pool(cx-146,cx+149,56,90);run(120);
  const lvl=surface(cx-100),np0=np;box(cx-12,H-280,cx+12,H-256,ID.STONE);
  let ke=0,top=H;
  for(let f=0;f<170;f++){step();let s=0;for(let k=0;k<np;k++){s+=pvx[k]*pvx[k]+pvy[k]*pvy[k];if(py[k]<top)top=py[k];}if(s>ke)ke=s;}
  R.splash={height:lvl-top,energy:ke,conserved:np===np0,sunk:where(ID.STONE).y1>=H-6};

  // 2. floating: wood rides about 60 % under, a flat plank slaps the surface and stays on it
  reset();floor(ID.WALL);pool(cx-146,cx+149,76,120);run(100);
  box(cx-20,H-170,cx+19,H-151,ID.WOOD);run(500);
  let w=where(ID.WOOD),lv=(surface(cx-130)+surface(cx+130))/2;
  R.float={submerged:(w.y1+1-lv)/(w.y1+1-w.y0)};
  reset();floor(ID.WALL);pool(cx-146,cx+149,76,120);run(100);
  box(cx-40,H-156,cx+39,H-151,ID.WOOD);let deepest=0;
  for(let f=0;f<400;f++){step();if(RBS.length)deepest=Math.max(deepest,RBS[0].y);}
  lv=(surface(cx-130)+surface(cx+130))/2;
  R.plank={deepestTop:deepest-(H-80),restTop:(RBS.length?RBS[0].y:where(ID.WOOD).y0)-lv};

  // 3. a jet of water shoves a wooden crate along the ground
  reset();floor(ID.METAL);box(cx+100,H-24,cx+119,H-5,ID.WOOD);run(30);
  for(let f=0;f<200;f++){for(let q=0;q<12;q++)addLiquid(ID.WATER,cx-100+Math.random()*2,H-14+Math.random()*8,undefined,4,0);step();}
  R.jet={moved:where(ID.WOOD).x0-(cx+100)};

  // 4. a stone sinks quickly through water, slowly through honey
  R.sink={};
  for(const [name,e] of [['water',ID.WATER],['honey',ID.HONEY]]){
    reset();floor(ID.WALL);pool(cx-60,cx+59,150,170,e);run(60);
    box(cx-5,H-166,cx+4,H-157,ID.STONE);let f=0;
    while(f<900&&where(ID.STONE).y1<H-8){run(10);f+=10;}
    R.sink[name]=f;
  }

  // 5. fire and air: in a closed box the fire dies with most of the wood left; with a vent it burns on
  R.fire={};
  for(const mode of ['sealed','vented']){
    reset();floor(ID.WALL);
    box(cx-60,H-80,cx+60,H-77,ID.WALL);box(cx-60,H-80,cx-57,H-5,ID.WALL);box(cx+57,H-80,cx+60,H-5,ID.WALL);
    if(mode==='vented'){for(let y=H-80;y<=H-77;y++)for(let x=cx-10;x<=cx+10;x++)type[y*W+x]=0;for(let y=H-16;y<=H-5;y++)for(let x=cx-60;x<=cx-57;x++)type[y*W+x]=0;}
    box(cx-40,H-24,cx+39,H-5,ID.WOOD);run(5);light(cx-38,cx+38,H-25);run(1100);
    R.fire[mode]={wood:count(ID.WOOD),burning:burning(ID.WOOD),oxygen:fireAir((H-50)*W+cx,false)};
  }

  // 6. boiling takes heat: a pot on a hot plate warms through instead of flashing to steam, and never exceeds 100 °C
  reset();floor(ID.WALL);
  box(cx-60,H-8,cx+60,H-5,ID.HEATER);box(cx-64,H-50,cx-61,H-5,ID.WALL);box(cx+61,H-50,cx+64,H-5,ID.WALL);
  liquid(cx-60,H-30,cx+60,H-9,ID.WATER);const pot=np;run(450);
  let tmax=0,tsum=0;for(let k=0;k<np;k++){tsum+=pt[k];if(pt[k]>tmax)tmax=pt[k];}
  R.boil={left:np/pot,hottest:tmax,mean:tsum/Math.max(1,np)};

  // 7. lava poured into water: a kilo of lava boils well under a kilo of water away
  reset();floor(ID.WALL);pool(cx-60,cx+60,36,80);run(60);const wat=np;
  liquid(cx-15,H-110,cx+15,H-90,ID.LAVA);const lav=np-wat;run(450);
  let lavaLeft=0;for(let k=0;k<np;k++)if(pk[k]===LQI[ID.LAVA])lavaLeft++;
  R.lava={boiledPerLava:(wat-(np-lavaLeft))/lav,lavaLeft};

  // 8. copper carries heat along a bar
  reset();floor(ID.WALL);
  box(cx-100,H-180,cx-97,H-175,ID.HEATER);box(cx-96,H-180,cx,H-175,ID.COPPER);box(cx+1,H-180,cx+4,H-5,ID.WALL);run(600);
  R.rod={at40:temp[(H-178)*W+cx-96+40],at80:temp[(H-178)*W+cx-96+80]};

  let finite=true;
  for(let k=0;k<np;k++)if(!(px[k]===px[k]&&pvx[k]===pvx[k]&&pt[k]===pt[k]))finite=false;
  for(const rb of RBS)if(!Number.isFinite(rb.x+rb.y+rb.a+rb.vx+rb.vy+rb.w))finite=false;
  R.finite=finite;
  return R;
});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const open=async file=>{
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;let seed=2468;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
   await page.goto('file://'+file);return{page,errors};
  };
  const {page,errors}=await open(path.resolve(__dirname,'../index.html'));
  const r=await measure(page);
  assert.ok(r.splash.height>20,'a plunging rock makes a splash: '+JSON.stringify(r.splash));
  assert.ok(r.splash.energy>4000,'the water takes up the rock\'s motion: '+JSON.stringify(r.splash));
  assert.ok(r.splash.conserved&&r.splash.sunk,JSON.stringify(r.splash));
  assert.ok(r.float.submerged>0.45&&r.float.submerged<0.78,'wood floats about 60 % under: '+JSON.stringify(r.float));
  assert.ok(r.plank.deepestTop<12&&r.plank.restTop>-4.5&&r.plank.restTop<-0.5,'a flat plank slaps the surface and floats 60 % under: '+JSON.stringify(r.plank));
  assert.ok(r.jet.moved>40,'a jet shoves a crate: '+JSON.stringify(r.jet));
  assert.ok(r.sink.water<r.sink.honey*0.6,'honey holds a stone back, water does not: '+JSON.stringify(r.sink));
  assert.ok(r.fire.sealed.wood>r.fire.vented.wood+250&&r.fire.sealed.burning===0,'a fire in a closed box suffocates: '+JSON.stringify(r.fire));
  assert.ok(r.fire.sealed.oxygen<0.66&&r.fire.vented.oxygen>0.95,JSON.stringify(r.fire));
  assert.ok(r.boil.left>0.55&&r.boil.hottest<=100.01&&r.boil.mean>30,'water boils at 100 °C and takes its time: '+JSON.stringify(r.boil));
  assert.ok(r.lava.boiledPerLava<2.5&&r.lava.lavaLeft===0,'lava is quenched without boiling the pool away: '+JSON.stringify(r.lava));
  assert.ok(r.rod.at40>70&&r.rod.at80>30,'copper conducts: '+JSON.stringify(r.rod));
  assert.ok(r.finite);assert.deepEqual(errors,[]);
  console.log('PASS: splash and momentum exchange, floating, jets, viscous drag, fire and air, latent heat, quenching, metal conduction.',JSON.stringify(r));
  if(process.env.BASELINE_HTML){
   const old=await open(path.resolve(process.env.BASELINE_HTML));
   await old.page.evaluate(()=>{window.fireAir=window.fireAir||(()=>1);});
   console.log('Baseline measurements:',JSON.stringify(await measure(old.page)));
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
