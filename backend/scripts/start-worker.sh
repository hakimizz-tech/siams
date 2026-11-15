#!/usr/bin/env bash
set -euo pipefail
exec celery -A config worker -l "${CELERY_LOG_LEVEL:-info}" -Q "${CELERY_QUEUE:-default, notifications,reports}"