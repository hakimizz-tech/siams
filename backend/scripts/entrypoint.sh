#!/usr/bin/env bash
#container entrypoint shaed by backend, worker and beat

set -euo pipefail

python manage.py wait_for_db --timeout "${DB_WAIT_TIMEOUT:-60}"

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    python manage.py migrate --noinput
fi

if [ "${COLLECTSTATIC:-0}" = "1" ]; then
    python manage.py collectstatic --noinput
fi

exec "$@"