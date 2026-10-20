'use strict';
const path=require('node:path');
const {prepare}=require('./prepare-desktop.cjs');
(async()=>{
const {packager}=await import('@electron/packager');
const builds=await packager({dir:prepare(),name:'PixelRealism',platform:'win32',arch:'x64',electronVersion:require('electron/package.json').version,out:path.resolve(__dirname,'../dist'),asar:true,overwrite:true,prune:true,win32metadata:{ProductName:'PixelRealism',FileDescription:'PixelRealism sandbox',CompanyName:'nicot3764-byte',OriginalFilename:'PixelRealism.exe'}});
console.log(builds);
})().catch(e=>{console.error(e);process.exitCode=1;});
