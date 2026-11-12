"""Builds Django's STORAGES setting from the STORAGE_BACKEND environment variable.

filesystem  local folder (development, or one server with a persistent volume)
s3          AWS S3 and S3-compatible services (MinIO, R2, Spaces, Wasabi)
gcs         Google Cloud Storage
azure       Azure Blob Storage

Every backend is private. Files are only reachable through permission-checked API
endpoints (see apps.core.storage.serve_stored_file); cloud backends hand out
short-lived signed URLs.
"""

from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

STATICFILES_STORAGE = {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}


def build_storages(env, media_root: Path) -> dict:
    backend = env("STORAGE_BACKEND", default="filesystem").lower()
    expire = env.int("SIGNED_URL_SECONDS", default=60)

    def optional(name: str):
        return env(name, default="") or None

    if backend == "filesystem":
        default = {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {"location": str(media_root)},
        }
    elif backend == "s3":
        options = {
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME"),
            "region_name": optional("AWS_S3_REGION_NAME"),
            "endpoint_url": optional("AWS_S3_ENDPOINT_URL"),
            "access_key": optional("AWS_ACCESS_KEY_ID"),
            "secret_key": optional("AWS_SECRET_ACCESS_KEY"),
            "default_acl": None,
            "querystring_auth": True,
            "querystring_expire": expire,
            "file_overwrite": False,
            "signature_version": "s3v4",
        }
        if options["endpoint_url"]:
            options["addressing_style"] = "path"  # MinIO and friends
        default = {"BACKEND": "storages.backends.s3.S3Storage", "OPTIONS": options}
    elif backend == "gcs":
        default = {
            "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
            "OPTIONS": {
                "bucket_name": env("GS_BUCKET_NAME"),
                "expiration": timedelta(seconds=expire),
                "file_overwrite": False,
            },
        }
    elif backend == "azure":
        default = {
            "BACKEND": "storages.backends.azure_storage.AzureStorage",
            "OPTIONS": {
                "account_name": env("AZURE_ACCOUNT_NAME"),
                "account_key": env("AZURE_ACCOUNT_KEY"),
                "azure_container": env("AZURE_CONTAINER"),
                "expiration_secs": expire,
                "overwrite_files": False,
            },
        }
    else:
        raise ImproperlyConfigured(
            f"Unknown STORAGE_BACKEND '{backend}'. Use filesystem, s3, gcs or azure."
        )

    return {"default": default, "staticfiles": STATICFILES_STORAGE}
