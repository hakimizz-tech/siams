"""Tiny job tracker for the async CSV export. State lives in the cache."""

import uuid

from django.core.cache import cache

JOB_TTL_SECONDS = 24 * 3600


def _key(job_id: str) -> str:
    return f"reports-job:{job_id}"


def create_job(user_id, **extra) -> str:
    job_id = uuid.uuid4().hex
    cache.set(
        _key(job_id),
        {"status": "PENDING", "user_id": str(user_id), **extra},
        JOB_TTL_SECONDS,
    )
    return job_id


def get_job(job_id: str) -> dict | None:
    return cache.get(_key(job_id))


def update_job(job_id: str, **fields) -> dict:
    job = cache.get(_key(job_id)) or {}
    job.update(fields)
    cache.set(_key(job_id), job, JOB_TTL_SECONDS)
    return job
