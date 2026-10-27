/* خدمة العمل بدون إنترنت — النسخة 4 */
const CACHE = 'mokhatabat-v4';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(FILES.map(function (f) {
        return c.add(f).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var req = e.request;

  /* ملف الإصدار: دايماً من الشبكة — حتى نعرف إذا صار تحديث */
  if (req.url.indexOf('version.json') > -1) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).catch(function () {
        return new Response('{"version":"0"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  /* صفحات: الشبكة أولاً (تحديثات) ثم المخزّن (بدون نت) */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (fb) {
          if (fb) return fb;
          return caches.match('./');
        });
      })
    );
    return;
  }

  /* ملفات: الكاش أولاً */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return new Response('', { status: 504 });
      });
    })
  );
});
