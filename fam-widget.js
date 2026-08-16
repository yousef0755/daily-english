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
 * 用法：<script src="./fam-widget.js" data-me="boyuan"></script>
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
    '<div id="fwBox" style="display:none;border:1px solid rgba(128,128,128,.28);border-radius:14px;' +
    'padding:14px 16px;margin:0 0 16px;font-size:.95rem;line-height:1.75">' +
      '<div id="fwInvite" style="display:none;margin-bottom:12px"></div>' +
      '<div id="fwSays" style="display:none;margin-bottom:12px"></div>' +
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
    if (!host) {
      host = document.createElement("div");
      var main = document.querySelector("main,.wrap,body");
      main.insertBefore(host, main.firstChild);
    }
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
      el("fwBox").style.display = "";
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
      el("fwBox").style.display = "";
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
      el("fwBox").style.display = "";
      box.innerHTML = '<div style="opacity:.85">这周的搭子是 <b>' + esc(s.mineName) + '</b>。</div>';
    } else if (s.waiting && s.mineName) {
      box.style.display = "";
      el("fwBox").style.display = "";
      box.innerHTML = '<div style="opacity:.85">你约了 <b>' + esc(s.mineName) +
        '</b>，还在等 TA 答应。</div>';
    } else {
      box.style.display = "none";
    }
  }

  async function loadInvites() {
    try {
      var r = await fetch(API + "/fam/invites?who=" + ME), j = await r.json();
      paintInvite(j);
    } catch (e) {}
  }

  function start() {
    if (!mount()) return;
    qFlush().then(function (n) {
      if (n) { var t = el("fwTip"); if (t) t.textContent = "刚才没送出去的 " + n + " 条，已经补送了。" }
      loadSays();
    });
    loadInvites();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
