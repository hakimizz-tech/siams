import pytest

from apps.core import events


def test_every_event_is_a_signal():
    assert len(events.ALL_EVENTS) == 17
    assert all(hasattr(signal, "send") for signal in events.ALL_EVENTS)


@pytest.mark.django_db
def test_emit_delivers_only_after_commit(django_capture_on_commit_callbacks):
    received = []

    def handler(sender, **payload):
        received.append(payload["placement_id"])

    events.placement_submitted.connect(handler)
    try:
        with django_capture_on_commit_callbacks(execute=True):
            events.emit(events.placement_submitted, sender="test", placement_id="abc")
            assert received == []  # nothing yet: still inside the transaction
        assert received == ["abc"]
    finally:
        events.placement_submitted.disconnect(handler)
