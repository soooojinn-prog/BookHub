from sqlalchemy import select

from app.models.book import Book
from app.models.handoff_event import HandoffEvent


def test_handoff_event_create(db_session, owned_group):
    group, owner = owned_group
    book = Book(
        group_id=group.id,
        title="파친코",
        author="이민진",
        genre="장편소설",
        total_pages=480,
        chooser_user_id=owner.id,
        current_holder_user_id=owner.id,
    )
    db_session.add(book)
    db_session.flush()

    event = HandoffEvent(book_id=book.id, from_user_id=None, to_user_id=owner.id, note="시작")
    db_session.add(event)
    db_session.flush()

    rows = db_session.scalars(
        select(HandoffEvent).where(HandoffEvent.book_id == book.id)
    ).all()
    assert len(rows) == 1
    assert rows[0].to_user_id == owner.id
    assert rows[0].is_manual is False
