import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (register models)
from app.core.db import engine
from app.core.deps import get_db
from app.main import app


@pytest.fixture
def db_session():
    """A DB session bound to a transaction that is rolled back after each test.

    Uses savepoints so code under test can call commit() without persisting to Neon.
    """
    connection = engine.connect()
    trans = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def nick():
    """Unique nickname helper (kept short, <= 50 chars)."""
    return "u_" + uuid.uuid4().hex[:10]


@pytest.fixture
def owned_group(db_session, nick):
    """A group with a single owner member. Returns (group, owner_user)."""
    from app.models.group import Group
    from app.models.group_member import GroupMember
    from app.models.user import User

    owner = User(nickname=nick, password_hash="x")
    db_session.add(owner)
    db_session.flush()
    group = Group(
        name="테스트모임",
        invite_code=uuid.uuid4().hex[:8].upper(),
        reading_period_days=14,
        created_by=owner.id,
    )
    db_session.add(group)
    db_session.flush()
    db_session.add(
        GroupMember(group_id=group.id, user_id=owner.id, role="owner", rotation_position=0)
    )
    db_session.flush()
    return group, owner
