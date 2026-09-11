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
