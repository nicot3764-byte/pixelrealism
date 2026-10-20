'use strict';
(async()=>{
  const {message,value}=await window.canvasDialog.data();
  document.getElementById('message').textContent=message;
  const input=document.getElementById('value');input.value=value;input.focus();input.select();
  document.querySelector('form').onsubmit=e=>{e.preventDefault();window.canvasDialog.finish(input.value);};
  document.getElementById('cancel').onclick=()=>window.canvasDialog.finish(null);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')window.canvasDialog.finish(null);});
})();
