#!/usr/bin/env bash
# 一键把本插件推到 GitHub（仓库需要先在网页上建好：https://github.com/new → 空仓库、不要勾 README）
#
# 用法：
#   ./scripts/publish-github.sh                 # 默认仓库 wufa-anon/dsh-qq-bot
#   ./scripts/publish-github.sh <owner>/<repo>  # 换仓库
#   ./scripts/publish-github.sh --dry-run       # 只打印将要执行的命令
set -euo pipefail

OWNER_REPO="wufa-anon/dsh-qq-bot"
DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -*) echo "未知参数：$arg" >&2; exit 2 ;;
    *) OWNER_REPO="$arg" ;;
  esac
done

cd "$(dirname "$0")/.."
echo "== 发布 dsh-qq-bot 到 https://github.com/$OWNER_REPO"

run () {
  if [ "$DRY" = 1 ]; then echo "   [dry-run] $*"; else "$@"; fi
}

# 1) 远端
if git remote get-url origin >/dev/null 2>&1; then
  echo "-- 已有 origin：$(git remote get-url origin)（保持不变，如需换：git remote set-url origin <url>）"
else
  run git remote add origin "https://github.com/$OWNER_REPO.git"
fi

# 2) 代码与 tag
run git push -u origin main
run git push origin v1.1.0

# 3) 提示下一步
OWNER="${OWNER_REPO%%/*}"
cat <<TIP

== 代码与 tag 已推送。最后一步：发 Release（网页操作）

  1. 打开 https://github.com/$OWNER_REPO/releases/new?tag=v1.1.0
  2. 标题：dsh-qq-bot v1.1.0
  3. 说明：把 RELEASE_NOTES-v1.1.0.md 的内容整段粘进去
  4. 附件：把 dist/dsh-qq-bot-1.1.0.tgz 拖进去
  5. 勾选 "Set as the latest release" → Publish release

  发布后别人就能一条命令安装：
    dsh plugin --profile desktop add https://github.com/$OWNER_REPO/releases/download/v1.1.0/dsh-qq-bot-1.1.0.tgz

TIP
