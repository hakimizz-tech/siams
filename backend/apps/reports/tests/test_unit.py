from types import SimpleNamespace

from apps.reports.exports import COLUMNS, rows_to_csv
from apps.reports.safe import SafeSelectors
from apps.reports.summaries import lookup, plain_list, status_indicator, to_plain, weeks_dict


def test_weeks_dict_accepts_dicts_objects_and_none():
    assert weeks_dict(None) == dict.fromkeys(
        ("approved", "submitted", "returned", "missing", "expected"), 0
    )
    assert weeks_dict({"approved": 2, "missing": 1})["approved"] == 2
    assert weeks_dict(SimpleNamespace(approved=3, expected=8))["expected"] == 8


def test_to_plain_handles_dicts_namedtuples_and_objects():
    assert to_plain({"a": 1}) == {"a": 1}
    assert to_plain(SimpleNamespace(a=1, _private=2)) == {"a": 1}
    assert plain_list(None) == []
    assert plain_list([{"x": 1}]) == [{"x": 1}]


def test_lookup_accepts_uuid_or_string_keys():
    assert lookup({"abc": 5}, "abc") == 5
    assert lookup({}, "abc", 0) == 0
    assert lookup(None, "abc", 7) == 7


def test_status_indicator_priorities():
    on_track = {"weeks": {"missing": 0, "returned": 0}}
    behind = {"weeks": {"missing": 1, "returned": 0}}
    assert status_indicator(on_track) == "on_track"
    assert status_indicator(behind) == "behind"
    assert status_indicator(behind, flags=2) == "flagged"


def test_safe_selectors_swallow_only_not_implemented():
    safe = SafeSelectors()

    def missing():
        raise NotImplementedError

    assert safe.call("x.missing", missing, default=[]) == []
    assert safe.unavailable == {"x.missing"}
    assert safe.call("x.ok", lambda: 5) == 5


def test_csv_has_a_header_and_blocks_formula_injection():
    row = {"placement_id": "p1", "student": "=cmd|' /C calc'!A0", "weeks": {"approved": 3}}
    text = rows_to_csv([row]).decode("utf-8-sig")
    header, line = text.splitlines()[:2]
    assert header.startswith("Placement ID,Student")
    assert len(header.split(",")) == len(COLUMNS)
    assert "'=cmd" in line  # quoted, so spreadsheets do not execute it
