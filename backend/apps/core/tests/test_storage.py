import re
from datetime import timedelta

import environ
import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.core.storage import dated_upload_path
from apps.core.validators import validate_document, validate_image
from config.settings.storage import build_storages

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF = b"%PDF-1.4\n" + b"0" * 64


def test_dated_upload_path_layout_and_random_name():
    path = dated_upload_path("logbook")(None, "My Photo.JPG")
    assert re.fullmatch(r"\d{4}/\d{2}/\d{2}/logbook/[0-9a-f]{32}\.jpg", path)
    assert "My Photo" not in path


def test_filesystem_backend_is_default(tmp_path, monkeypatch):
    monkeypatch.delenv("STORAGE_BACKEND", raising=False)
    storages = build_storages(environ.Env(), tmp_path)
    assert storages["default"]["BACKEND"] == "django.core.files.storage.FileSystemStorage"
    assert storages["default"]["OPTIONS"]["location"] == str(tmp_path)


def test_s3_backend_is_private_and_signed(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "s3")
    monkeypatch.setenv("AWS_STORAGE_BUCKET_NAME", "siams-files")
    monkeypatch.setenv("AWS_S3_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setenv("SIGNED_URL_SECONDS", "45")
    options = build_storages(environ.Env(), tmp_path)["default"]["OPTIONS"]
    assert options["bucket_name"] == "siams-files"
    assert options["default_acl"] is None
    assert options["querystring_auth"] is True
    assert options["querystring_expire"] == 45
    assert options["addressing_style"] == "path"


def test_gcs_and_azure_backends(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "gcs")
    monkeypatch.setenv("GS_BUCKET_NAME", "bucket")
    gcs = build_storages(environ.Env(), tmp_path)["default"]
    assert gcs["BACKEND"] == "storages.backends.gcloud.GoogleCloudStorage"
    assert gcs["OPTIONS"]["expiration"] == timedelta(seconds=60)

    monkeypatch.setenv("STORAGE_BACKEND", "azure")
    monkeypatch.setenv("AZURE_ACCOUNT_NAME", "acct")
    monkeypatch.setenv("AZURE_ACCOUNT_KEY", "key")
    monkeypatch.setenv("AZURE_CONTAINER", "files")
    azure = build_storages(environ.Env(), tmp_path)["default"]
    assert azure["BACKEND"] == "storages.backends.azure_storage.AzureStorage"


def test_unknown_backend_fails_fast(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "ftp")
    with pytest.raises(ImproperlyConfigured):
        build_storages(environ.Env(), tmp_path)


def test_image_validator_accepts_real_png():
    validate_image(SimpleUploadedFile("a.png", PNG), max_mb=5)


def test_image_validator_rejects_renamed_executable():
    fake = SimpleUploadedFile("evil.jpg", b"MZ\x90\x00" + b"\x00" * 64)
    with pytest.raises(Exception, match="content"):
        validate_image(fake, max_mb=5)


def test_image_validator_rejects_wrong_extension_and_oversize():
    with pytest.raises(Exception, match="not allowed"):
        validate_image(SimpleUploadedFile("a.gif", PNG), max_mb=5)
    with pytest.raises(Exception, match="larger"):
        validate_image(SimpleUploadedFile("a.png", PNG + b"0" * 2 * 1024 * 1024), max_mb=1)


def test_document_validator_accepts_pdf_and_rejects_png():
    validate_document(SimpleUploadedFile("report.pdf", PDF), max_mb=10)
    with pytest.raises(Exception, match="content"):
        validate_document(SimpleUploadedFile("report.pdf", PNG), max_mb=10)
