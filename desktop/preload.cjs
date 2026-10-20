'use strict';
const {contextBridge, ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pixelDesktop', {
  prompt: (message,value)=>ipcRenderer.sendSync('canvas-prompt',String(message),String(value??''))
});
