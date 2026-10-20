'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('canvasDialog',{
  data:()=>ipcRenderer.invoke('canvas-prompt-data'),
  finish:value=>ipcRenderer.send('canvas-prompt-result',value===null?null:String(value))
});
