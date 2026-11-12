"""Optional per-app modules, discovered by name so teams never edit shared files.

apps/<app>/schedule.py  ->  BEAT_SCHEDULE = {...}   (periodic Celery tasks)
apps/<app>/seed.py      ->  def seed(): ...         (demo data, `make seed`)
"""

import importlib
from collections.abc import Iterable, Iterator
from types import ModuleType


def iter_app_modules(apps: Iterable[str], suffix: str) -> Iterator[ModuleType]:
    for app in apps:
        name = f"{app}.{suffix}"
        try:
            yield importlib.import_module(name)
        except ModuleNotFoundError as exc:
            if exc.name != name:  # a real import error inside the module: surface it
                raise


def collect_beat_schedule(apps: Iterable[str]) -> dict:
    """Merge BEAT_SCHEDULE from every app's schedule.py (which must not import models)."""
    schedule: dict = {}
    for module in iter_app_modules(apps, "schedule"):
        schedule.update(getattr(module, "BEAT_SCHEDULE", {}))
    return schedule
