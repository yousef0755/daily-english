/* 博远学习站 · 催促用的 Service Worker
   ───────────────────────────────────────────────────────────
   老板 2026-08-15：「他不学，让两只猫咪催他」「每天我催肯定不行」

   要紧的一点：服务器只发一个**空包**（不带任何内容），
   说哪句话、要不要说，全在这台手机上本地决定。
   孩子学了几门、学了什么，一个字节都不上传。

   Snowy 是曼雅的白猫，性子温和；哆米是霏雅的黑猫，性子烈。
   台词里带上家里人，听着才像真的。 */

const DB = "kidnag", STORE = "state", TOTAL = 6;

self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

/* 读页面写进来的今日进度 */
function readState() {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (!done) { done = true; res(v) } };
    setTimeout(() => fin(null), 2500);
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => { try { rq.result.createObjectStore(STORE) } catch (e) {} };
      rq.onerror = () => fin(null);
      rq.onsuccess = () => {
        try {
          const g = rq.result.transaction(STORE, "readonly").objectStore(STORE).get("today");
          g.onsuccess = () => fin(g.result || null);
          g.onerror = () => fin(null);
        } catch (e) { fin(null) }
      };
    } catch (e) { fin(null) }
  });
}

function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* 台词：按「学了几门」和「第几次催」分档。
   Snowy 温和，哆米烈；越到后面哆米话越冲。 */
function pick(done, round) {
  const left = TOTAL - done;
  const P = [];
  if (done === 0) {
    P.push(
      ["Snowy", "今天还没开始。我先把位置占着，等你。"],
      ["Snowy", "曼雅写字的时候我也是这么趴着的。轮到你了。"],
      ["哆米", "一门都没有。你在忙什么？"],
      ["哆米", "霏雅写论文写到半夜，没喊过一句累。"]
    );
    if (round >= 2) P.push(
      ["哆米", "我数三下。你最好在门口出现。"],
      ["Snowy", "再不来，今天的就赶不完了。我不想看你赶。"]
    );
  } else if (left > 2) {
    P.push(
      ["Snowy", "走了 " + done + " 门，还剩 " + left + " 门。慢慢来，我不急。"],
      ["Snowy", "半路停下最难受了，回来把它走完。"],
      ["哆米", "剩 " + left + " 门。回来。"],
      ["哆米", "开了个头就跑，这算什么。"]
    );
  } else {
    P.push(
      ["Snowy", "就剩 " + left + " 门了，别在这儿停。"],
      ["Snowy", "差一点点。我等着看你走完。"],
      ["哆米", "还差 " + left + " 门你就走？回来。"],
      ["哆米", "饭都摆好了。就等你最后 " + left + " 门。"]
    );
  }
  return P[Math.floor(Math.random() * P.length)];
}

self.addEventListener("push", e => {
  e.waitUntil((async () => {
    const st = await readState();
    const today = dayKey();
    const done = (st && st.date === today) ? (st.done | 0) : 0;

    /* 今天做完了就不催——做完还催是最讨人厌的 */
    if (done >= TOTAL) return;

    /* 页面正开着就别弹，页面里的猫已经在催了 */
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (cs.some(c => c.visibilityState === "visible")) return;

    /* 越晚催得越紧——不靠页面配合，看钟点就行 */
    const round = (new Date().getHours() >= 19) ? 2 : 1;
    const [who, line] = pick(done, round);

    await self.registration.showNotification(who + " 说：", {
      body: line,
      icon: "./icons/kid-icon-192.png",
      badge: "./icons/kid-icon-192.png",
      tag: "kid-nag",
      renotify: true,
      data: { url: "./kid.html" }
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) {
      if (c.url.includes("kid.html") && "focus" in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow("./kid.html");
  })());
});
