#!/bin/bash
# 把 webhook 挂上 / 摘下来 / 看现在什么情况。
# token 不写进文件，从环境变量拿：
#
#   export TG_TOKEN='BotFather 给的那串'
#   export TG_SECRET='你自己编的暗号，跟 wrangler secret 里那个一模一样'
#
#   ./setup-webhook.sh https://su-tg-bot.你的账号.workers.dev   # 挂上
#   ./setup-webhook.sh --info                                    # 看现在挂在哪、有没有报错
#   ./setup-webhook.sh --delete                                  # 摘掉
set -e

if [ -z "$TG_TOKEN" ]; then
  echo "先 export TG_TOKEN=... （BotFather 给的那串）"
  exit 1
fi
API="https://api.telegram.org/bot$TG_TOKEN"

case "$1" in
  --info)
    curl -s "$API/getWebhookInfo"; echo
    ;;
  --delete)
    curl -s -X POST "$API/deleteWebhook" -d drop_pending_updates=true; echo
    ;;
  "")
    echo "用法：$0 <你的 worker 网址> | --info | --delete"
    exit 1
    ;;
  *)
    if [ -z "$TG_SECRET" ]; then
      echo "先 export TG_SECRET=... （跟 wrangler secret put TG_SECRET 填的那个要一样，"
      echo "否则 Worker 会把 Telegram 挡在门外，机器人一句话都不会回）"
      exit 1
    fi
    curl -s -X POST "$API/setWebhook" \
      -d "url=$1" \
      -d "secret_token=$TG_SECRET" \
      -d "drop_pending_updates=true" \
      -d 'allowed_updates=["message"]'
    echo
    echo "挂好了。再 ./setup-webhook.sh --info 看一眼 last_error_message 是不是空的。"
    ;;
esac
