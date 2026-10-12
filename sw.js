/* Retour — Service Worker */
var CACHE='retour-v1';
var CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){})}));
  }));
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys()
      .then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))})
      .then(function(){return self.clients.claim()})
  );
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);

  /* Firebase Auth / Firestore: دائما الشبكة — عمري ما تتخزن */
  if(url.hostname.endsWith('googleapis.com')&&url.hostname!=='fonts.googleapis.com')return;
  if(url.hostname.endsWith('firebaseio.com'))return;

  /* الصفحات: الشبكة أولا (باش توصلك التحديثات) والكاش عند انقطاع النت */
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)});
        return res;
      }).catch(function(){return caches.match(req).then(function(h){return h||caches.match('./index.html')})})
    );
    return;
  }

  /* باقي الموارد (SDK، خطوط، مكتبات): الكاش أولا + تحديث فالخلفية */
  e.respondWith(
    caches.match(req).then(function(hit){
      var net=fetch(req).then(function(res){
        if(res&&(res.ok||res.type==='opaque')){
          var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)});
        }
        return res;
      }).catch(function(){return hit});
      return hit||net;
    })
  );
});