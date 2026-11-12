"""Settings for pytest and CI: fast, isolated, no external services except the database."""

import tempfile

from .base import *
from .base import REST_FRAMEWORK, STORAGES

DEBUG = False
SECRET_KEY = "test-secret-key"
ALLOWED_HOSTS = ["testserver", "localhost"]

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Celery runs tasks inline.
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

AXES_ENABLED = False

# Health checks for services that do not exist in unit tests.
INSTALLED_APPS = [
    app
    for app in INSTALLED_APPS
    if app not in ("health_check.contrib.redis", "health_check.contrib.rabbitmq")
]

# Uploads go to a throw-away folder.
MEDIA_ROOT = tempfile.mkdtemp(prefix="siams-test-media-")
STORAGES = {
    **STORAGES,
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {"location": MEDIA_ROOT},
    },
}

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {"anon": "10000/min", "user": "10000/min"},
}

ENABLE_API_DOCS = True
API_DOCS_PUBLIC = True
DASHBOARD_CACHE_SECONDS = 0
