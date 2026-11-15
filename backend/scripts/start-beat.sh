#!/usr/bin/env bash
set -euo pipefail
exec celery -A config beat -l "${CELERY_LOG_LEVEL:-info}"