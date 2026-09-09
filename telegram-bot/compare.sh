#!/bin/bash
# 同一个问题，几个免费模型各答一遍，摆一块儿看谁靠谱。
# 不经过 Telegram，直接打 Worker 的 /try 口子。
#
#   export TG_SECRET='你编的那句暗号'
#   ./compare.sh https://su-tg-bot.xxx.workers.dev "用一句话解释虚拟语气，给个例句"
#
# 想单试一个：
#   ./compare.sh https://... "问题" 70b
set -e

URL="$1"; Q="$2"; ONE="$3"
if [ -z "$URL" ] || [ -z "$Q" ]; then
  echo "用法：$0 <worker网址> \"问题\" [模型简称]"
  exit 1
fi
if [ -z "$TG_SECRET" ]; then
  echo "先 export TG_SECRET=... （跟 wrangler secret put TG_SECRET 填的那个一样）"
  exit 1
fi

MODELS="${ONE:-1b 3b 8b 70b}"
for m in $MODELS; do
  echo "════════ $m ════════"
  curl -sS -G "$URL/try" \
    -H "x-telegram-bot-api-secret-token: $TG_SECRET" \
    --data-urlencode "model=$m" \
    --data-urlencode "q=$Q"
  echo
done
