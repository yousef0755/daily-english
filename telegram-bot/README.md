# 家里的 Telegram 机器人（DeepSeek 版）

跑在 Cloudflare Worker 上，**不需要任何机器一直开着**——
你电脑关了、手机关了，它照样在。也不用买 VPS。

## 为什么不用原来那份 .py

那份用的是轮询（getUpdates）：程序自己在那儿转圈问「有新消息吗」，
所以必须有台机器 7×24 开着，关机就停。

这里换成 **webhook**：有人给机器人发消息，Telegram 主动把这条 POST 到 Worker，
Worker 醒一下、问完 DeepSeek、回完话就睡。没人说话就是零开销。

家里的数据本来就跑在 Cloudflare Worker 上（README 里那个 `su-family`），
这台机器人是同一套东西，多一个 Worker 而已。

## 要准备的三样东西

| 东西 | 哪儿拿 | 说明 |
|---|---|---|
| Bot token | Telegram 里找 [@BotFather](https://t.me/BotFather)，`/newbot` | 形如 `8123456789:AAF...` |
| DeepSeek key | https://platform.deepseek.com → API keys | 形如 `sk-...` |
| 一句暗号 | 你自己编，随便一串 | 用来证明「这条真是 Telegram 发来的」 |

**这三样都不要贴进聊天窗口、不要写进代码。** 下面第 3 步会把它们存进 Cloudflare，
存进去之后连你自己都读不出来，只有 Worker 跑的时候拿得到。

## 一步步部署

### 1. 装 wrangler（Cloudflare 的命令行）

电脑上要有 Node。然后：

```bash
cd telegram-bot
npx wrangler login          # 会跳浏览器，点授权
```

### 2. 先起个名字（可选）

`wrangler.toml` 里的 `name = "su-tg-bot"` 就是将来的网址前缀，
不喜欢可以改，改完的网址是 `https://<name>.<你的账号>.workers.dev`。

### 3. 把三样密钥存进去

一条一条跑，跑完它会让你粘贴内容（粘的时候屏幕上不显示，正常）：

```bash
npx wrangler secret put TG_TOKEN          # BotFather 给的那串
npx wrangler secret put DEEPSEEK_API_KEY  # sk-... 那串
npx wrangler secret put TG_SECRET         # 你编的那句暗号
```

### 4. 部署

```bash
npx wrangler deploy
```

结束时它会打印一个网址，形如 `https://su-tg-bot.xxx.workers.dev`——**记下来**。

### 5. 告诉 Telegram「消息往这儿送」

```bash
export TG_TOKEN='BotFather 给的那串'
export TG_SECRET='你编的那句暗号'      # 必须跟第 3 步填的一模一样
./setup-webhook.sh https://su-tg-bot.xxx.workers.dev
```

暗号对不上的话，Worker 会把 Telegram 也当外人挡掉，机器人一句话都不会回。

### 6. 开门（第一次一定会被拦下，这是故意的）

现在去 Telegram 给机器人发一句「你好」。它会回你：

> 这个机器人只给家里人用。
> 你的 chat id 是 123456789

把这个数字填进 `wrangler.toml`：

```toml
ALLOWED_CHATS = "123456789"        # 多个人就 "123456789,987654321"
```

然后 `npx wrangler deploy` 再来一次。**这回它就正常聊天了。**

为什么要这一道：机器人的网址是公开的，谁摸到都能跟它聊——
烧的是你的 DeepSeek 额度。所以默认谁都不放行。

### 7.（可选）让它记住上文

不做这一步也能用，只是每句话都是全新的，它记不住你上一句问了什么。

```bash
npx wrangler kv namespace create BOT_KV
```

把它吐出来的 `id` 填进 `wrangler.toml` 最下面那三行（把 `#` 去掉），再 deploy 一次。
之后每段对话记最近 12 条、六小时不说话自动忘掉，聊天里发 `/new` 也能当场清空。

## 平时怎么用

- 直接问，中英文都行
- `/new` —— 重开一段，忘掉前面
- `/help` —— 看说明

## 不对劲的时候

```bash
./setup-webhook.sh --info    # 看 webhook 挂在哪、last_error_message 有没有东西
npx wrangler tail            # 实时看日志，一边发消息一边看
```

几种常见情况：

| 现象 | 多半是 |
|---|---|
| 一句话都不回 | 暗号对不上（第 3 步和第 5 步的 `TG_SECRET` 不一样），或者 webhook 没挂上 |
| 回「只给家里人用」 | 第 6 步的 chat id 没填 / 填完忘了再 deploy |
| 回「DeepSeek 那边没答上来」 | key 不对或者余额没了，`wrangler tail` 里有具体状态码 |
| 同一个问题回两遍 | 绑上 KV（第 7 步），它会认出重发的那条 |

## 花多少钱

- Cloudflare Worker：免费额度每天 10 万次请求，家里几个人用远远到不了
- DeepSeek：按量付费，聊天这点量一个月几块钱
- VPS：**不用**

## 改它的口气

`wrangler.toml` 里的 `SYSTEM_PROMPT` 就是那句人设，改完 deploy 一次即可。
想让它想得深一点，把 `DEEPSEEK_MODEL` 换成 `deepseek-reasoner`（慢一些，贵一些）。
