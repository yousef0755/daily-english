#!/bin/bash
# 发布：把这一版的编号烙进每个页面，写一份 ver.json，然后推上去。
# 页面打开时会拿自己烙的号跟 ver.json 比，对不上自己重载——
# 老板不用再硬刷新（他连着三次看到旧页面，那是我的部署问题，不该他扛）。
set -e
cd "$(dirname "$0")"
BUILD=$(cat *.html shared/*.js 2>/dev/null | md5 -q | cut -c1-10)
/usr/bin/python3 - "$BUILD" <<'PY'
import re, sys, glob
from pathlib import Path
b = sys.argv[1]
tag = '<script>window.__BUILD__="%s"</script>' % b
n = 0
for f in glob.glob("*.html") + glob.glob("*/*.html"):
    p = Path(f); s = p.read_text()
    if "fam-widget.js" not in s:      # 只管挂了共享组件的那些页面
        continue
    if 'window.__BUILD__' in s:
        s = re.sub(r'<script>window\.__BUILD__="[^"]*"</script>', tag, s)
    else:
        s = s.replace("</head>", tag + "\n</head>", 1) if "</head>" in s else tag + s
    s = re.sub(r'(fam-widget\.js\?v=)[a-f0-9]+', r'\g<1>' + b[:8], s)
    p.write_text(s); n += 1
Path("ver.json").write_text('{"build":"%s"}\n' % b)
print(f"  版本 {b} 烙进 {n} 个页面")
PY
git add -A
git commit -q -m "${1:-发布}" || true
git push -q origin HEAD
echo "  ✓ 推上去了"
