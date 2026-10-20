'use strict';
const acorn=require('acorn'),fs=require('fs'),path=require('path');
module.exports=function nativeEngine(source){
  const start=source.indexOf("'use strict';"),end=source.indexOf('</script>',start),code=source.slice(start,end),ast=acorn.parse(code,{ecmaVersion:'latest'});
  const shared=new Set(['type','temp','gS','gV','gM','gF','gK','gH','gAct','thermalRows','fW','sup','sD','colS','colD','dA','dB','occ','rowLiq','spanX0','spanX1','drawX0','drawX1']);
  const edits=[];
  for(const s of ast.body)if(s.type==='VariableDeclaration')for(const d of s.declarations)if(shared.has(d.id.name)){
    let init=d.init;while(init&&init.type!=='NewExpression')init=init.callee?.object;
    if(!init||init.callee.type!=='Identifier')throw Error('Unexpected native buffer '+d.id.name);
    edits.push({start:init.start,end:init.end,text:`nativeGrid.alloc(${init.callee.name},${code.slice(init.arguments[0].start,init.arguments[0].end)})`});
  }
  let replaced=code;for(const e of edits.sort((a,b)=>b.start-a.start))replaced=replaced.slice(0,e.start)+e.text+replaced.slice(e.end);
  source=source.slice(0,start)+replaced+source.slice(start+code.length);
  const bytes=fs.readFileSync(path.join(__dirname,'../desktop/native/grid.wasm'));
  const bootstrap=`const nativeGrid = (()=>{\nconst bytes=Uint8Array.from(atob('${bytes.toString('base64')}'),c=>c.charCodeAt(0));\nconst memory=new WebAssembly.Memory({initial:Math.ceil((N*60+131072)/65536)});\nconst api=new WebAssembly.Instance(new WebAssembly.Module(bytes),{env:{memory}}).exports;\nlet offset=65536;\nreturn {api,alloc(Type,n){offset=(offset+15)&~15;const view=new Type(memory.buffer,offset,n);offset+=view.byteLength;if(offset>memory.buffer.byteLength)throw Error('Grid memory exhausted');return view;}};\n})();\n`;
  source=source.replace('const type =',bootstrap+'const type =');
  const gasStart=source.indexOf('  let anyAct = false;',source.indexOf('function advectGases()'));
  const gasEnd=source.indexOf('  gasIdle = !anyAct;',gasStart);
  source=source.slice(0,gasStart)+`  const anyAct = nativeGrid.api.gasScan(gS.byteOffset,gV.byteOffset,gM.byteOffset,gF.byteOffset,gK.byteOffset,gH.byteOffset,type.byteOffset,temp.byteOffset,gAct.byteOffset,W,H,GX,AMBIENT);\n`+source.slice(gasEnd);
  const thermalStart=source.indexOf('  for (let y = 0; y < H_; y++) {',source.indexOf('function conduct()'));
  const thermalEnd=source.indexOf('  const conductivityRow',thermalStart);
  source=source.slice(0,thermalStart)+'  nativeGrid.api.thermalScan(temp.byteOffset,thermalRows.byteOffset,W,H,AMBIENT);\n'+source.slice(thermalEnd);
  const scanNode=acorn.parse(source.slice(source.indexOf("'use strict';"),source.indexOf('</script>',source.indexOf("'use strict';"))),{ecmaVersion:'latest'}).body.find(x=>x.type==='FunctionDeclaration'&&x.id.name==='scanColumns');
  const bodyStart=source.indexOf("'use strict';")+scanNode.body.start,bodyEnd=source.indexOf("'use strict';")+scanNode.body.end;
  const args=['type','gM','gV','gS','gK','gH','gF','temp','fW','sup','sD','colS','colD','dA','dB','occ','rowLiq','spanX0','spanX1','drawX0','drawX1'].map(x=>x+'.byteOffset');
  source=source.slice(0,bodyStart)+'{\n  nativeGrid.api.scanColumns('+args.join(',')+',W,H,lqY0,lqY1,L_THR);\n}'+source.slice(bodyEnd);
  return source;
};
