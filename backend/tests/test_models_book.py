from app.models.book import Book


def test_book_defaults(db_session, owned_group):
    group, owner = owned_group
    book = Book(
        group_id=group.id,
        title="아몬드",
        author="손원평",
        genre="장편소설",
        total_pages=220,
        chooser_user_id=owner.id,
        current_holder_user_id=owner.id,
    )
    db_session.add(book)
    db_session.flush()

    found = db_session.get(Book, book.id)
    assert found.status == "circulating"
    assert found.current_page == 0
    assert found.completed_at is None
