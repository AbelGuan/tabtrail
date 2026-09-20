// Only media state is sent. No text, form values, media URLs or page content.
(() => {
 let previous='',last=0;
 function report(){
  const playing=document.visibilityState==='visible'&&[...document.querySelectorAll('video')].some(video=>!video.paused&&!video.ended&&video.readyState>=3);
  const now=Date.now();if(String(playing)===previous&&(!playing||now-last<20000))return;
  previous=String(playing);last=now;
  chrome.runtime.sendMessage({type:'mediaState',playing}).catch(()=>{});
 }
 for(const type of ['playing','pause','ended','emptied','waiting'])document.addEventListener(type,report,true);
 document.addEventListener('visibilitychange',report);
 setInterval(report,20000);report();
})();
