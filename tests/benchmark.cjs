// Headless CPU work per simulation tick + render; not an on-device FPS promise.
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const sources=process.env.BASELINE_HTML?[['baseline',path.resolve(process.env.BASELINE_HTML)],['optimized',path.resolve(__dirname,'../index.html')]]:[['optimized',path.resolve(__dirname,'../index.html')]];
  const results=[];
  try{
    for(const [version,file]of sources){
      const page=await browser.newPage({viewport:{width:1280,height:900}});
      await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=123;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
      await page.goto('file://'+file);
      const measurements=await page.evaluate(()=>{
        TEXQ.length=0;setQuality(0);
        const results=[];
        for(const scene of ['starting pond','empty','36000 water particles']){
          if(scene!=='starting pond')clearAll();
          if(scene==='36000 water particles'){
            for(let x=0;x<W;x++)setCell((H-1)*W+x,ID.WALL);
            for(let i=0;i<36000;i++)addLiquid(ID.WATER,200+i%300+0.25+Math.random()*0.5,H-121+(i/300|0)+0.25+Math.random()*0.5);
          }
          for(let i=0;i<10;i++){step();render();}
          const batches=[];
          for(let batch=0;batch<3;batch++){
            const t=performance.now();for(let i=0;i<15;i++){step();render();}batches.push((performance.now()-t)/15);
          }
          batches.sort((a,b)=>a-b);
          results.push({scene,msPerFrame:+batches[1].toFixed(2),particles:np});
        }
        return results;
      });
      for(const m of measurements)results.push({version,...m});
      await page.close();
    }
    console.log(JSON.stringify({browser:browser.version(),quality:'full; fixed 1 simulation tick + render; median of 3 batches of 15 after 10 warmup ticks',results},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
