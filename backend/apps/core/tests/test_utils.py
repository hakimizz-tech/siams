from datetime import date

from apps.core.utils.modules import collect_beat_schedule, iter_app_modules
from apps.core.utils.text import normalize_and_hash
from apps.core.utils.timeutils import week_start, weeks_between


def test_week_start_is_monday():
    assert week_start(date(2026, 11, 8)) == date(2026, 11, 2)  # Sunday -> previous Monday
    assert week_start(date(2026, 11, 2)) == date(2026, 11, 2)  # Monday -> itself


def test_weeks_between_lists_every_overlapping_week():
    assert weeks_between(date(2026, 11, 4), date(2026, 11, 16)) == [
        date(2026, 11, 2),
        date(2026, 11, 9),
        date(2026, 11, 16),
    ]
    assert weeks_between(date(2026, 11, 16), date(2026, 11, 2)) == []


def test_normalize_and_hash_ignores_case_punctuation_and_spacing():
    assert normalize_and_hash("Worked on the  API!") == normalize_and_hash("worked on the api")
    assert normalize_and_hash("worked on the api") != normalize_and_hash("worked on the ui")


def test_iter_app_modules_skips_missing_and_finds_existing():
    assert list(iter_app_modules(["apps.core"], "no_such_module")) == []
    assert [m.__name__ for m in iter_app_modules(["apps.core"], "utils")] == ["apps.core.utils"]


def test_collect_beat_schedule_tolerates_apps_without_schedule():
    assert collect_beat_schedule(["apps.core"]) == {}
