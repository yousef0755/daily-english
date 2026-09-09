# 家里的 Telegram 机器人（免费版）

跑在 Cloudflare Worker 上，**不需要任何机器一直开着**——
你电脑关了、手机关了，它照样在。也不用买 VPS。

默认用 Cloudflare 自己托管的模型（Workers AI），**不要 API key、不要绑卡**，
每天白送 10000 neurons。DeepSeek 留着，聊天里 `/model deepseek` 一句话切过去。

## 免费到底能干什么

Cloudflare 每天送 **10000 neurons**，UTC 零点重置，全家、所有模型共用这一份。
按公布的价钱折算成「一问一答」（大概 500 token 进、300 token 出）：

| `/model` | 模型 | 一条约烧 | 一天大概能聊 | 什么感觉 |
|---|---|---|---|---|
| `1b` | llama-3.2-1b | 6.7 | **1400 条** | 反应快，但笨，中文勉强 |
| `3b` | llama-3.2-3b | 11.4 | **870 条** | 日常问答够用 |
| `8b` | llama-3.1-8b-fp8-fast | 12.5 | **800 条** | 默认。够聊 |
| `70b` | llama-3.3-70b-fp8-fast | 74.8 | **130 条** | 明显聪明一档，但一条顶六条 |
| `deepseek` | DeepSeek API | — | 不限 | 中文最好，**但要 key、要钱** |

家里几个人一天问几十条，`8b` 完全用不完；`70b` 拿来问难题，一天百来条也够。
超了不会扣钱，是**当天用不了了**，等 UTC 零点（北京时间早上 8 点）自动恢复——
除非你自己去开 Workers Paid（$5/月）。

其他几项免费额度，家用都撞不到：Worker 每天 10 万次请求，
KV 每天 10 万次读、**1000 次写**。写次数是最紧的一项，所以代码里
一条消息只写一次 KV（上下文、模型、用量塞在同一把钥匙里）——够一天上千条。

有个反常的地方值得知道：**Workers AI 上的 DeepSeek 模型是要绑卡的**，
所以「免费」这条路上反而用不了 DeepSeek，得用上面那几个 Llama。

聊天里随时发 `/free`，它会告诉你今天这个对话烧了多少、还能聊多少。

## 你要动手的部分

我这边没法替你做的只有一件：**去 Telegram 里建这个机器人**（要用你的账号）。
剩下的都是复制粘贴。

### 1. 建机器人，拿 token（两分钟）

Telegram 里搜 [@BotFather](https://t.me/BotFather) → `/newbot` →
给它起个名字（显示用）→ 再起个用户名（必须 `bot` 结尾，比如 `su_family_bot`）。

它会回你一串 `8123456789:AAF...`，**那就是 token**。
这串谁拿到谁就能冒充你的机器人，别贴进聊天窗口、别写进代码。

### 2. 装 wrangler，登录

电脑上要有 Node。

```bash
cd telegram-bot
npx wrangler login          # 跳浏览器，点授权
```

### 3. 存两样密钥

```bash
npx wrangler secret put TG_TOKEN     # 第 1 步那串
npx wrangler secret put TG_SECRET    # 你自己编一句暗号，随便一串
```

（用免费模型就这两样，**不用 DeepSeek 的 key**。
以后想用再 `npx wrangler secret put DEEPSEEK_API_KEY`。）

暗号是干嘛的：Worker 的网址是公开的，靠这句暗号认出「这条真是 Telegram 发来的」。

### 4. 绑一块 KV（记上下文、记模型、记用量）

```bash
npx wrangler kv namespace create BOT_KV
```

把它吐出来的 `id` 填进 `wrangler.toml` 最下面那三行，把 `#` 去掉。

不做也能聊，但记不住上文、换不了模型、看不了 `/free`——建议做，也是免费的。

### 5. 部署

```bash
npx wrangler deploy
```

结束时打印一个网址，形如 `https://su-tg-bot.xxx.workers.dev`，**记下来**。

### 6. 告诉 Telegram「消息往这儿送」

```bash
export TG_TOKEN='第 1 步那串'
export TG_SECRET='第 3 步那句暗号'
./setup-webhook.sh https://su-tg-bot.xxx.workers.dev
```

### 7. 开门（第一次一定被拦，这是故意的）

去 Telegram 给机器人发句「你好」。它会回：

> 这个机器人只给家里人用。
> 你的 chat id 是 123456789

把数字填进 `wrangler.toml`，然后 `npx wrangler deploy` 再来一次：

```toml
ALLOWED_CHATS = "123456789"        # 一家人就 "123456789,987654321,..."
```

**这回就能聊了。**

为什么要这一道：机器人网址是公开的，谁摸到都能跟它聊，烧的是你的额度。

## 想比模型，不用在 Telegram 里来回切

同一个问题让几个模型各答一遍，摆一块儿看：

```bash
export TG_SECRET='你那句暗号'
./compare.sh https://su-tg-bot.xxx.workers.dev "用一句话解释虚拟语气，给个例句"
```

会打印 1b / 3b / 8b / 70b 四份答案，每份底下标着用时和大概烧了多少 neurons。
**这是判断「免费够不够用」最快的办法**——看完就知道该把默认设成哪个。

单试一个：`./compare.sh https://... "问题" 70b`

## 平时怎么用

- 直接问，中英文都行
- `/model` —— 看现在用哪个、换一个（换完上下文会清空，免得串味）
- `/free` —— 今天烧了多少、还能聊多少
- `/new` —— 重开一段
- `/help`

## 改完代码先跑这个

```bash
node test/local.mjs
```

假 fetch、假模型，不联网不花钱，把鉴权、名单、换模型、上下文、
重发去重、长回答切分、出错处理全过一遍。绿了再 deploy，
省得拿家里人当小白鼠。

## 不对劲的时候

```bash
./setup-webhook.sh --info    # webhook 挂在哪、last_error_message 有没有东西
npx wrangler tail            # 实时日志，一边发消息一边看
```

| 现象 | 多半是 |
|---|---|
| 一句话都不回 | 暗号对不上（第 3 步和第 6 步的 `TG_SECRET` 不一样），或 webhook 没挂上 |
| 回「只给家里人用」 | 第 7 步的 chat id 没填 / 填完忘了再 deploy |
| 回「模型没答上来 … 404」 | 模型 ID 变了。去 Cloudflare 后台 Workers AI 看当前目录，`/model @cf/新的/ID` 直接粘 |
| 回「模型没答上来 … 402/429」 | 当天 10000 neurons 用完了，等 UTC 零点，或 `/model 1b` 省着用 |
| 同一个问题回两遍 | KV 没绑（第 4 步），它认不出重发的那条 |
| 中文答得别扭 | Llama 的中文就这样。`/model 70b` 好一档，还不行就 `/model deepseek` |

## 花多少钱

- Cloudflare Worker + Workers AI + KV：**0 元**（在上面那张表的量以内）
- DeepSeek：只有你主动 `/model deepseek` 才用得上，按量付费，一个月几块钱
- VPS：**不用**
