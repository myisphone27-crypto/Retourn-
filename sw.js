/* Retour App — service worker: التحديث تلقائي بدون مسح الكاش
   - الشبكة أولا: كل مرة كاين إنترنت كيجيب النسخة الجديدة ويحدث الكاش
   - بدون إنترنت: كيخدم من الكاش
   بدّل رقم VERSION فقط إلا بغيتي تفرض تنظيف الكاش القديم */
const VERSION='v3';
const C='retour-'+VERSION;
const PRE=['./','index.html','manifest.json','icon-192.png'];
const HOSTS=['cdn.jsdelivr.net','cdnjs.cloudflare.com','www.gstatic.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>Promise.allSettled(PRE.map(u=>c.add(new Request(u,{cache:'reload'}))))));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==location.origin&&!HOSTS.includes(u.host))return;
  e.respondWith(netFirst(req));
});
function netFirst(req){
  return new Promise(res=>{
    let done=false;
    const fromCache=()=>caches.match(req).then(m=>m||(req.mode==='navigate'?caches.match('index.html'):null));
    const timer=setTimeout(()=>{fromCache().then(m=>{if(m&&!done){done=true;res(m)}})},6000);
    fetch(req,{cache:'no-cache'}).then(r=>{
      clearTimeout(timer);
      if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp)).catch(()=>{})}
      if(!done){done=true;res(r)}
    }).catch(()=>{
      clearTimeout(timer);
      fromCache().then(m=>{if(!done){done=true;res(m||Response.error())}});
    });
  });
}
