"""Development settings."""

from .base import *
from .base import REST_AUTH, env

DEBUG = True
ALLOWED_HOSTS = env.list(
    "DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "backend", "0.0.0.0"]
)
INSTALLED_APPS = [*INSTALLED_APPS, "django_extensions"]

ENABLE_API_DOCS = True
API_DOCS_PUBLIC = True

REST_AUTH = {**REST_AUTH, "JWT_AUTH_SECURE": False}  # plain http://localhost
