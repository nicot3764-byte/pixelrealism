'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium,_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=path.join(root,'.desktop-build');
const nativeEngine=require('../scripts/native-engine.cjs');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8'),optimized=nativeEngine(original);
assert.equal(original.split('<script>')[0],optimized.split('<script>')[0],'Menu markup and CSS must be identical');
fs.mkdirSync(tmp,{recursive:true});fs.writeFileSync(path.join(tmp,'native-parity.html'),optimized);
(async()=>{
const browser=await chromium.launch({args:['--no-sandbox']});
try{
  const snapshots=[];
  for(const file of [path.join(root,'index.html'),path.join(tmp,'native-parity.html')]){
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{requestAnimationFrame=()=>0;let seed=123;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
    await page.goto('file://'+file);
    snapshots.push(await page.evaluate(async()=>{
      TEXQ.length=0;setQuality(0);
      const snapshot=async()=>{
        const arrays={type,temp,life,vel,hv,nz,grp,dmg,soot,gS,gV,gM,gF,gK,gH,gC,AX,AY,PR,LPs,LPb,pix,px:px.subarray(0,np),py:py.subarray(0,np),pvx:pvx.subarray(0,np),pvy:pvy.subarray(0,np),pt:pt.subarray(0,np),pk:pk.subarray(0,np)};
        const state={frame,np,ng,bodies:RBS.map(r=>[r.id,r.x,r.y,r.a,r.vx,r.vy,r.w])};
        for(const [name,a]of Object.entries(arrays))state[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(x=>x.toString(16).padStart(2,'0')).join('');
        return state;
      };
      const result=[];
      for(const scene of ['pond','empty','mixed','breaking']){
        if(scene!=='pond')clearAll();
        if(scene==='mixed'){
          for(let x=0;x<W;x++)setCell((H-1)*W+x,ID.WALL);
          for(let i=0;i<1800;i++)addLiquid(LQ[i%7],100+i%90,H-90-(i/90|0));
          for(let i=0;i<100;i++){addGrain(ID.SAND,100+i,80,0,0);addGas(70*W+200+i,ID.FIRE,0.5);}
          for(let y=80;y<100;y++)for(let x=400;x<430;x++)setCell(y*W+x,ID.WOOD);
          for(let i=0;i<80;i++){addGas(100*W+100+i,ID.GAS,0.1);addGas(110*W+100+i,ID.HYDROGEN,0.1);}
        }
        if(scene==='breaking'){
          let n=0;for(let y=50;y<140;y++)for(let x=260;x<400;x++){let c=y*W+x;setCell(c,ID.GLASS);bCells[n++]=c;}wakeBody(0,n,0,1);
          for(let wave=0;wave<2;wave++)for(const r of RBS.slice()){rbClear(r);if(rbBreak(r,r.x+r.mw/2,r.y+r.mh/2,8,ID.GLASS))RBS.splice(RBS.indexOf(r),1);else rbRaster(r,true);}
        }
        for(let i=0;i<30;i++){step();render();if(i%10===9)result.push({scene,tick:i+1,state:await snapshot()});}
      }
      return result;
    }));
    assert.deepEqual(errors,[]);await page.close();
  }
  assert.deepEqual(snapshots[1],snapshots[0],'Every tested physics buffer and rendered pixel must match byte for byte');
  fs.writeFileSync(path.join(tmp,'parity-results.json'),JSON.stringify({checkpoints:snapshots[0].length,scenes:['pond','empty','mixed','breaking'],result:'byte-for-byte identical'},null,2));
  console.log('PASS: 12 exact full-state checkpoints across pond, empty, mixed chemistry and repeated breaking. Menu HTML/CSS identical.');
}finally{await browser.close();}
const dir=require('../scripts/prepare-desktop.cjs').prepare();
const electron=await _electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),dir]});
try{
  const page=await electron.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>typeof W==='number');
  await page.evaluate(()=>{localStorage.removeItem('pr-canvas');localStorage.removeItem('pr-orient');});await page.reload();
  assert.deepEqual(await page.evaluate(()=>[W,H,typeof require,isSecureContext]),[800,480,'undefined',true]);
  const nextWindow=electron.waitForEvent('window');const clicking=page.click('#bSize',{timeout:120000});
  const prompt=await nextWindow;await prompt.locator('#value').fill('1024 x 640');await prompt.locator('#value').press('Enter').catch(e=>{if(!e.message.includes('has been closed'))throw e;});await clicking;
  await page.waitForFunction(()=>W===1024&&H===640);
  const cancelWindow=electron.waitForEvent('window');const cancelClick=page.click('#bSize',{timeout:120000});
  const cancel=await cancelWindow;await cancel.locator('#value').press('Escape').catch(e=>{if(!e.message.includes('has been closed'))throw e;});await cancelClick;
  assert.deepEqual(await page.evaluate(()=>[W,H]),[1024,640]);
  await page.click('#bOrient');await page.waitForFunction(()=>W===640&&H===1024);
  // Reset through the actual desktop prompt so the next launch retains default dimensions.
  const resetWindow=electron.waitForEvent('window');const resetClick=page.click('#bSize',{timeout:120000});
  const reset=await resetWindow;await reset.locator('#value').fill('default');await reset.locator('#value').press('Enter').catch(e=>{if(!e.message.includes('has been closed'))throw e;});await resetClick;
  await page.waitForFunction(()=>W===480&&H===800);
  await page.click('#bOrient');await page.waitForFunction(()=>W===800&&H===480);
  await page.evaluate(()=>loadPeerLib());
  assert.equal(await page.evaluate(()=>typeof Peer),'function');
  assert.ok(await page.evaluate(()=>inviteURL().startsWith('https://nicot3764-byte.github.io/pixelrealism/?join=')));
  await page.click('#bPause');assert.ok(await page.evaluate(()=>paused));
  await page.click('#bClear');await page.click('#bHeat');await page.click('#bPres');await page.click('#bLight');
  await page.screenshot({path:path.join(tmp,'desktop-verified.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: actual Electron startup, secure/sandboxed renderer, native prompt accept/cancel, persisted dimensions/orientation/reset, local multiplayer library, public invite links and game controls.');
}finally{await electron.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
