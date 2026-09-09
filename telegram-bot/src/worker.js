/* 家里的 Telegram 机器人 —— 跑在 Cloudflare Worker 上，不用任何机器常驻。
 *
 * 为什么不照搬那份 .py：
 *   那份是轮询（getUpdates），必须有台电脑 7×24 开着，关机机器人就死。
 *   这里换成 webhook —— 有人说话，Telegram 主动把消息 POST 过来，
 *   Worker 醒一下、答完接着睡。没人说话就是零开销，
 *   也就没有「电脑关了机器人就停了」这回事，更不用买 VPS。
 *
 * 一条消息怎么走：
 *   Telegram --POST--> 本 Worker --> DeepSeek --> sendMessage 回 Telegram
 *
 * 密钥一个都不在这个文件里，全部 wrangler secret put（见 README.md）。
 */

const TG = "https://api.telegram.org";
const DEEPSEEK = "https://api.deepseek.com/chat/completions";

const MAX_TG = 4000;      // Telegram 单条上限 4096，留点余量
const KEEP_MSGS = 12;     // 上下文留多少条（问和答各算一条）
const HIST_TTL = 6 * 3600; // 六小时不说话就忘干净，省得聊到十万八千里外

const DEFAULT_SYSTEM =
  "你是苏家的学习助手。回答简明、口语化，别写成论文。" +
  "讲英语知识时给出中文解释和例句；用户用中文问就用中文答。";

export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") return new Response("su-tg-bot ok\n");
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

    /* 只认带对暗号的请求。setWebhook 的时候设了 secret_token，
       Telegram 每次都会带上这个头；别人摸到这个网址直接打是进不来的。 */
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

  // 万一还是重发进来了（比如上面那句 200 自己超时了），别答第二遍
  if (env.BOT_KV && update.update_id != null) {
    const seen = "seen:" + update.update_id;
    if (await env.BOT_KV.get(seen)) return;
    await env.BOT_KV.put(seen, "1", { expirationTtl: 60 });
  }

  const text = (msg.text || "").trim();
  if (!text) {
    await send(env, chatId, "我这边只看得懂文字，图片和语音还不会。");
    return;
  }

  /* 机器人的地址是公开的，谁摸到都能聊的话，烧的是你的 DeepSeek 额度。
     所以先对名单。第一次用的人会被告知自己的 chat id，填进去就放行。 */
  const allowed = (env.ALLOWED_CHATS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(String(chatId))) {
    await send(env, chatId,
      "这个机器人只给家里人用。\n\n你的 chat id 是 " + chatId +
      "\n把它加进 wrangler.toml 的 ALLOWED_CHATS，再 wrangler deploy 一次就能用了。");
    return;
  }

  const key = "hist:" + chatId;

  if (text === "/start" || text === "/help") {
    await send(env, chatId,
      "在这儿直接问就行，中英文都可以。\n\n" +
      "/new  重新开一段，把前面聊的忘掉\n" +
      "/help 看这段说明");
    return;
  }
  if (text === "/new" || text === "/clear") {
    if (env.BOT_KV) await env.BOT_KV.delete(key);
    await send(env, chatId, "好，前面的都忘了，重新开始。");
    return;
  }
  if (text.startsWith("/")) {
    await send(env, chatId, "没有这个命令。/help 看能用哪些。");
    return;
  }

  if (!env.DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY 没设");
    await send(env, chatId, "我这边还没配好 DeepSeek 的钥匙，先跑一下 wrangler secret put DEEPSEEK_API_KEY。");
    return;
  }

  // 没绑 KV 也能用，只是每句话都是全新的，记不住上文
  let history = [];
  if (env.BOT_KV) {
    try {
      history = JSON.parse((await env.BOT_KV.get(key)) || "[]");
    } catch {
      history = [];
    }
  }

  typing(env, chatId); // 故意不 await：让「正在输入」尽快出现，别拖着后面的请求

  let reply;
  try {
    reply = await ask(env, [
      { role: "system", content: env.SYSTEM_PROMPT || DEFAULT_SYSTEM },
      ...history,
      { role: "user", content: text },
    ]);
  } catch (e) {
    console.error("deepseek 出错:", e);
    await send(env, chatId, "DeepSeek 那边没答上来（" + String(e.message || e).slice(0, 120) + "）。再问一遍试试。");
    return;
  }

  await send(env, chatId, reply);

  if (env.BOT_KV) {
    history.push({ role: "user", content: text }, { role: "assistant", content: reply });
    if (history.length > KEEP_MSGS) history = history.slice(-KEEP_MSGS);
    await env.BOT_KV.put(key, JSON.stringify(history), { expirationTtl: HIST_TTL });
  }
}

async function ask(env, messages) {
  const r = await fetch(DEEPSEEK, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + env.DEEPSEEK_API_KEY,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  const data = await r.json();
  const out = data && data.choices && data.choices[0] && data.choices[0].message.content;
  if (!out) throw new Error("返回里没有内容");
  return out;
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
