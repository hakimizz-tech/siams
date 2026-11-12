"""Settings shared by every environment. All configuration comes from the environment."""

from datetime import timedelta
from pathlib import Path
import environ
from apps.core.utils.modules import collect_beat_schedule
from .storage import build_storages

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/

env = environ.Env()
# Local convenience: pick up a .env file if present. Real environment variables always win.
for _candidate in (BASE_DIR.parent / ".env", BASE_DIR / ".env"):
    if _candidate.exists():
        environ.Env.read_env(_candidate)
        break

SECRET_KEY = env("DJANGO_SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "dj_rest_auth",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "simple_history",
    "axes",
    "rules",
    "django_celery_beat",
    "health_check",
    "health_check.db",
    "health_check.cache",
    "health_check.contrib.redis",
    "health_check.contrib.rabbitmq",
]

# Team Alpha: core, accounts, placements, assessments, reports
# Team Beta:  logbook, visits, notices, notifications
LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.placements",
    "apps.logbook",
    "apps.visits",
    "apps.assessments",
    "apps.notices",
    "apps.notifications",
    "apps.reports",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
    "axes.middleware.AxesMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Database, cache, broker
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)

REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "KEY_PREFIX": "siams",
    }
}

CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="amqp://guest:guest@localhost:5672//")
BROKER_URL = CELERY_BROKER_URL  # read by django-health-check's RabbitMQ check
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_TASK_ROUTES = {
    "apps.notifications.*": {"queue": "notifications"},
    "apps.reports.*": {"queue": "reports"},
}
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
# Each app contributes BEAT_SCHEDULE from apps/<app>/schedule.py (no shared file to edit).
CELERY_BEAT_SCHEDULE = collect_beat_schedule(LOCAL_APPS)

# - Auth
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "rules.permissions.ObjectPermissionBackend",
    "django.contrib.auth.backends.ModelBackend",
]
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AXES_FAILURE_LIMIT = env.int("AXES_FAILURE_LIMIT", default=5)
AXES_COOLOFF_TIME = timedelta(hours=env.int("AXES_COOLOFF_HOURS", default=1))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Access token in the response body (sent as a Bearer header); refresh token only in an
# HttpOnly, SameSite=Strict cookie (frontend and API share one origin through Nginx).
REST_AUTH = {
    "USE_JWT": True,
    "TOKEN_MODEL": None,
    "SESSION_LOGIN": False,
    "JWT_AUTH_COOKIE": None,
    "JWT_AUTH_REFRESH_COOKIE": "siams-refresh",
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_SAMESITE": "Strict",
    "JWT_AUTH_SECURE": True,
    "LOGIN_SERIALIZER": "apps.accounts.serializers.EmailLoginSerializer",
    "USER_DETAILS_SERIALIZER": "apps.accounts.serializers.UserDetailsSerializer",
}

# - REST framework / OpenAPI -
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "20/min", "user": "120/min"},
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SIAMS API",
    "DESCRIPTION": "Student Internship & Attachment Management System",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}
ENABLE_API_DOCS = env.bool("ENABLE_API_DOCS", default=False)
API_DOCS_PUBLIC = env.bool("API_DOCS_PUBLIC", default=False)

# - CORS (not needed when frontend and API share an origin, useful in dev)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# - i18n / time
LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="Africa/Nairobi")
USE_I18N = True
USE_TZ = True  # the database always stores UTC
CELERY_TIMEZONE = TIME_ZONE

# - Static and media (private) -
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"  # never routed; files are served through permission-checked endpoints
MEDIA_ROOT = Path(env("MEDIA_ROOT", default=str(BASE_DIR / "media")))
STORAGES = build_storages(env, MEDIA_ROOT)

# - Email -
vars().update(env.email("EMAIL_URL", default="consolemail://"))
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="SIAMS <no-reply@siams.local>")

# - Business defaults (services read these; override per environment) -
MAX_HOURS_PER_DAY = env.int("MAX_HOURS_PER_DAY", default=12)
HOURS_OUTLIER_DAY = env.int("HOURS_OUTLIER_DAY", default=10)
HOURS_OUTLIER_WEEK = env.int("HOURS_OUTLIER_WEEK", default=60)
MIN_ACTIVITY_CHARS = env.int("MIN_ACTIVITY_CHARS", default=30)
LATE_SUBMISSION_DAYS = env.int("LATE_SUBMISSION_DAYS", default=7)
REVIEW_REMINDER_HOURS = env.int("REVIEW_REMINDER_HOURS", default=48)
REVIEW_ESCALATION_HOURS = env.int("REVIEW_ESCALATION_HOURS", default=72)
MAX_IMAGES_PER_WEEK = env.int("MAX_IMAGES_PER_WEEK", default=5)
MAX_IMAGE_MB = env.int("MAX_IMAGE_MB", default=5)
MAX_REPORT_MB = env.int("MAX_REPORT_MB", default=10)
REQUIRE_FINAL_REPORT_FOR_RESULT = env.bool("REQUIRE_FINAL_REPORT_FOR_RESULT", default=True)

# - Logging: structured JSON to stdout (12-factor) -
LOG_JSON = env.bool("LOG_JSON", default=True)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if LOG_JSON else "plain",
        },
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}
# --- Alpha M1-M4 additions ---
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost")
PASSWORD_RESET_TIMEOUT = 7 * 24 * 3600  # invite links last a week
REST_AUTH["PASSWORD_RESET_SERIALIZER"] = "apps.accounts.serializers.PasswordResetSerializer"
SCORING_STRATEGY = env(
    "SCORING_STRATEGY",
    default="apps.assessments.scoring.WeightedPercentStrategy",
)
DASHBOARD_CACHE_SECONDS = env.int("DASHBOARD_CACHE_SECONDS", default=30)
# --- reports app ---
