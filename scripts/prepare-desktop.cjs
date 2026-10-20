'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'.desktop-build/app');
function prepare(){
  fs.mkdirSync(path.join(dest,'desktop'),{recursive:true});
  let source=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const original=source;
  source=require('./native-engine.cjs')(source);
  source=source.replace('<script>', '<script src="bridge.js"></script>\n<script>');
  // Share usable links with browser/phone players instead of a local app URL.
  source=source.replace("return location.origin + location.pathname + '?join='","return 'https://nicot3764-byte.github.io/pixelrealism/' + '?join='");
  source=source.replace("const PEER_SRC = [","const PEER_SRC = ['peerjs.min.js', ");
  fs.writeFileSync(path.join(dest,'desktop/game.html'),source);
  for(const name of ['main.cjs','preload.cjs','bridge.js','prompt-preload.cjs','prompt.html','prompt.js'])fs.copyFileSync(path.join(root,'desktop',name),path.join(dest,'desktop',name));
  fs.copyFileSync(path.join(root,'icon.png'),path.join(dest,'desktop/icon.png'));
  fs.copyFileSync(require.resolve('peerjs/dist/peerjs.min.js'),path.join(dest,'desktop/peerjs.min.js'));
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
  fs.writeFileSync(path.join(dest,'package.json'),JSON.stringify({name:pkg.name,productName:pkg.productName,version:pkg.version,description:pkg.description,author:pkg.author,license:pkg.license,main:pkg.main},null,2));
  const manifest={sourceCommit:'341c173d7b246c5fc226936e0f718aa5ec07dd19',sourceSHA256:crypto.createHash('sha256').update(original).digest('hex'),runtime:require('electron/package.json').version};
  fs.writeFileSync(path.join(dest,'SOURCE.json'),JSON.stringify(manifest,null,2)+'\n');
  return dest;
}
module.exports={prepare};if(require.main===module)console.log(prepare());
