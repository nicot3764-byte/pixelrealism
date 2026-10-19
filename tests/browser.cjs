// Run with Playwright available: npm install --no-save playwright && node tests/browser.cjs
// Set CHROMIUM_PATH to use an existing Chromium binary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const baselinePath = process.env.BASELINE_HTML;
const baseline = baselinePath ? fs.readFileSync(baselinePath, 'utf8') : null;
if (baseline) assert.equal(html.split('<script>')[0], baseline.split('<script>')[0], 'Menu HTML and CSS must remain unchanged');
function extract(source, name) {
  const start = source.indexOf('function ' + name + '(');
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    const errors=[];
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
      let seed = 123;
      Math.random = () => ((seed = Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
    });
    await page.goto('file://'+path.join(root,'index.html'));
    assert.deepEqual(await page.evaluate(()=>[W,H]),[800,480]);
    assert.equal(await page.evaluate(()=>CI[N-1]),95999);
    assert.equal(await page.evaluate(()=>canvasSize(101,80)),null);
    assert.equal(await page.evaluate(()=>canvasSize(2048,2048)),null);
    // Existing button accepts arbitrary supported dimensions and persists them across reload.
    page.once('dialog',d=>d.accept('1024 x 640'));
    await page.click('#bSize');
    await page.waitForFunction(()=>W===1024&&H===640);
    assert.equal(await page.evaluate(()=>CI[N-1]),163839);
    await page.click('#bOrient');
    await page.waitForFunction(()=>W===640&&H===1024);
    page.once('dialog',d=>d.dismiss());
    await page.click('#bSize');
    assert.deepEqual(await page.evaluate(()=>[W,H]),[640,1024]);
    // Invalid input must leave the world intact.
    page.once('dialog',d=>d.accept('99999 x 99999'));
    await page.click('#bSize');
    assert.deepEqual(await page.evaluate(()=>[W,H]),[640,1024]);
    page.once('dialog',d=>d.accept('default'));
    await page.click('#bSize');
    await page.waitForFunction(()=>!customSize);
    await page.evaluate(()=>{localStorage.setItem('pr-orient','landscape');});
    await page.reload();
    assert.deepEqual(await page.evaluate(()=>[W,H]),[800,480]);
    // No device cap or fixed particle array limit, including the separation index buffer.
    const growth=await page.evaluate(()=>{
      clearAll();
      for(let i=0;i<100001;i++)addLiquid(ID.WATER,10+(i%700),10+((i/700)|0));
      const count=np,capacity=particleCapacity;
      const first=[px[0],py[0],pk[0],pt[0]], last=[px[np-1],py[np-1],pk[np-1],pt[np-1]];
      liquidsToPixels(); separate();
      let finite=true;for(let k=0;k<np;k++)finite&&=Number.isFinite(px[k]+py[k]);
      clearAll();
      for(let i=0;i<400;i++)addLiquid(ID.WATER,50.5,50.5,20);
      liquidsToPixels();
      const occupancy=lOcc[50*W+50],temperature=temp[50*W+50];
      clearAll();for(let i=0;i<60001;i++)addLiquid(ID.WATER,50.5,50.5);
      sel=ID.WATER;brush=10;spawnBudget=500;const before=np;paint(200,100,false);
      return {count,capacity,hi:HI.length,first,last,finite,occupancy,temperature,brushAdded:np-before};
    });
    assert.equal(growth.count,100001);assert.ok(growth.capacity>=100001);assert.equal(growth.hi,growth.capacity);
    assert.deepEqual(growth.first,[10,10,0,22]);assert.ok(growth.finite);assert.equal(growth.occupancy,400);assert.equal(growth.temperature,20);assert.ok(growth.brushAdded>0);
    // Resuming a tab cannot trigger thousands of catch-up steps.
    assert.ok(await page.evaluate(()=>{clearAll();TEXQ.length=0;const before=frame;last=performance.now()-60000;frameBody(performance.now());return frame-before<=2&&acc<16.67;}));
    if(baseline){
      const old={};for(const n of ['conduct','scanColumns','shade','compose'])old[n]=extract(baseline,n).replace('function '+n+'(', 'function original_'+n+'(');
      await page.evaluate(old=>{for(const s of Object.values(old))window.eval(s);},old);
      const thermal=await page.evaluate(()=>{
        const results=[];
        for(const mode of ['ambient','sparse','dense']){
          clearAll();
          for(let k=0;k<(mode==='ambient'?0:mode==='sparse'?50:N);k++){
            const i=mode==='dense'?k:Math.random()*N|0;
            temp[i]=k%3===0?200.0001:k%3===1?-270:100000;
            if(k%5===0)type[i]=ID.METAL;
            if(k%7===0){lOcc[i]=1;lKind[i]=0;}
            if(k%11===0)gF[i]=0.5;
          }
          const initial=temp.slice();conduct();const actual=temp.slice();temp.set(initial);original_conduct();
          let different=0,max=0;for(let i=0;i<N;i++)if(actual[i]!==temp[i]){different++;max=Math.max(max,Math.abs(actual[i]-temp[i]));}
          results.push({mode,different,max});
        }
        return results;
      });
      for(const r of thermal)assert.equal(r.different,0,'thermal parity '+JSON.stringify(r));
      const rendering=await page.evaluate(()=>{
        const optimized={scanColumns,shade,compose};const results=[];
        for(const scene of ['empty','solids','liquids','gas','fire','grains']){
          clearAll();
          if(scene==='solids')for(let y=120;y<180;y++)for(let x=100;x<160;x++)setCell(y*W+x,ID.STONE);
          if(scene==='liquids')for(let k=0;k<2000;k++)addLiquid(LQ[k%7],200+k%80,200+((k/80)|0));
          if(scene==='gas'||scene==='fire')for(let y=40;y<100;y++)for(let x=50;x<120;x++){const i=y*W+x;gS[i]=0.2;gV[i]=0.1;gH[i]=0.05;gK[i]=0.1;gM[i]=0.02;if(scene==='fire'){gF[i]=0.8;temp[i]=1400;}}
          if(scene==='grains')for(let k=0;k<100;k++)addGrain(ID.SAND,150+k%25,100+(k/25|0),0,0);
          liquidsToPixels();render();const actual=pix.slice();
          scanColumns=original_scanColumns;shade=original_shade;compose=original_compose;render();
          let different=0;for(let i=0;i<N;i++)if(actual[i]!==pix[i])different++;
          ({scanColumns,shade,compose}=optimized);results.push({scene,different});
        }
        return results;
      });
      for(const r of rendering)assert.equal(r.different,0,'render parity '+JSON.stringify(r));
      console.log('Exact original/optimized thermal and rendering parity:',thermal,rendering);
    }
    // Real simulation smoke: water, gas, heat, powder and moving solids together.
    const smoke=await page.evaluate(()=>{
      clearAll();TEXQ.length=0;setQuality(0);
      for(let x=0;x<W;x++)setCell((H-1)*W+x,ID.WALL);
      for(let k=0;k<2000;k++)addLiquid(LQ[k%7],50+k%100,H-100-(k/100|0));
      for(let k=0;k<100;k++){addGrain(ID.SAND,100+k,80,0,0);addGas(50*W+100+k,ID.FIRE,0.5);}
      for(let y=60;y<75;y++)for(let x=300;x<320;x++)setCell(y*W+x,ID.WOOD);
      for(let i=0;i<60;i++){step();render();}
      let finite=true;for(let k=0;k<np;k++)finite&&=Number.isFinite(px[k]+py[k]+pvx[k]+pvy[k]+pt[k]);
      return {finite,np,frame};
    });
    assert.ok(smoke.finite);assert.ok(smoke.np>0);
    await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/pixelrealism-verified.png'});
    await page.evaluate(()=>{toggleHeat();render();toggleHeat();togglePres();render();togglePres();toggleLight();render();toggleLight();});
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
    await mobile.goto('file://'+path.join(root,'index.html')+'?phone=1');
    await mobile.click('#mMore');
    mobile.once('dialog',d=>d.accept('1200 x 800'));
    await mobile.locator('#mOrient').dispatchEvent('pointerdown',{pointerType:'touch'});
    await mobile.waitForFunction(()=>W===1200&&H===800);
    assert.ok(await mobile.evaluate(()=>cv.getBoundingClientRect().width<=$('stage').clientWidth));
    await mobile.goto('file://'+path.join(root,'index.html')+'?join=x&o=l&w=960&h=600&phone=1');
    assert.deepEqual(await mobile.evaluate(()=>[W,H]),[960,600]);
    assert.deepEqual(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('pr-canvas'))),[1200,800]);
    assert.ok(await mobile.evaluate(()=>inviteURL().includes('&w=960&h=600')));
    await mobile.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: custom sizing/orientation/reset, pressure indices, 100001 liquids, brush beyond old caps, exact occupancy, bounded catch-up, mixed physics.',smoke);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
