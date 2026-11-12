FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# dev (bind-mounted source, runs as root for simple volume permissions)
FROM base AS dev
COPY requirements/ requirements/
RUN pip install -r requirements/dev.txt
COPY . .
RUN chmod +x scripts/*.sh && mkdir -p /app/media
ENTRYPOINT ["scripts/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# builder (prod wheels)
FROM base AS builder
ARG STORAGE_EXTRA=s3
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements/ requirements/
RUN pip wheel --wheel-dir /wheels \
        -r requirements/prod.txt \
        -r requirements/storages/${STORAGE_EXTRA}.txt

#  prod (non-root, no dev tools)
FROM base AS prod
COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/* && rm -rf /wheels
COPY . .
RUN chmod +x scripts/*.sh \
    && useradd --create-home appuser \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD curl -fsS -H "X-Forwarded-Proto: https" http://localhost:8000/health/ || exit 1
ENTRYPOINT ["scripts/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "30"]
