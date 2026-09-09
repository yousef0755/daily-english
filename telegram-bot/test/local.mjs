/* 不联网、不花钱、不碰真的 Telegram —— 用假的 fetch 和假的 AI 跑一遍全部逻辑。
 * 改完代码先跑这个：  node test/local.mjs
 * 全过了再 wrangler deploy，省得拿家里人当小白鼠。
 */
import worker from "../src/worker.js";

const sent = [];
let lastAI = null, writes = 0;

globalThis.fetch = async (url, opts) => {
  const body = opts ? JSON.parse(opts.body) : null;
  if (String(url).includes("api.telegram.org")) {
    if (String(url).includes("sendMessage")) sent.push(body.text);
    return new Response("{}", { status: 200 });
  }
  if (String(url).includes("deepseek")) {
    return new Response(JSON.stringify({
      choices: [{ message: { content: "DeepSeek 说：" + body.messages.at(-1).content } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error("意外的请求 " + url);
};

const kv = new Map();
const mkEnv = (over = {}) => ({
  TG_TOKEN: "t", TG_SECRET: "s", DEEPSEEK_API_KEY: "k",
  ALLOWED_CHATS: "111", MODEL: "8b",
  AI: {
    run: async (model, opts) => {
      lastAI = model;
      const q = opts.messages.at(-1).content;
      return {
        response: q === "长" ? "x".repeat(9000) : model.split("/").pop() + " 说：" + q,
        usage: { prompt_tokens: 500, completion_tokens: 300 },
      };
    },
  },
  BOT_KV: {
    get: async (k) => kv.get(k) ?? null,
    put: async (k, v) => { writes++; kv.set(k, v); },
    delete: async (k) => void kv.delete(k),
  },
  ...over,
});
let env = mkEnv();
const jobs = [];
const ctx = { waitUntil: (p) => jobs.push(p) };

async function post(update, secret = "s") {
  sent.length = 0; lastAI = null;
  const r = await worker.fetch(new Request("https://x/", {
    method: "POST", body: JSON.stringify(update),
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
  }), env, ctx);
  await Promise.all(jobs.splice(0));
  return { status: r.status, sent: [...sent] };
}
const get = (path, secret) => worker.fetch(new Request("https://x" + path, {
  headers: secret ? { "x-telegram-bot-api-secret-token": secret } : {},
}), env, ctx);
const msg = (id, text, chat = 111) => ({ update_id: id, message: { chat: { id: chat }, text } });

let bad = 0;
const ok = (c, label, extra = "") => { if (!c) bad++; console.log((c ? "  ✓ " : "  ✗ ") + label + (!c && extra ? "  → " + extra : "")); };

console.log("\n路由与鉴权");
ok((await get("/")).status === 200, "GET / 健康检查");
ok((await post(msg(1, "hi"), "wrong")).status === 403, "暗号不对 → 403");
ok((await post(msg(2, "hi"))).status === 200, "暗号对 → 200（先回 200 再干活）");

console.log("\n名单");
let r = await post(msg(3, "你好", 999));
ok(r.sent[0]?.includes("999"), "陌生人被拦下并被告知 chat id", r.sent[0]);

console.log("\n默认走免费的 Workers AI");
kv.clear();
r = await post(msg(4, "你好"));
ok(lastAI === "@cf/meta/llama-3.1-8b-instruct-fp8-fast", "默认 8b，没碰 DeepSeek", String(lastAI));
ok(r.sent[0].includes("你好"), "正常答话", r.sent[0]);

console.log("\n换模型");
ok((await post(msg(5, "/model"))).sent[0].includes("70b"), "/model 列出可选");
r = await post(msg(6, "/model 70b"));
ok(r.sent[0].includes("70b"), "/model 70b 切换", r.sent[0]);
await post(msg(7, "再问一句"));
ok(lastAI === "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "之后真的用 70b", String(lastAI));
await post(msg(8, "/model @cf/qwen/qwen-something"));
await post(msg(9, "还在吗"));
ok(lastAI === "@cf/qwen/qwen-something", "允许直接粘任意 @cf/ ID（目录会变）", String(lastAI));
ok((await post(msg(10, "/model 999b"))).sent[0].includes("没这个模型"), "乱填的模型被挡下");
await post(msg(11, "/model deepseek"));
r = await post(msg(12, "试试"));
ok(r.sent[0].startsWith("DeepSeek 说"), "/model deepseek 切到付费那条路", r.sent[0]);

console.log("\n上下文与用量");
kv.clear();
await post(msg(20, "第一句"));
await post(msg(21, "第二句"));
let rec = JSON.parse(kv.get("chat:111"));
ok(rec.msgs.length === 4, "问答都进了上下文");
ok(rec.neurons > 0, "估算了 neurons 用量：" + rec.neurons.toFixed(1));
r = await post(msg(22, "/free"));
ok(r.sent[0].includes("10000") && /\d+ 条上下/.test(r.sent[0]), "/free 说得出今天还能聊多少", r.sent[0].split("\n")[0]);
await post(msg(23, "/new"));
ok(JSON.parse(kv.get("chat:111")).msgs.length === 0, "/new 清空上下文");

console.log("\n免费额度最紧的是 KV 写次数");
kv.clear(); writes = 0;
await post(msg(30, "一句话"));
ok(writes === 1, "一条消息只写一次 KV（免费额度 1000 写/天）", "实际写了 " + writes + " 次");

console.log("\n重发与长回答");
kv.clear();
const a = await post(msg(40, "同一条"));
const b = await post(msg(40, "同一条"));
ok(a.sent.length === 1 && b.sent.length === 0, "同一个 update_id 只答一次");
r = await post(msg(41, "长"));
ok(r.sent.length === 3 && r.sent.every((s) => s.length <= 4000), "9000 字切成 " + r.sent.length + " 条，都没超 4000");

console.log("\n命令行试模型（不经过 Telegram）");
ok((await get("/try?q=hi")).status === 403, "/try 没暗号 → 403");
let res = await get("/try?q=虚拟语气&model=70b", "s");
let body = await res.text();
ok(res.status === 200 && body.includes("llama-3.3-70b"), "/try 能指定模型并标出用了哪个", body.split("\n").at(-2));
ok(/neurons/.test(body), "/try 顺带报出这次烧了多少", body.split("\n").at(-2));
ok((await get("/try?q=x&model=999b", "s")).status === 400, "/try 乱填模型 → 400");

console.log("\n出事的时候");
env = mkEnv({ AI: { run: async () => { throw new Error("Model not found"); } } });
r = await post(msg(50, "问一句"));
ok(r.sent[0].includes("Model not found") && r.sent[0].includes("/model"), "模型挂了：说清原因 + 给出路", r.sent[0]);
env = mkEnv({ AI: undefined });
r = await post(msg(51, "问一句"));
ok(r.sent[0].includes("[ai]"), "忘了绑 AI：直接点出 wrangler.toml 少了什么", r.sent[0]);
env = mkEnv();

console.log("\nKV 没绑也能用");
env = mkEnv({ BOT_KV: undefined });
r = await post(msg(60, "你好"));
ok(r.sent[0].includes("你好"), "照样答话（只是记不住上文）", r.sent[0]);
ok((await post(msg(61, "/model 70b"))).sent[0].includes("KV"), "换模型时明说要绑 KV");

console.log(bad === 0 ? "\n全过。\n" : "\n有 " + bad + " 项没过。\n");
process.exit(bad ? 1 : 0);
