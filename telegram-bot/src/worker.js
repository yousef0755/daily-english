/* 家里的 Telegram 机器人 —— 跑在 Cloudflare Worker 上，不用任何机器常驻。
 *
 * 为什么不照搬那份 .py：
 *   那份是轮询(getUpdates)，必须有台电脑 7×24 开着，关机就停。
 *   这里换成 webhook —— 有人说话，Telegram 主动把消息 POST 过来，
 *   Worker 醒一下、答完接着睡。没人说话就是零开销，也就不用买 VPS。
 *
 * 默认走 Workers AI（Cloudflare 自己托管的模型），一分钱不花、一个 key 都不用：
 * 每天送 10000 neurons，按 8b 估够八百来条家常对话。想试更聪明的就 /model 70b，
 * 那个一条要七十多 neurons，一天百来条就见底。DeepSeek 还留着，/model deepseek 切过去。
 *
 * 一条消息怎么走：
 *   Telegram --POST--> 本 Worker --> 模型 --> sendMessage 回 Telegram
 *
 * 密钥一个都不在这个文件里，全部 wrangler secret put（见 README.md）。
 */

const TG = "https://api.telegram.org";
const DEEPSEEK = "https://api.deepseek.com/chat/completions";

const MAX_TG = 4000;        // Telegram 单条上限 4096，留点余量
const KEEP_MSGS = 12;       // 上下文留多少条（问和答各算一条）
const KEEP_SEEN = 20;       // 记住最近多少个 update_id，用来认重发
const HIST_TTL = 6 * 3600;  // 六小时不说话就忘干净

/* 能选的模型。左边是简称，聊天里 /model 8b 就切。
   目录随时在变，所以也允许直接粘一个 ID：/model @cf/某某/某某 */
const MODELS = {
  "1b": "@cf/meta/llama-3.2-1b-instruct",
  "3b": "@cf/meta/llama-3.2-3b-instruct",
  "8b": "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
  "70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  deepseek: "deepseek", // 走 DeepSeek 自己的 API，要钱，要 key
};

/* 每百万 token 烧多少 neurons（输入, 输出），照 Cloudflare 公布的价算。
   只用来给 /free 估个数，让人心里有底；真实用量以 dashboard 为准。
   表里没有的模型就不估，宁可不说也别说错。 */
const RATE = {
  "@cf/meta/llama-3.2-1b-instruct": [2457, 18252],
  "@cf/meta/llama-3.2-3b-instruct": [4625, 30475],
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast": [4119, 34868],
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": [26668, 204805],
};
const FREE_NEURONS = 10000; // 每天白送这么多，UTC 零点重置

const DEFAULT_SYSTEM =
  "你是苏家的学习助手。回答简明、口语化，别写成论文。" +
  "讲英语知识时给出中文解释和例句；用户用中文问就用中文答。";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* 不用 Telegram 也能试模型效果：
         curl -H "x-telegram-bot-api-secret-token: $TG_SECRET" \
              "https://你的worker/try?model=8b&q=用一句话解释虚拟语气"
       跟聊天走同一套代码，但不读不写上下文，试完不留痕迹。
       同样要暗号 —— 不然这就是个白送给全网的免费问答口子。 */
    if (url.pathname === "/try") return tryOut(request, env, url);

    if (request.method === "GET") return new Response("su-tg-bot ok\n");
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

    /* 只认带对暗号的请求。setWebhook 时设了 secret_token，
       Telegram 每次都会带这个头；别人摸到这个网址直接打是进不来的。 */
    if (env.TG_SECRET && request.headers.get("x-telegram-bot-api-secret-token") !== env.TG_SECRET) {
      return new Response("forbidden", { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }

    /* 关键：先回 200，再慢慢办事。
       Telegram 等不到回应会把同一条重发一遍，家里人就会收到两遍答案。 */
    ctx.waitUntil(handle(update, env).catch((e) => console.error("handle failed:", e)));
    return new Response("ok");
  },
};

async function handle(update, env) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  /* 机器人的地址是公开的，谁摸到都能聊的话，烧的是你的额度。
     所以先对名单。第一次用的人会被告知自己的 chat id，填进去就放行。 */
  const allowed = (env.ALLOWED_CHATS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(String(chatId))) {
    await send(env, chatId,
      "这个机器人只给家里人用。\n\n你的 chat id 是 " + chatId +
      "\n把它加进 wrangler.toml 的 ALLOWED_CHATS，再 wrangler deploy 一次就能用了。");
    return;
  }

  /* 一把钥匙装下这个对话的全部家当：上下文、选的模型、认重发用的 id、今天烧了多少。
     故意不拆成几把 —— KV 免费额度里写次数是最紧的那一项，
     拆成三把就是一条消息写三次，能聊的条数直接掉到三分之一。 */
  const key = "chat:" + chatId;
  let rec = { v: 2, model: "", msgs: [], seen: [], day: "", neurons: 0 };
  if (env.BOT_KV) {
    try {
      const raw = await env.BOT_KV.get(key);
      if (raw) rec = Object.assign(rec, JSON.parse(raw));
    } catch { /* 存坏了就当新的，不值得为这个把人挡在门外 */ }
  }

  // 重发的同一条，别答第二遍
  if (update.update_id != null && rec.seen.includes(update.update_id)) return;

  if (!text) {
    await send(env, chatId, "我这边只看得懂文字，图片和语音还不会。");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (rec.day !== today) { rec.day = today; rec.neurons = 0; } // 跨天清零，跟 Cloudflare 一样按 UTC

  const model = rec.model || MODELS[env.MODEL] || env.MODEL || MODELS["8b"];

  if (text.startsWith("/")) {
    const [cmd, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ").trim();
    const done = await command(env, chatId, cmd.split("@")[0], arg, rec, model, key);
    if (done) return;
  }

  if (!env.DEEPSEEK_API_KEY && model === "deepseek") {
    await send(env, chatId, "还没配 DeepSeek 的钥匙。先 wrangler secret put DEEPSEEK_API_KEY，或者 /model 8b 换回免费的。");
    return;
  }

  typing(env, chatId); // 故意不 await：让「正在输入」尽快出现

  let out;
  try {
    out = await ask(env, model, [
      { role: "system", content: env.SYSTEM_PROMPT || DEFAULT_SYSTEM },
      ...rec.msgs,
      { role: "user", content: text },
    ]);
  } catch (e) {
    console.error("模型出错:", model, e);
    await send(env, chatId, "模型没答上来（" + String(e.message || e).slice(0, 160) + "）。\n换个模型试试：/model 8b");
    return;
  }

  await send(env, chatId, out.text);

  if (env.BOT_KV) {
    rec.msgs.push({ role: "user", content: text }, { role: "assistant", content: out.text });
    if (rec.msgs.length > KEEP_MSGS) rec.msgs = rec.msgs.slice(-KEEP_MSGS);
    if (update.update_id != null) rec.seen = [...rec.seen, update.update_id].slice(-KEEP_SEEN);
    rec.neurons += neuronsOf(model, out.usage);
    await env.BOT_KV.put(key, JSON.stringify(rec), { expirationTtl: HIST_TTL });
  }
}

/* 处理命令。返回 true 表示这条已经答完了，不用再去问模型。 */
async function command(env, chatId, cmd, arg, rec, model, key) {
  if (cmd === "/start" || cmd === "/help") {
    await send(env, chatId,
      "直接问就行，中英文都可以。\n\n" +
      "/model      看现在用哪个模型、怎么换\n" +
      "/free       看今天这个对话大概烧了多少免费额度\n" +
      "/new        重开一段，把前面聊的忘掉\n" +
      "/help       这段说明");
    return true;
  }

  if (cmd === "/new" || cmd === "/clear") {
    if (env.BOT_KV) {
      rec.msgs = [];
      await env.BOT_KV.put(key, JSON.stringify(rec), { expirationTtl: HIST_TTL });
    }
    await send(env, chatId, "好，前面的都忘了，重新开始。（模型没变，还是 " + short(model) + "）");
    return true;
  }

  if (cmd === "/model") {
    if (!arg) {
      await send(env, chatId,
        "现在用的是 " + short(model) + "\n\n" +
        "能换的：\n" +
        "/model 1b    最省，一天能聊一千多条，笨\n" +
        "/model 3b    省，中文一般\n" +
        "/model 8b    默认，一天八百来条\n" +
        "/model 70b   最聪明，一条顶八条，一天百来条就见底\n" +
        "/model deepseek  走 DeepSeek 自己的 API（要 key、要钱，中文最好）\n\n" +
        "想试目录里别的，直接粘 ID：/model @cf/某某/某某");
      return true;
    }
    const picked = MODELS[arg] || (arg.startsWith("@cf/") ? arg : "");
    if (!picked) {
      await send(env, chatId, "没这个模型。/model 看能选哪些，或者粘一个 @cf/ 开头的 ID。");
      return true;
    }
    if (!env.BOT_KV) {
      await send(env, chatId, "要绑上 KV 才记得住选择（README 第 7 步）。现在用的是 wrangler.toml 里定的 " + short(model) + "。");
      return true;
    }
    rec.model = picked;
    rec.msgs = []; // 换了脑子就别接着上一个的话茬，容易串味
    await env.BOT_KV.put(key, JSON.stringify(rec), { expirationTtl: HIST_TTL });
    await send(env, chatId, "换成 " + short(picked) + " 了，上下文一并清空。问一句试试？");
    return true;
  }

  if (cmd === "/free") {
    const used = Math.round(rec.neurons);
    const rate = RATE[model];
    let s = "今天这个对话大约烧了 " + used + " neurons。\n" +
            "每天白送 " + FREE_NEURONS + "（UTC 零点重置，全家、所有模型共用这一份）。";
    if (rate) {
      const per = (500 * rate[0] + 300 * rate[1]) / 1e6; // 按一问一答 500 进 300 出估
      s += "\n\n按 " + short(model) + " 算，一条一问一答大约 " + per.toFixed(1) +
           " neurons，也就是一天 " + Math.floor(FREE_NEURONS / per) + " 条上下。";
    }
    s += "\n\n这是照公布价估的，准数看 Cloudflare 后台的 Workers AI 用量。";
    await send(env, chatId, s);
    return true;
  }

  await send(env, chatId, "没有这个命令。/help 看能用哪些。");
  return true;
}

/* 问模型。两条路：Workers AI（免费额度内不要钱）和 DeepSeek（要 key）。 */
async function ask(env, model, messages) {
  if (model === "deepseek") {
    const r = await fetch(DEEPSEEK, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + env.DEEPSEEK_API_KEY },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || "deepseek-chat",
        messages,
        max_tokens: Number(env.MAX_TOKENS) || 800,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error("DeepSeek HTTP " + r.status + " " + (await r.text()).slice(0, 160));
    const data = await r.json();
    const out = data && data.choices && data.choices[0] && data.choices[0].message.content;
    if (!out) throw new Error("DeepSeek 返回里没有内容");
    return { text: String(out).trim(), usage: data.usage };
  }

  if (!env.AI) throw new Error('没绑 Workers AI：wrangler.toml 里缺 [ai] binding = "AI"');
  const r = await env.AI.run(model, { messages, max_tokens: Number(env.MAX_TOKENS) || 800 });
  // 不同模型返回的壳不一样，两种都认
  const out = (r && r.response) || (r && r.choices && r.choices[0] && r.choices[0].message.content);
  if (!out) throw new Error("返回里没有内容：" + JSON.stringify(r).slice(0, 160));
  return { text: String(out).trim(), usage: r.usage };
}

function neuronsOf(model, usage) {
  const rate = RATE[model];
  if (!rate || !usage) return 0;
  return ((usage.prompt_tokens || 0) * rate[0] + (usage.completion_tokens || 0) * rate[1]) / 1e6;
}

function short(model) {
  for (const k in MODELS) if (MODELS[k] === model) return k + "（" + model + "）";
  return model;
}

/* 命令行里直接试模型，不经过 Telegram。见上面 fetch 里的说明。 */
async function tryOut(request, env, url) {
  if (!env.TG_SECRET) return new Response("先设 TG_SECRET，不然这个口子谁都能用\n", { status: 403 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== env.TG_SECRET) {
    return new Response("forbidden\n", { status: 403 });
  }
  const q = url.searchParams.get("q");
  if (!q) return new Response("用法：/try?model=8b&q=你的问题\n", { status: 400 });

  const arg = url.searchParams.get("model") || "8b";
  const model = MODELS[arg] || (arg.startsWith("@cf/") ? arg : "");
  if (!model) return new Response("没这个模型：" + arg + "\n", { status: 400 });

  const t0 = Date.now();
  try {
    const out = await ask(env, model, [
      { role: "system", content: env.SYSTEM_PROMPT || DEFAULT_SYSTEM },
      { role: "user", content: q },
    ]);
    const n = neuronsOf(model, out.usage);
    return new Response(
      out.text + "\n\n--- " + model + " · " + ((Date.now() - t0) / 1000).toFixed(1) + "s" +
      (n ? " · 约 " + n.toFixed(1) + " neurons" : "") + "\n",
      { headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch (e) {
    return new Response("出错：" + String(e.message || e) + "\n", { status: 502 });
  }
}

/* 一律纯文本发，不开 parse_mode。
   模型爱写 **粗体** 和下划线，Telegram 的 Markdown 解析很挑，
   少一个星号整条就 400 发不出去 —— 宁可样式素一点，也别整条丢了。 */
async function send(env, chatId, text) {
  for (const part of chunk(text)) {
    const r = await fetch(TG + "/bot" + env.TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: part, disable_web_page_preview: true }),
    });
    if (!r.ok) console.error("sendMessage " + r.status + ": " + (await r.text()).slice(0, 200));
  }
}

function typing(env, chatId) {
  return fetch(TG + "/bot" + env.TG_TOKEN + "/sendChatAction", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

// 超长的答案切开发，尽量切在换行处，别把句子拦腰砍断
function chunk(text) {
  const out = [];
  let s = String(text);
  while (s.length > MAX_TG) {
    let cut = s.lastIndexOf("\n", MAX_TG);
    if (cut < MAX_TG / 2) cut = MAX_TG;
    out.push(s.slice(0, cut));
    s = s.slice(cut).replace(/^\n/, "");
  }
  if (s) out.push(s);
  return out;
}
