#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f .env.local ]; then
  echo 'Create .env.local with DATABASE_URL, PUBLIC_URL, DATA_DIR and COOKIE_SECURE first.' >&2
  exit 1
fi
set -a
. ./.env.local
set +a
cd backend
../.venv/bin/alembic upgrade head
exec ../.venv/bin/uvicorn app.api:app --host 127.0.0.1 --port 8765 --no-access-log
