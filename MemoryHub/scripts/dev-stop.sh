#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
for service in api worker; do
  file=".local/pids/$service.pid"
  if [ -f "$file" ]; then
    pid=$(cat "$file")
    command=$(ps -p "$pid" -o command= 2>/dev/null || true)
    case "$command" in
      *app.api:app*|*app.worker*) kill "$pid" 2>/dev/null || true ;;
    esac
    rm -f "$file"
  fi
done
if [ -x .local/postgres/bin/pg_ctl ] && [ -d .local/pgdata ]; then
  if .local/postgres/bin/pg_ctl -D .local/pgdata status >/dev/null 2>&1; then
    .local/postgres/bin/pg_ctl -D .local/pgdata stop -m fast
  fi
fi
echo '本项目本地服务已停止，数据库和文件已保留。'
