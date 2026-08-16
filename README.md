# 苏家 · 一家人的学习站

全家的页面都在这一个仓库里（老板 2026-08-16：「把所有的都放到一个仓库，方便管理」）。
线上地址：https://yousef0755.github.io/daily-english/

## 谁的页在哪

| 人 | 网址 | 做什么 |
|---|---|---|
| 一家人 | `family.html` | 今天谁来了、搭子、玩具篮、排行 |
| 博远 | `kid.html` | 六门功课、念十遍、日记、当小老师 |
| 曼雅 | `mie.html` | 跟 Snowy 说英文 |
| 曼雅 | `forest/` | 她的森林（原 mie-forest 仓库） |
| 玺雅 | `xiya.html` | 每天一件 AI 的用法 |
| 霏雅 | `feiya/` | 诗语小园（原 feiya-garden 仓库） |
| 妈妈 | `arabic.html` | 阿拉伯语 |
| 爸爸 | `index.html` | 每天五分钟 |

**这几个网址不要改。** 家里人手机上存了书签，博远那个还是装成 App 的
（`kid.webmanifest` + `kid-sw.js`），改了路径他桌面上的图标就打不开了。

## 其他文件夹

| 文件夹 | 放什么 |
|---|---|
| `shared/` | `fam-widget.js` —— 每页最下面那一块（收留言、搭子邀请、排行榜） |
| `media/` | 音频：`kidaudio/` `gvoices/` `voices/` `audio/` `hanzi/` |
| `icons/` | 各页的图标、favicon |
| `tools/` | 生成音频的脚本 |
| `archive/` | 停用的东西，留着备查 |

## 数据在哪

页面本身是静态的，数据在 Cloudflare Worker 上：
`https://su-family.yousef-abud.workers.dev`（源码 `~/Projects/gmail-sender/worker_fam.js`）

- `/fam/board`、`/fam/ping` —— 今天谁来了、学了多久
- `/fam/says`、`/fam/say` —— 家里人互相留话
- `/fam/invites`、`/fam/pair` —— 搭子
- 存储用 KV，**一人一把键**（`say:收信人:发信人`、`pair:周:人`）。
  不要改回「整坨读出来再写回去」——KV 是最终一致的，两个人同时写会互相覆盖，
  之前博远给曼雅的留言就是这么没的。

## 两条别踩的坑

1. **本机调试不会往榜上报打卡**。每页 `<head>` 里有一段拦截，
   localhost 打开时 `/fam/ping` 直接被挡下。不要删——
   删了你一开预览就等于替家里人打了卡。
2. **孩子的录音一律不上传**。念十遍、当小老师、跟 Snowy 聊天，
   录音只在本地判断；跨设备传的只有孩子自己打的字。
