// Fixed full-quality CPU work, not an on-device FPS promise.
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.desktop-build');
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'benchmark-native.html'),require('../scripts/native-engine.cjs')(fs.readFileSync(path.join(root,'index.html'),'utf8')));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});const results=[];
 try{
 for(let run=0;run<3;run++)for(const version of run%2?['compiled','original']:['original','compiled']){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;let seed=123;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
  await page.goto('file://'+(version==='original'?path.join(root,'index.html'):path.join(dir,'benchmark-native.html')));
  const data=await page.evaluate(()=>{
   TEXQ.length=0;setQuality(0);const out=[];
   for(const scene of ['pond','empty','12000 water particles','repeated breaking']){
    if(scene!=='pond')clearAll();
    if(scene==='12000 water particles')for(let i=0;i<12000;i++)addLiquid(ID.WATER,200+i%200,H-70+(i/200|0));
    if(scene==='repeated breaking'){let n=0;for(let y=50;y<150;y++)for(let x=250;x<400;x++){const c=y*W+x;setCell(c,ID.GLASS);bCells[n++]=c;}wakeBody(0,n,0,1);for(let wave=0;wave<2;wave++)for(const rb of RBS.slice()){rbClear(rb);if(rbBreak(rb,rb.x+rb.mw/2,rb.y+rb.mh/2,8,ID.GLASS))RBS.splice(RBS.indexOf(rb),1);else rbRaster(rb,true);}}
    for(let i=0;i<20;i++){step();render();}
    const batches=[];for(let j=0;j<3;j++){const t=performance.now();for(let i=0;i<15;i++){step();render();}batches.push((performance.now()-t)/15);}
    out.push({scene,ms:batches.sort((a,b)=>a-b)[1]});
   }
   return out;
  });for(const x of data)results.push({run,version,...x});await page.close();
 }
 const median=a=>a.sort((a,b)=>a-b)[a.length>>1],summary=[];
 for(const scene of [...new Set(results.map(x=>x.scene))]){
  const original=median(results.filter(x=>x.scene===scene&&x.version==='original').map(x=>x.ms));
  const compiled=median(results.filter(x=>x.scene===scene&&x.version==='compiled').map(x=>x.ms));
  summary.push({scene,originalMs:+original.toFixed(2),compiledMs:+compiled.toFixed(2),speedup:+(original/compiled).toFixed(3),lessCPUPercent:+((1-compiled/original)*100).toFixed(1)});
 }
 const report={browser:browser.version(),quality:'full, fixed one tick + render, median of three batches of 15 after 20 warmup ticks; three runs, alternating version order',platform:process.platform,summary,results};
 fs.writeFileSync(path.join(dir,'performance-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(summary,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
