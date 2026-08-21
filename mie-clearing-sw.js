/* 「回到自己」· 基本离线缓存
   ─────────────────────────────────────────────
   这份 Service Worker 只管自己这一片：mie-clearing.html 和它的
   mie-clearing-assets/。注册时把范围收在 /…/mie-clearing 之内，
   不碰同一个仓库里的其它页面（kid-sw.js 等各守各的）。

   曼雅把它「添加到主屏 / 安装」之后，即使断网，草地也还在。 */

const CACHE = "mie-clearing-v1";
const ASSETS = [
  "./mie-clearing.html",
  "./mie-clearing-assets/manifest.webmanifest",
  "./mie-clearing-assets/mie-icon-192.png",
  "./mie-clearing-assets/mie-icon-512.png",
  "./mie-clearing-assets/mie-icon-maskable-512.png",
  "./mie-clearing-assets/apple-touch-icon.png",
  "./mie-clearing-assets/favicon-32.png",
  "./mie-clearing-assets/favicon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))  // 缺一个也不至于整个装不上
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 页面本身：先联网拿最新，拿不到再回缓存（保证她总能看到更新过的版本）
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("./mie-clearing.html", c)); return r; })
        .catch(() => caches.match("./mie-clearing.html").then(hit => hit || caches.match(req)))
    );
    return;
  }

  // 其它资源：先缓存，后联网，并把新拿到的存起来
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(r => {
        if (r && r.status === 200 && r.type === "basic") {
          const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c));
        }
        return r;
      }).catch(() => hit)
    )
  );
});
