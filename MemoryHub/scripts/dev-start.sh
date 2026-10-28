#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ROOT=$(pwd)
if [ ! -f .env.local ] || [ ! -x .venv/bin/python ]; then
  echo '请先按 README 创建 .env.local 与 Python 虚拟环境。' >&2
  exit 1
fi
set -a
. ./.env.local
set +a
mkdir -p .local/pids artifacts
if [ -x .local/postgres/bin/pg_ctl ] && [ -d .local/pgdata ]; then
  if ! .local/postgres/bin/pg_ctl -D .local/pgdata status >/dev/null 2>&1; then
    .local/postgres/bin/pg_ctl -D .local/pgdata -l "$ROOT/artifacts/postgres.log" -o '-p 55439 -h 127.0.0.1 -k /tmp' start
  fi
fi
if [ -f .local/pids/api.pid ] && kill -0 "$(cat .local/pids/api.pid)" 2>/dev/null && curl -fsS http://127.0.0.1:8765/healthz >/dev/null 2>&1; then
  echo 'Memory Hub 已启动：http://127.0.0.1:8765'
  exit 0
fi
cd backend
../.venv/bin/alembic upgrade head
api_pid=''
worker_pid=''
cleanup() {
  trap - EXIT INT TERM
  [ -z "$api_pid" ] || kill "$api_pid" 2>/dev/null || true
  [ -z "$worker_pid" ] || kill "$worker_pid" 2>/dev/null || true
  rm -f "$ROOT/.local/pids/api.pid" "$ROOT/.local/pids/worker.pid"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
../.venv/bin/uvicorn app.api:app --host 127.0.0.1 --port 8765 --no-access-log > ../artifacts/api.log 2>&1 &
api_pid=$!
echo "$api_pid" > ../.local/pids/api.pid
../.venv/bin/python -m app.worker > ../artifacts/worker.log 2>&1 &
worker_pid=$!
echo "$worker_pid" > ../.local/pids/worker.pid
cd ..
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:8765/healthz >/dev/null 2>&1; then
    echo 'Memory Hub 已启动：http://127.0.0.1:8765'
    echo '本机验收账户：admin；密码文件：.local/admin-password（仅本机交付存在）'
    echo '请保持此终端运行；Ctrl+C 停止 API 和任务进程。另一个终端可运行 scripts/dev-stop.sh 停止数据库。'
    wait "$api_pid"
    exit $?
  fi
  sleep 1
done
echo '服务未就绪，请查看 artifacts/api.log；使用 scripts/dev-stop.sh 停止。' >&2
exit 1
