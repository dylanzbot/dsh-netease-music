#!/usr/bin/env bash
# Link the built @dylanzbot/dsh-netease-music package into a running dsh profile.
#
# Usage: scripts/link-profile.sh [profile]
#   profile   defaults to $DSH_PROFILE, then `web`
#
# `dsh plugin add` 用 `file:$PWD` 本地路径引用，pnpm 会把包**拷贝**（不是
# symlink）进 profile 的 node_modules。同版本号下，重新 `dsh plugin add`
# 不会重新拷贝（按 version 去重）。所以「改完代码 + npm run build 之后让
# profile 读到新产物」需要：
#   1. dsh plugin add   （只首次或 version 变化时拷新文件）
#   2. sync-into-profile  （把仓库最新 lib/ 覆盖到 profile 拷贝里）
# 本脚本两条都做：先 add，再 sync。
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-${DSH_PROFILE:-web}}"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME_DIR/profiles/$PROFILE"
DSH_BIN="${DSH_BIN:-$(command -v dsh || true)}"

if [ ! -d "$PROFILE_DIR" ]; then
  echo "no profile at $PROFILE_DIR - start dsh once, or pass the right profile name" >&2
  exit 1
fi
if [ -z "$DSH_BIN" ]; then
  echo "dsh is not on PATH (set DSH_BIN=/path/to/dsh)" >&2
  exit 1
fi
if [ ! -f "$REPO/lib/index.js" ] || [ ! -f "$REPO/lib/client.js" ]; then
  echo "no build - run: npm run build" >&2
  exit 1
fi

echo "==> @dylanzbot/dsh-netease-music -> profile '$PROFILE'"
"$DSH_BIN" plugin --profile "$PROFILE" add --save-prod "file:$REPO"

# pnpm 的 file: 引用是拷贝，不是 symlink。同 version 下重新 add 不会刷新
# profile 里的 lib/，所以手动把仓库最新 lib/ 覆盖过去。
TARGET="$PROFILE_DIR/node_modules/@dylanzbot/dsh-netease-music"
# scoped 包多一层 @dylanzbot/ 目录：pnpm add 通常会建，但目标不存在时补一刀，
# 避免 cp -R 因父目录缺失而失败。
mkdir -p "$(dirname "$TARGET")"
if [ -L "$TARGET" ]; then
  # 开发场景：pnpm 的 link: 软链直接指向仓库，仓库的 lib/ 就是 profile 用的
  # 那份，无需（也不能）先把仓库产物删掉再拷回来。
  echo "==> $TARGET is a symlink (linked checkout); skip lib sync"
elif [ -d "$TARGET" ]; then
  # 发布场景：file: 引用是拷贝，同 version 下重新 add 不会刷新 lib/，
  # 所以手动把仓库最新 lib/ 覆盖过去。
  echo "==> syncing lib/ into $TARGET"
  # 删掉 profile 拷贝里所有旧的 lib 内容（.DS_Store、旧 .d.ts、旧 client.js…）
  rm -rf "$TARGET/lib"
  cp -R "$REPO/lib" "$TARGET/lib"
  echo "synced: $(ls "$TARGET/lib")"
fi

cat <<EON

Profile '$PROFILE' now has the latest built artifact.
  - 浏览器侧改动：刷新 dsh Web 页面即可
  - 宿主侧改动：在 dsh 左侧栏「插件」页的「已安装」里禁用再启用 @dylanzbot/dsh-netease-music
    （或重启 dsh 进程）
EON
