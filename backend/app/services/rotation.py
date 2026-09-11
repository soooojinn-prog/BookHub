"""Hybrid circulation logic.

- Default order follows the group's rotation positions (round-robin).
- A manual override lets the current reader hand off to any member (recorded, but
  the underlying rotation order is never overwritten).
- A book completes one loop when it returns to its chooser.
"""


def next_reader(
    order: list[int], current_user_id: int, manual_to: int | None = None
) -> int:
    """Return the next reader's user id.

    `order` is member user ids sorted by rotation_position.
    `manual_to`, if given, is returned as-is (manual handoff).
    """
    if manual_to is not None:
        if manual_to not in order:
            raise ValueError("manual target is not a member of this rotation")
        return manual_to
    if current_user_id not in order:
        raise ValueError("current reader is not in the rotation")
    idx = order.index(current_user_id)
    return order[(idx + 1) % len(order)]


def completes_loop(next_user_id: int, chooser_user_id: int) -> bool:
    """A loop is complete once the book returns to the member who chose it."""
    return next_user_id == chooser_user_id
