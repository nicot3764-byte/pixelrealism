'use strict';
const {app,BrowserWindow,protocol,net,ipcMain,dialog}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const ORIGIN='pixelrealism://app';
const resources=new Map([
  ['/index.html','game.html'],['/icon.png','icon.png'],['/bridge.js','bridge.js'],
  ['/peerjs.min.js','peerjs.min.js'],['/prompt.html','prompt.html'],['/prompt.js','prompt.js']
]);
protocol.registerSchemesAsPrivileged([{scheme:'pixelrealism',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let win;
const prompts=new Map();
function trusted(event){return win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame?.url.startsWith(ORIGIN+'/index.html');}
ipcMain.on('canvas-prompt',(event,message,value)=>{
  if(!trusted(event)||prompts.size){event.returnValue=null;return;}
  const modal=new BrowserWindow({parent:win,modal:true,width:540,height:360,resizable:false,minimizable:false,maximizable:false,show:false,autoHideMenuBar:true,backgroundColor:'#17191e',webPreferences:{preload:path.join(__dirname,'prompt-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  modal.setMenu(null);
  const dialogId=modal.webContents.id;
  const entry={message:String(message).slice(0,4096),value:String(value).slice(0,4096),finish:result=>{if(!prompts.has(dialogId))return;prompts.delete(dialogId);event.returnValue=result;if(!modal.isDestroyed())modal.close();}};
  prompts.set(dialogId,entry);
  modal.on('closed',()=>entry.finish(null));
  modal.once('ready-to-show',()=>modal.show());
  modal.loadURL('pixelrealism://dialog/prompt.html');
});
ipcMain.handle('canvas-prompt-data',event=>{
  const entry=prompts.get(event.sender.id);
  if(!entry)throw Error('Unknown canvas dialog');
  return{message:entry.message,value:entry.value};
});
ipcMain.on('canvas-prompt-result',(event,value)=>{
  const entry=prompts.get(event.sender.id);
  if(entry)entry.finish(value===null?null:String(value).slice(0,4096));
});
app.whenReady().then(()=>{
  protocol.handle('pixelrealism',request=>{
    const url=new URL(request.url),filename=resources.get(url.pathname);
    if(!['app','dialog'].includes(url.host)||!filename||request.method!=='GET'||(url.host==='dialog'&&!['/prompt.html','/prompt.js'].includes(url.pathname)))return new Response('Not found',{status:404});
    return net.fetch(pathToFileURL(path.join(__dirname,filename)).href);
  });
  win=new BrowserWindow({title:'PixelRealism',width:1360,height:940,minWidth:640,minHeight:480,backgroundColor:'#101115',icon:path.join(__dirname,'icon.png'),show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false}});
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(ORIGIN+'/index.html'))event.preventDefault();});
  win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){win.setFullScreen(!win.isFullScreen());event.preventDefault();}});
  win.once('ready-to-show',()=>win.show());
  win.on('closed',()=>{win=null;});
  return win.loadURL(ORIGIN+'/index.html');
}).catch(error=>{dialog.showErrorBox('PixelRealism could not start',error.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
