import pytest

from app.services.rotation import completes_loop, next_reader


def test_round_robin_advances():
    order = [10, 20, 30, 40]
    assert next_reader(order, 10) == 20
    assert next_reader(order, 30) == 40


def test_round_robin_wraps_to_first():
    order = [10, 20, 30, 40]
    assert next_reader(order, 40) == 10


def test_manual_override_returns_target():
    order = [10, 20, 30, 40]
    assert next_reader(order, 10, manual_to=30) == 30


def test_manual_target_must_be_member():
    with pytest.raises(ValueError):
        next_reader([10, 20], 10, manual_to=99)


def test_completes_loop_on_return_to_chooser():
    chooser = 10
    order = [10, 20, 30, 40]
    # simulate a full circle starting from chooser
    current = chooser
    completed = False
    for _ in range(len(order)):
        nxt = next_reader(order, current)
        if completes_loop(nxt, chooser):
            completed = True
            break
        current = nxt
    assert completed is True
    # the loop closes exactly when handing off from the last member (40) back to 10
    assert next_reader(order, 40) == chooser
