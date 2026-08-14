#!/data/data/com.termux/files/usr/bin/bash

set -Eeuo pipefail

DSH_VERSION="${DSH_VERSION:-0.1.0-rc.6}"
AGENT_RP_SOURCE="${AGENT_RP_SOURCE:-github:hewzhew/dsh-agent-rp#main}"
AGENT_RP_RAW_BASE="${AGENT_RP_RAW_BASE:-https://raw.githubusercontent.com/hewzhew/dsh-agent-rp/main}"

say() {
  printf '\n\033[1;36m%s\033[0m\n' "$1"
}

die() {
  printf '\n\033[1;31m安装停止：%s\033[0m\n' "$1" >&2
  exit 1
}

command -v pkg >/dev/null 2>&1 || die '请在 Termux 中运行这个安装器。'
case "$(uname -m)" in
  aarch64|arm64) ;;
  *) die "第一版只支持 ARM64 安卓设备，当前架构是 $(uname -m)。" ;;
esac

android_api="$(getprop ro.build.version.sdk 2>/dev/null || true)"
if [[ "$android_api" =~ ^[0-9]+$ ]] && (( android_api < 30 )); then
  die "当前设备是 Android API $android_api；第一版需要 Android 11（API 30）或更高版本。"
fi

say '1/6 更新 Termux，并安装 Node 与原生构建工具'
pkg update -y
pkg upgrade -y
pkg install -y nodejs git curl cmake clang make python binutils pkg-config libandroid-spawn

node_version="$(node -p 'process.versions.node')"
node_major="${node_version%%.*}"
if (( node_major < 22 )); then
  die "DSH 需要 Node 22.19 或更高版本，Termux 当前提供的是 $node_version。"
fi

say '2/6 准备安卓原生模块的 Node 构建头文件'
npx --yes node-gyp@latest install "$node_version"
common_gypi="$(find "$HOME/.cache/node-gyp/$node_version" -path '*/include/node/common.gypi' -print -quit)"
[[ -n "$common_gypi" && -f "$common_gypi" ]] || die "没有找到 Node $node_version 的 common.gypi。"
python - "$common_gypi" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
marker = "'android_ndk_path%': '', # dsh-agent-rp Termux"
if marker not in source:
    match = re.search(r"(['\"]variables['\"]\s*:\s*\{)", source)
    if match is None:
        raise SystemExit("common.gypi 中没有 variables 配置块")
    source = source[:match.end()] + "\n    " + marker + source[match.end():]
    path.write_text(source, encoding="utf-8")
if marker not in path.read_text(encoding="utf-8"):
    raise SystemExit("android_ndk_path 补丁校验失败")
PY

say "3/6 安装 DSH $DSH_VERSION"
export CFLAGS="${CFLAGS:-} -target aarch64-linux-android30"
export CXXFLAGS="${CXXFLAGS:-} -target aarch64-linux-android30"
npm install --global --foreground-scripts --allow-scripts=koffi,node-pty,sharp "@deepseek-ai/dsh@$DSH_VERSION"
npm install --global pnpm@11

dsh_root="$(npm root --global)/@deepseek-ai/dsh"
[[ -f "$dsh_root/lib/bin.js" ]] || die "DSH 已安装，但没有找到启动入口：$dsh_root/lib/bin.js"

say '4/6 安装安卓可用的图片解码后备模块'
(
  cd "$dsh_root"
  npm install --no-save --no-package-lock --ignore-scripts @img/sharp-wasm32
)

say '5/6 检查安卓文件系统兼容性'
support_dir="$HOME/.local/share/dsh-agent-rp"
bin_dir="$HOME/.local/bin"
mkdir -p "$support_dir" "$bin_dir"
curl -fsSL "$AGENT_RP_RAW_BASE/scripts/termux-compat.mjs" -o "$support_dir/termux-compat.mjs"
curl -fsSL "$AGENT_RP_RAW_BASE/scripts/doctor-termux.sh" -o "$bin_dir/dsh-agent-rp-doctor"
chmod 700 "$bin_dir/dsh-agent-rp-doctor"
node "$support_dir/termux-compat.mjs" "$dsh_root"

launcher="$bin_dir/dsh-agent-rp"
cat > "$launcher" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
exec node --expose-internals "$dsh_root/lib/bin.js" --profile web "\$@"
EOF
chmod 700 "$launcher"

if [[ ":$PATH:" != *":$bin_dir:"* ]]; then
  printf '\n# DSH Agent RP\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$HOME/.bashrc"
  export PATH="$bin_dir:$PATH"
fi

say '6/6 安装 Agent RP 插件'
node --expose-internals "$dsh_root/lib/bin.js" plugin --profile web add "$AGENT_RP_SOURCE"

printf '\n\033[1;32m安装完成。\033[0m\n'
printf '运行：\033[1mdsh-agent-rp --port 3080\033[0m\n'
printf '然后用手机浏览器打开：\033[1mhttp://127.0.0.1:3080\033[0m\n'
printf '遇到问题时运行：\033[1mdsh-agent-rp-doctor\033[0m\n'
printf '更新插件时重新运行本安装命令即可；角色卡和会话保存在 ~/.dsh，不会被覆盖。\n'
