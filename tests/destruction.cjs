// Regression checks for compact shards, rotated geometry and mass-cache invalidation.
// Optional BASELINE_HTML compares the repeated-destruction benchmark with an older build.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;let seed=789;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
  await page.goto('file://'+path.resolve(__dirname,'../index.html'));
  const geometry=await page.evaluate(()=>{
   const results=[];TEXQ.length=0;
   for(const angle of [0,0.31,-0.67]){
    clearAll();const mw=180,mh=120,sz=mw*mh;
    const rb={id:rbNext++,x:250,y:140,a:angle,vx:0.2,vy:0.4,w:0.01,mw,mh,rest:0,
     mt:new Uint8Array(sz),mtm:new Float32Array(sz),mlf:new Int16Array(sz),mnz:new Int8Array(sz),mhv:new Int8Array(sz),mgr:new Uint16Array(sz),mdm:new Uint8Array(sz),crack:new Uint8Array(sz),raster:[],rk:[]};
    for(let y=10;y<100;y++)for(let x=15;x<165;x++)if((x<50||x>80&&x<110||x>140)&&y%30<22){const k=y*mw+x;rb.mt[k]=ID.GLASS;rb.mtm[k]=1000+k;rb.mgr[k]=1;rb.mnz[k]=k%12;}
    if(!rbBreak(rb,rb.x+70,rb.y+60,5,ID.GLASS))throw Error('Expected break');
    const seen=new Set(),expected=new Map(),actual=new Map();let badPose=0,badBounds=0;
    rbVisit(rb,rb.x,rb.y,rb.a,(x,y,k)=>{if(!rb.crack[k])expected.set(x+','+y,k);});
    for(const child of RBS){
     let x0=child.mw,y0=child.mh,x1=-1,y1=-1;
     for(let q=0;q<child.mt.length;q++)if(child.mt[q]){
      const k=child.mtm[q]-1000;if(seen.has(k))throw Error('Duplicated material');seen.add(k);
      const [ax,ay]=toWorld(rb,k%mw+0.5,(k/mw|0)+0.5,rb.x,rb.y,rb.a);
      const [bx,by]=toWorld(child,q%child.mw+0.5,(q/child.mw|0)+0.5,child.x,child.y,child.a);
      if(Math.abs(ax-bx)>1e-9||Math.abs(ay-by)>1e-9)badPose++;
      x0=Math.min(x0,q%child.mw);x1=Math.max(x1,q%child.mw);y0=Math.min(y0,q/child.mw|0);y1=Math.max(y1,q/child.mw|0);
     }
     if(x0!==0||y0!==0||x1!==child.mw-1||y1!==child.mh-1)badBounds++;
     rbVisit(child,child.x,child.y,child.a,(x,y,q)=>actual.set(x+','+y,child.mtm[q]-1000));
    }
    let missing=0;for(let k=0;k<sz;k++)if(rb.mt[k]&&!rb.crack[k]&&!seen.has(k))missing++;
    let rasterDiff=0;for(const [c,k]of expected)if(actual.get(c)!==k)rasterDiff++;for(const c of actual.keys())if(!expected.has(c))rasterDiff++;
    results.push({angle,bodies:RBS.length,badPose,badBounds,missing,rasterDiff});
   }
   return results;
  });
  for(const r of geometry){assert.ok(r.bodies>1);for(const k of ['badPose','badBounds','missing','rasterDiff'])assert.equal(r[k],0,JSON.stringify(r));}
  const cache=await page.evaluate(()=>{
   clearAll();let n=0;for(let y=40;y<48;y++)for(let x=40;x<48;x++){const c=y*W+x;setCell(c,ID.WOOD);bCells[n++]=c;}wakeBody(0,n,0,0);const rb=RBS[0];
   const first=rbMass(rb),reused=rbMass(rb)===first;const c=rb.raster[0];type[c]=ID.METAL;rbSync(rb);const changed=rbMass(rb);
   type[c]=0;rbSync(rb);const removed=rbMass(rb);const q=rb.rk[1];rb.crack[q]=1;rbClear(rb);rbRaster(rb,true);const chipped=rbMass(rb);
   return{reused,materialChanged:changed.M>first.M,removed:removed.M<changed.M,chipped:chipped.M<removed.M,finite:Number.isFinite(chipped.I)};
  });
  for(const [key,value]of Object.entries(cache))assert.ok(value,key);
  // Repeated fractures must not allocate the original slab area for every tiny shard.
  const benchmark=async p=>p.evaluate(()=>{
   let seed=789;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
   clearAll();TEXQ.length=0;setQuality(0);let n=0;for(let y=50;y<200;y++)for(let x=250;x<450;x++){const c=y*W+x;setCell(c,ID.GLASS);bCells[n++]=c;}wakeBody(0,n,0,1);
   const start=performance.now();for(let wave=0;wave<3;wave++)for(const rb of RBS.slice()){
    if(rb.mt.reduce((s,t)=>s+!!t,0)<100)continue;rbClear(rb);
    if(rbBreak(rb,rb.x+rb.mw*0.5,rb.y+rb.mh*0.5,8,ID.GLASS))RBS.splice(RBS.indexOf(rb),1);else rbRaster(rb,true);
   }
   const splitMs=performance.now()-start,buffers=RBS.reduce((s,r)=>s+r.mt.length,0),liveCells=RBS.reduce((s,r)=>s+r.mt.reduce((a,t)=>a+!!t,0),0),bodies=RBS.length;
   let ms=0;for(let i=0;i<5;i++){const t=performance.now();rigidBodies();ms+=performance.now()-t;render();}
   for(let i=0;i<15;i++){step();render();}
   const finite=RBS.every(r=>Number.isFinite(r.x+r.y+r.a+r.vx+r.vy+r.w));
   return{splitMs,buffers,liveCells,bodies,rigidMsPerTick:ms/5,finite};
  });
  const optimized=await benchmark(page);assert.ok(optimized.buffers<optimized.liveCells*4,JSON.stringify(optimized));assert.ok(optimized.finite);
  assert.deepEqual(errors,[]);console.log('PASS: rotated fragment geometry, exact raster coverage, material conservation, tight masks, cache invalidation, repeated breaking.',{geometry,cache,optimized});
  if(process.env.BASELINE_HTML){const old=await browser.newPage();await old.addInitScript(()=>{requestAnimationFrame=()=>0;let seed=789;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});await old.goto('file://'+path.resolve(process.env.BASELINE_HTML));console.log('Baseline repeated-breaking benchmark:',await benchmark(old));}
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
