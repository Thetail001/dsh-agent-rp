#!/data/data/com.termux/files/usr/bin/bash

set -Eeuo pipefail

printf '%s\n' \
  'Agent RP 的 Termux 安装器正在迁移到当前 patched runner，暂不执行安装或更新。' \
  '请保留 ~/.dsh 中的角色卡与会话，不要手工覆盖 DSH 包。' \
  '已安装的旧版本可以继续从原有 dsh-agent-rp 命令启动；恢复安装后会在 README 公布。' >&2
exit 1
