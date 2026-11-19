#!/usr/bin/env bash
# Install the built @dylanzbot/dsh-netease-music package into a running dsh profile.
#
# Usage: scripts/link-profile.sh [--dev] [profile]
#   --dev     用 pnpm 的 `link:` 协议安装（明确软链，适合本机开发）。
#             改完 `npm run build` 后刷新页面 / 重启即生效，无需重跑本脚本。
#             省略时用 `file:` 协议安装，保持原有行为（发布 / 分发场景）。
#   profile   默认为 $DSH_PROFILE，否则 web
#
# pnpm 10 对本地目录的 `file:` / `link:` 依赖都会在 profile 的 node_modules
# 里生成指向仓库的 symlink；旧版 pnpm 或某些配置下 `file:` 会是真实拷贝。
# 本脚本先按选定协议安装，再按 TARGET 的实际形态处理：
#   - symlink：仓库的 lib/ 就是 profile 实际用的那份，无需（也不能）覆盖。
#   - 真实目录：把仓库最新 lib/ 覆盖进去，保证同版本号下也能拿到新产物。
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEV_LINK=false
PROFILE=""
for arg in "$@"; do
  case "$arg" in
    --dev)
      DEV_LINK=true
      ;;
    -h|--help)
      cat <<'EOH'
Usage: scripts/link-profile.sh [--dev] [profile]
  --dev     用 link: 协议安装（软链，适合本机开发）
  profile   默认为 $DSH_PROFILE，否则 web
EOH
      exit 0
      ;;
    -*)
      echo "unknown option: $arg" >&2
      exit 1
      ;;
    *)
      if [ -n "$PROFILE" ]; then
        echo "unexpected argument: $arg" >&2
        exit 1
      fi
      PROFILE="$arg"
      ;;
  esac
done
PROFILE="${PROFILE:-${DSH_PROFILE:-web}}"

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

if [ "$DEV_LINK" = true ]; then
  SPEC="link:$REPO"
  echo "==> @dylanzbot/dsh-netease-music -> profile '$PROFILE' (dev, link: symlink)"
else
  SPEC="file:$REPO"
  echo "==> @dylanzbot/dsh-netease-music -> profile '$PROFILE' (file:)"
fi
"$DSH_BIN" plugin --profile "$PROFILE" add --save-prod "$SPEC"

TARGET="$PROFILE_DIR/node_modules/@dylanzbot/dsh-netease-music"
mkdir -p "$(dirname "$TARGET")"
if [ -L "$TARGET" ]; then
  # 软链（link:，或 pnpm 10 下的 file:）：仓库的 lib/ 就是 profile 用的那份。
  echo "==> $TARGET is a symlink (linked checkout); skip lib sync"
  LINKED=true
elif [ -d "$TARGET" ]; then
  # 真实拷贝（旧版 pnpm 的 file:，或 tarball 安装）：同版本号下 add 不会刷新
  # lib/，所以手动把仓库最新产物覆盖过去。
  echo "==> $TARGET is a copy; syncing lib/"
  rm -rf "$TARGET/lib"
  cp -R "$REPO/lib" "$TARGET/lib"
  echo "synced: $(ls "$TARGET/lib")"
  LINKED=false
else
  echo "install target missing at $TARGET" >&2
  exit 1
fi

echo
if [ "$LINKED" = true ]; then
  cat <<EON
Profile '$PROFILE' now uses a symlink to the checkout's lib/.
  - 浏览器侧改动：npm run build（或 npm run dev 监听）后刷新 dsh Web 页面
  - 宿主侧改动：npm run build 后，在插件页「已安装」里禁用再启用本插件，
    或重启 dsh 进程
EON
else
  cat <<EON
Profile '$PROFILE' now holds the latest built artifact (copied).
  后续改动需重跑本脚本（或手动同步 lib/）才会生效：
  - 浏览器侧改动：刷新 dsh Web 页面即可
  - 宿主侧改动：在插件页「已安装」里禁用再启用本插件，或重启 dsh 进程
EON
fi
