"""Production and staging settings. Strict by default, nothing implicit."""

from .base import *
from .base import REST_AUTH, env

DEBUG = False

# Required variables: the process refuses to start without them.
SECRET_KEY = env("DJANGO_SECRET_KEY")
# localhost is allowed so container health checks work.
ALLOWED_HOSTS = [*env.list("DJANGO_ALLOWED_HOSTS"), "localhost", "127.0.0.1"]
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)

# Behind Nginx / a TLS-terminating load balancer.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_REDIRECT_EXEMPT = [r"^health/$"]
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

REST_AUTH = {**REST_AUTH, "JWT_AUTH_SECURE": True}

# Swagger is off unless explicitly enabled (staging); even then it needs an admin login
# unless API_DOCS_PUBLIC=True.
ENABLE_API_DOCS = env.bool("ENABLE_API_DOCS", default=False)
API_DOCS_PUBLIC = env.bool("API_DOCS_PUBLIC", default=False)

SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        send_default_pii=False,
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0),
    )
