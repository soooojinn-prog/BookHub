import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.user import User


def test_create_and_query_user(db_session, nick):
    user = User(nickname=nick, password_hash="x")
    db_session.add(user)
    db_session.flush()
    found = db_session.scalar(select(User).where(User.nickname == nick))
    assert found is not None
    assert found.id == user.id


def test_nickname_unique(db_session, nick):
    db_session.add(User(nickname=nick, password_hash="x"))
    db_session.flush()
    db_session.add(User(nickname=nick, password_hash="y"))
    with pytest.raises(IntegrityError):
        db_session.flush()
