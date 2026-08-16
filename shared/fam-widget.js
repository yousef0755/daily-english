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
    '<div id="fwBox" style="border:1px solid rgba(128,128,128,.28);border-radius:14px;' +
    'padding:14px 16px;margin:0 0 16px;font-size:.95rem;line-height:1.75">' +
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

  async function loadSays() {
    try {
      var r = await fetch(API + "/fam/says?who=" + ME), j = await r.json();
      if (!j.ok) return;
      var box = el("fwSays");
      if (!j.inbox || !j.inbox.length) { box.style.display = "none"; return }
      box.style.display = "";
      box.innerHTML = '<div style="font-weight:700;margin-bottom:7px;opacity:.85">家里人跟你说的话</div>' +
        j.inbox.slice(0, 5).map(function (x) {
          return '<div style="border-left:2px solid currentColor;opacity:.95;padding:2px 0 2px 10px;' +
            'margin-bottom:8px"><div style="font-size:.76rem;opacity:.6">' + esc(x.fromName) + '　' +
            esc(x.d) + '</div>' + esc(x.text) + '</div>';
        }).join("");
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
      box.innerHTML = '<div style="opacity:.85">这周的搭子是 <b>' + esc(s.mineName) + '</b>。</div>';
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
  async function loadRank() {
    try {
      var r = await fetch(API + "/fam/board"), b = await r.json();
      var p = await fetch(API + "/fam/pairs"), pr = await p.json();
      var box = el("fwRank");
      if (!b || !b.people) return;

      var solo = b.people.slice().sort(function (a, c) {
        return (c.streak || 0) - (a.streak || 0) ||
               ((c.here ? 1 : 0) - (a.here ? 1 : 0));
      });
      var me = solo.findIndex(function (x) { return x.id === ME });
      var rows = solo.map(function (x, i) {
        var mine = x.id === ME;
        /* 进度跟一家人那页同一个算法：完成了就满格，
           没完成取「时长」和「门数」里走得远的那个。 */
        var pct = x.finished ? 100 : Math.min(100, Math.round(Math.max(
          (x.mins || 0) / (x.goal || 15),
          (x.total ? (x.done || 0) / x.total : 0)) * 100));
        return '<div style="display:grid;grid-template-columns:1.3em 3.6em 1fr 2.6em;' +
          'align-items:center;gap:7px;padding:2px 0;' + (mine ? 'font-weight:800' : 'opacity:.82') + '">' +
          '<span style="opacity:.6">' + medal(i) + '</span>' +
          '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            esc(x.name) + '</span>' +
          '<span style="height:7px;border-radius:99px;background:rgba(128,128,128,.22);' +
            'overflow:hidden;display:block"><i style="display:block;height:100%;width:' + pct + '%;' +
            'border-radius:99px;background:' + (x.finished ? '#7ed6b2' : 'currentColor') + ';' +
            'opacity:' + (x.here ? '1' : '.35') + '"></i></span>' +
          '<span style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">' +
            (x.streak || 0) + '天</span></div>';
      }).join("");

      /* 危机感：差一天就被谁追上/能超过谁 */
      var warn = "";
      if (me >= 0) {
        var mineRow = solo[me], up = solo[me - 1], down = solo[me + 1];
        if (up) {
          var gap = (up.streak || 0) - (mineRow.streak || 0);
          warn += '再连 ' + (gap + 1) + ' 天就能超过 ' + esc(up.name) + '。';
        }
        if (down && (mineRow.streak || 0) - (down.streak || 0) <= 1) {
          warn += (warn ? ' ' : '') + esc(down.name) + ' 就在你后面，今天不来就被超过了。';
        }
        if (!mineRow.here) warn += (warn ? ' ' : '') + '你今天还没来。';
      }

      var pairRows = "";
      if (pr && pr.pairs && pr.pairs.length) {
        /* weekDays = 两个人都来了的天数。days 是七天的明细，不是数字。 */
        var ps = pr.pairs.slice().sort(function (a, c) {
          return (c.weekDays || 0) - (a.weekDays || 0) });
        pairRows = '<div style="margin-top:10px;font-weight:700;opacity:.85">搭子榜</div>' +
          ps.map(function (x, i) {
            var mine = x.a === ME || x.b === ME;
            var w = Math.min(100, Math.round((x.weekDays || 0) / 7 * 100));
            return '<div style="display:grid;grid-template-columns:1.3em 1fr 2.6em;' +
              'align-items:center;gap:7px;padding:2px 0;' +
              (mine ? 'font-weight:800' : 'opacity:.82') + '">' +
              '<span style="opacity:.6">' + medal(i) + '</span>' +
              '<span style="display:flex;align-items:center;gap:7px;min-width:0">' +
                '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto">' +
                esc(x.aName) + '+' + esc(x.bName) + '</span>' +
                '<span style="flex:1;height:7px;border-radius:99px;background:rgba(128,128,128,.22);' +
                'overflow:hidden"><i style="display:block;height:100%;width:' + w + '%;' +
                'border-radius:99px;background:currentColor"></i></span></span>' +
              '<span style="text-align:right;font-variant-numeric:tabular-nums">' +
                (x.weekDays || 0) + '天</span></div>';
          }).join("");
      }

      box.style.display = "";
      box.innerHTML = '<div style="font-weight:700;margin-bottom:6px;opacity:.85">一家人排行</div>' +
        rows + pairRows +
        (warn ? '<div style="margin-top:8px;padding:7px 10px;border-radius:9px;' +
          'border:1px dashed rgba(128,128,128,.45);font-size:.88rem">' + warn + '</div>' : "");
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
