/* 一家人 · 主页上的那一块（老板 2026-08-16）
 *
 * 解决两件他报的事：
 *  一、「博远昨天给曼雅留的言在曼雅的主页没有看到」
 *      —— 原来只有曼雅那页有收件箱，而且**送不出去的时候是静默失败的**，
 *         孩子以为送到了，其实没网就丢了。现在送不出去会存在本机排队，
 *         下次打开自动补送，并且当场告诉他「还没送出去，等有网自动送」。
 *  二、「每次一个人邀请另外一个做搭子的时候在他的主页可以看到，
 *        不然他也没有办法同意」
 *      —— 邀请直接摆在自己主页上，一个「好啊」就答应了。
 *
 * 用法：<script src="../shared/fam-widget.js" data-me="boyuan"></script>
 * 想指定位置就在页面上放一个 <div id="famWidget"></div>，不放就挂在最前面。
 *
 * 样式故意写得很淡，靠 currentColor 和半透明边框，
 * 深色的博远那页和米色的曼雅那页都不会打架。
 */
(function () {
  var S = document.currentScript;
  var ME = (S && S.dataset.me) || "";
  if (!ME) return;
  var API = "https://su-family.yousef-abud.workers.dev";
  var QKEY = "famSayQueue_" + ME;
  var NAMES = { boyuan: "博远", manya: "曼雅", xiya: "玺雅", feiya: "霏雅", amina: "妈妈", baba: "爸爸" };
  /* 一人一个颜色，跑道和留言共用一套——看到蓝圆就知道是博远。
     六个色相拉开，深色页和米色页上都还认得出。 */
  var HUE = { boyuan: "#5b8dd9", manya: "#4bbf9a", xiya: "#a97bd6",
              feiya: "#e08aa8", amina: "#e0a94b", baba: "#5aa86f" };
  function hueOf(id) { return HUE[id] || "#8a8a8a" }
  function avatar(id, name, size, ring) {
    var c = hueOf(id);
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
      'display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
      'font-size:' + (size * .42).toFixed(1) + 'px;font-weight:800;letter-spacing:0;' +
      'background:' + c + ';color:#fff;' +
      (ring ? 'box-shadow:0 0 0 2px rgba(255,255,255,.55),0 0 0 4px ' + c + ';' : '') +
      '">' + esc(String(name || "?").slice(0, 1)) + '</div>';
  }

  function esc(t) { return String(t == null ? "" : t).replace(/</g, "&lt;").replace(/>/g, "&gt;") }
  function el(id) { return document.getElementById(id) }

  /* ── 送不出去就排队，下次自动补送 ── */
  function qLoad() { try { return JSON.parse(localStorage.getItem(QKEY) || "[]") } catch (e) { return [] } }
  function qSave(q) { try { localStorage.setItem(QKEY, JSON.stringify(q)) } catch (e) {} }
  async function qFlush() {
    var q = qLoad();
    if (!q.length) return 0;
    var left = [], sent = 0;
    for (var i = 0; i < q.length; i++) {
      try {
        var r = await fetch(API + "/fam/say", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: ME, to: q[i].to, text: q[i].text }),
        });
        var j = await r.json();
        if (j.ok) { sent++; continue }
        /* 被规矩挡下来的（比如今天说满三条）不再重试，免得永远卡着 */
        if (j.err) continue;
        left.push(q[i]);
      } catch (e) { left.push(q[i]) }
    }
    qSave(left);
    return sent;
  }

  var HTML =
    '<div id="fwBox" style="border:1px solid rgba(128,128,128,.22);border-radius:18px;' +
    'padding:16px 16px 14px;margin:0 0 16px;font-size:.95rem;line-height:1.7;' +
    'background:linear-gradient(180deg,rgba(128,128,128,.06),rgba(128,128,128,.02))">' +
      '<div id="fwInvite" style="margin-bottom:12px"></div>' +
      '<div id="fwSays" style="display:none;margin-bottom:12px"></div>' +
      '<div id="fwRank" style="display:none;margin-bottom:12px"></div>' +
      '<details id="fwWrite">' +
        '<summary style="cursor:pointer;font-weight:700;opacity:.85">跟家里人说句话</summary>' +
        '<div style="margin-top:9px">' +
          '<select id="fwTo" style="width:100%;padding:9px 10px;border-radius:10px;' +
            'border:1px solid rgba(128,128,128,.35);font-family:inherit;font-size:.93rem;' +
            'background:transparent;color:inherit"></select>' +
          '<textarea id="fwText" rows="2" placeholder="写一句，TA 打开自己的网页就看得见" ' +
            'style="width:100%;margin-top:8px;padding:9px 10px;border-radius:10px;' +
            'border:1px solid rgba(128,128,128,.35);font-family:inherit;font-size:.93rem;' +
            'background:transparent;color:inherit"></textarea>' +
          '<button id="fwSend" style="margin-top:8px;width:100%;padding:10px;border-radius:10px;' +
            'border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;' +
            'font-family:inherit;font-size:.93rem;font-weight:700;cursor:pointer">送过去</button>' +
          '<div id="fwTip" style="margin-top:6px;font-size:.85rem;opacity:.7"></div>' +
        '</div>' +
      '</details>' +
    '</div>';

  function mount() {
    var host = el("famWidget");
    var main = document.querySelector("main,.wrap,body");
    if (!host) {
      host = document.createElement("div");
      main.appendChild(host);
    } else if (host.parentNode) {
      /* 老板 2026-08-16：「把所有人的这个功能都放在最下面，
         不影响正常自己的事情」——页面里原来放哪不管，一律挪到最后。 */
      host.parentNode.removeChild(host);
      main.appendChild(host);
    }
    host.style.cssText = "margin-top:28px";
    host.innerHTML = HTML;

    var sel = el("fwTo");
    Object.keys(NAMES).forEach(function (id) {
      if (id === ME) return;
      var o = document.createElement("option");
      o.value = id; o.textContent = "说给 " + NAMES[id];
      sel.appendChild(o);
    });

    el("fwSend").onclick = async function () {
      var to = sel.value, t = (el("fwText").value || "").trim(), tip = el("fwTip");
      if (t.length < 2) { tip.textContent = "写一句吧"; return }
      this.disabled = true; tip.textContent = "送过去…";
      try {
        var r = await fetch(API + "/fam/say", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: ME, to: to, text: t }),
        });
        var j = await r.json();
        if (j.ok) { el("fwText").value = ""; tip.textContent = "送到了。" }
        else { tip.textContent = j.err || "没送出去" }
      } catch (e) {
        /* 关键：不能像原来那样静默丢掉。存起来，下次打开自动补送。 */
        var q = qLoad(); q.push({ to: to, text: t }); qSave(q);
        el("fwText").value = "";
        tip.textContent = "现在没网，先存下了，下次打开自动送出去。";
      }
      this.disabled = false;
    };
    return true;
  }

  /* 日期写成人话：今天 / 昨天 / 8-14 */
  function niceDay(d) {
    try {
      var now = new Date(Date.now() + 4 * 3600 * 1000);   /* 迪拜 */
      var t = now.toISOString().slice(0, 10);
      var y = new Date(now - 86400000).toISOString().slice(0, 10);
      if (d === t) return "今天";
      if (d === y) return "昨天";
      var p = d.split("-");
      return p[1].replace(/^0/, "") + "-" + p[2];
    } catch (e) { return d }
  }

  /* 点「回」：展开写字那块、收信人选好、光标放进去 */
  function replyTo(id) {
    var w = el("fwWrite"), sel = el("fwTo"), t = el("fwText");
    if (!w || !sel || !t) return;
    w.open = true;
    sel.value = id;
    t.focus();
    t.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function loadSays() {
    try {
      var r = await fetch(API + "/fam/says?who=" + ME), j = await r.json();
      if (!j.ok) return;
      var box = el("fwSays");
      var hasIn = j.inbox && j.inbox.length;
      var hasOut = j.sent && j.sent.length;
      if (!hasIn && !hasOut) { box.style.display = "none"; return }
      box.style.display = "";
      if (!hasIn) { box.innerHTML = ""; }
      if (hasIn) box.innerHTML =
        '<div style="font-size:.76rem;opacity:.5;margin:2px 0 6px">家里人跟你说的话</div>' +
        j.inbox.slice(0, 5).map(function (x) {
        var c = hueOf(x.from);
        return '<div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:9px">' +
          avatar(x.from, x.fromName, 28, false) +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:.72rem;opacity:.5;margin-bottom:2px">' +
              esc(x.fromName) + ' · ' + niceDay(x.d) + ' ' + esc(x.at || "") + '</div>' +
            '<div style="display:inline-block;max-width:100%;padding:7px 12px;' +
              'border-radius:4px 14px 14px 14px;line-height:1.6;word-break:break-word;' +
              'background:' + c + '1f;border:1px solid ' + c + '33">' + esc(x.text) + '</div>' +
          '</div>' +
          '<button data-reply="' + esc(x.from) + '" style="flex-shrink:0;margin-top:16px;' +
            'padding:5px 13px;border-radius:999px;border:1px solid ' + c + '88;' +
            'background:' + c + '14;color:inherit;font-family:inherit;font-size:.8rem;' +
            'font-weight:700;cursor:pointer">回</button>' +
          '</div>';
      }).join("");
      [].forEach.call(box.querySelectorAll("[data-reply]"), function (b) {
        b.onclick = function () { replyTo(b.dataset.reply) };
      });
      /* 我说出去的（老板 2026-08-16：「我这边要不要显示」——要，
         而且要能看出对方看没看过）。收进折叠，不占地方。 */
      if (j.sent && j.sent.length) {
        var mine = document.createElement("details");
        mine.style.cssText = "margin-top:4px;font-size:.88rem";
        mine.innerHTML = '<summary style="cursor:pointer;opacity:.55;font-size:.78rem">' +
          '我说出去的 ' + j.sent.length + ' 条</summary>' +
          '<div style="margin-top:6px">' + j.sent.slice(0, 8).map(function (x) {
            var c = hueOf(x.to);
            return '<div style="display:flex;gap:8px;align-items:baseline;padding:3px 0;opacity:.8">' +
              '<span style="color:' + c + ';font-weight:700;flex-shrink:0">→' + esc(x.toName) + '</span>' +
              '<span style="flex:1;min-width:0;word-break:break-word">' + esc(x.text) + '</span>' +
              '<span style="flex-shrink:0;font-size:.74rem;opacity:.6">' +
                (x.seen ? "已看" : "还没看") + '</span></div>';
          }).join("") + '</div>';
        box.appendChild(mine);
      }
      if (j.unread) {
        fetch(API + "/fam/seen", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ who: ME }) }).catch(function () {});
      }
    } catch (e) {}
  }

  function paintInvite(s) {
    var box = el("fwInvite");
    if (!s || !s.ok) { box.style.display = "none"; return }
    if (s.incoming && s.incoming.length) {
      box.style.display = "";
      box.innerHTML = s.incoming.map(function (x) {
        return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
          'padding:9px 11px;border:1px solid rgba(128,128,128,.35);border-radius:11px;margin-bottom:7px">' +
          '<span style="flex:1"><b>' + esc(x.fromName) + '</b> 想这周跟你做搭子</span>' +
          '<button data-yes="' + esc(x.from) + '" style="padding:7px 15px;border-radius:999px;' +
          'border:1px solid currentColor;background:transparent;color:inherit;font-family:inherit;' +
          'font-weight:700;cursor:pointer">好啊</button></div>';
      }).join("");
      [].forEach.call(box.querySelectorAll("[data-yes]"), function (b) {
        b.onclick = async function () {
          b.disabled = true; b.textContent = "…";
          try {
            var r = await fetch(API + "/fam/pair", { method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ who: ME, partner: b.dataset.yes }) });
            var j = await r.json();
            /* 直接用写完返回的状态。KV 是最终一致的，
               再读一次会读到旧的，孩子会以为没点上，一直点。 */
            if (j.ok && j.state) paintInvite(j.state);
            else { b.disabled = false; b.textContent = "好啊" }
          } catch (e) { b.disabled = false; b.textContent = "没网，等会儿再点" }
        };
      });
    } else if (s.mutual && s.mineName) {
      box.style.display = "";
      box.innerHTML = '<div style="display:inline-flex;align-items:center;gap:6px;' +
        'padding:3px 10px;border-radius:999px;border:1px solid rgba(128,128,128,.35);' +
        'font-size:.82rem;opacity:.85">本周搭子 <b>' + esc(s.mineName) + '</b></div>';
    } else if (s.waiting && s.mineName) {
      box.style.display = "";
      box.innerHTML = '<div style="opacity:.85">你约了 <b>' + esc(s.mineName) +
        '</b>，还在等 TA 答应。</div>';
    } else {
      /* 谁也没约谁的时候，给一个主动约人的入口。
         老板 2026-08-16：「在主页也可以直接邀请某人做自己的搭子」——
         原来只能被动等，想约人还得跑去一家人那页。 */
      box.style.display = "";
      box.innerHTML = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<span style="opacity:.85">这周还没有搭子。约一个：</span>' +
        '<select id="fwAsk" style="flex:1;min-width:120px;padding:7px 9px;border-radius:10px;' +
        'border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;' +
        'font-family:inherit;font-size:.9rem"></select>' +
        '<button id="fwAskGo" style="padding:7px 15px;border-radius:999px;' +
        'border:1px solid currentColor;background:transparent;color:inherit;' +
        'font-family:inherit;font-weight:700;cursor:pointer">约 TA</button></div>';
      var sel2 = el("fwAsk");
      Object.keys(NAMES).forEach(function (id) {
        if (id === ME) return;
        var o = document.createElement("option");
        o.value = id; o.textContent = NAMES[id];
        sel2.appendChild(o);
      });
      el("fwAskGo").onclick = async function () {
        var b2 = this; b2.disabled = true; b2.textContent = "…";
        try {
          var r = await fetch(API + "/fam/pair", { method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ who: ME, partner: sel2.value }) });
          var j = await r.json();
          if (j.ok && j.state) paintInvite(j.state);
          else { b2.disabled = false; b2.textContent = "约 TA" }
        } catch (e) { b2.disabled = false; b2.textContent = "没网，等会儿再点" }
      };
    }
  }

  async function loadInvites() {
    try {
      var r = await fetch(API + "/fam/invites?who=" + ME), j = await r.json();
      paintInvite(j);
    } catch (e) {}
  }


  /* ── 两张榜（老板 2026-08-16：「让大家都有危机感」）──
     只按「来没来 + 连着几天」排，**不按学了多少**。
     这是老板早就定下的规矩：按数量比，博远看一眼就不干了。 */
  function medal(i) { return ["①", "②", "③", "④", "⑤", "⑥"][i] || (i + 1) }

  /* 今天走了多少（跟一家人那页同一个算法）：
     完成了就满格，没完成取「时长」和「门数」里走得远的那个。 */
  function pctOf(x) {
    if (x.finished) return 100;
    return Math.min(100, Math.round(Math.max(
      (x.mins || 0) / (x.goal || 15),
      (x.total ? (x.done || 0) / x.total : 0)) * 100));
  }

  async function loadRank() {
    try {
      var r = await fetch(API + "/fam/board"), b = await r.json();
      var box = el("fwRank");
      if (!b || !b.people) return;

      /* ── 一条跑道，六个人都在上面（老板：「你追我赶的效果」）──
         按今天的进度站位置。名字挤在一起的时候上下错开，别糊成一团。 */
      var ppl = b.people.map(function (x) { return { x: x, p: pctOf(x) } })
                        .sort(function (a, c) { return a.p - c.p });
      /* 一个圆 22px，在一条约 280px 的跑道上大概占 8%。
         从慢到快走一遍，谁离前一个不够一个身位就往右挤开，保证不重叠。 */
      var GAP = 8, prevX = -99;
      var dots = ppl.map(function (o) {
        var x = Math.max(o.p, prevX + GAP);
        if (x > 100) x = 100;
        prevX = x;
        var mine = o.x.id === ME;
        var ch = String(o.x.name || "?").slice(0, 1);
        return '<div title="' + esc(o.x.name) + '" style="position:absolute;' +
          'left:calc(' + x + '% * .84 + 14px);bottom:11px;transform:translateX(-50%);' +
          'opacity:' + (o.x.here ? '1' : '.42') + ';' +
          'transition:left .6s cubic-bezier(.4,0,.2,1)">' +
          avatar(o.x.id, ch, 24, mine) +
          (o.x.finished ? '<div style="position:absolute;right:-2px;top:-2px;width:9px;height:9px;' +
            'border-radius:50%;background:#7ed6b2;border:1.5px solid rgba(255,255,255,.8)"></div>' : '') +
          '</div>';
      }).join("");

      var track = '<div style="position:relative;height:42px;margin:4px 0 2px">' +
        '<div style="position:absolute;left:12px;right:24px;bottom:7px;height:3px;border-radius:99px;' +
        'background:linear-gradient(90deg,rgba(128,128,128,.18),rgba(126,214,178,.5))"></div>' +
        '<div style="position:absolute;right:0;bottom:1px;font-size:.66rem;opacity:.45">终点</div>' +
        dots + '</div>';

      /* 一句话说清自己的处境——老板要的是危机感，不是名次 */
      var byStreak = b.people.slice().sort(function (a, c) {
        return (c.streak || 0) - (a.streak || 0) });
      var me = byStreak.findIndex(function (x) { return x.id === ME });
      var line = "";
      if (me >= 0) {
        var mineRow = byStreak[me], up = byStreak[me - 1], down = byStreak[me + 1];
        if (!mineRow.here) line = "今天你还没来。";
        else if (up) line = "再连 " + ((up.streak || 0) - (mineRow.streak || 0) + 1) +
                            " 天就超过" + up.name + "。";
        else line = "你连着 " + (mineRow.streak || 0) + " 天，全家最久。";
        if (down && (mineRow.streak || 0) - (down.streak || 0) <= 1)
          line += down.name + "就在你后面。";
      }

      /* 明细收进折叠，想看再点 */
      var detail = byStreak.map(function (x, i) {
        return '<div style="display:grid;grid-template-columns:1.2em 1fr 3.4em;gap:6px;' +
          'padding:1px 0;font-size:.85rem;' + (x.id === ME ? 'font-weight:800' : 'opacity:.75') + '">' +
          '<span style="opacity:.55">' + medal(i) + '</span><span>' + esc(x.name) + '</span>' +
          '<span style="text-align:right;font-variant-numeric:tabular-nums">' +
          (x.streak || 0) + '天</span></div>';
      }).join("");

      box.style.display = "";
      box.innerHTML =
        '<div style="font-weight:700;opacity:.85">一家人今天</div>' +
        '<div style="font-size:.82rem;opacity:.7;margin:1px 0 2px">' + esc(line) + '</div>' +
        track +
        '<details style="font-size:.85rem"><summary style="cursor:pointer;opacity:.6;' +
          'font-size:.8rem">连着几天</summary><div style="margin-top:5px">' + detail + '</div></details>';
    } catch (e) {}
  }

  function start() {
    if (!mount()) return;
    qFlush().then(function (n) {
      if (n) { var t = el("fwTip"); if (t) t.textContent = "刚才没送出去的 " + n + " 条，已经补送了。" }
      loadSays();
    });
    loadInvites();
    loadRank();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
