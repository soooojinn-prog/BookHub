import pytest
from sqlalchemy.exc import IntegrityError

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User


def _make_user(db, nickname):
    user = User(nickname=nickname, password_hash="x")
    db.add(user)
    db.flush()
    return user


def test_create_group_with_reading_period(db_session, nick):
    owner = _make_user(db_session, nick)
    group = Group(name="책바퀴", invite_code="ABC123", reading_period_days=21, created_by=owner.id)
    db_session.add(group)
    db_session.flush()
    db_session.add(
        GroupMember(group_id=group.id, user_id=owner.id, role="owner", rotation_position=0)
    )
    db_session.flush()

    found = db_session.get(Group, group.id)
    assert found.reading_period_days == 21


def test_duplicate_membership_rejected(db_session, nick):
    owner = _make_user(db_session, nick)
    group = Group(name="g", invite_code="XYZ999", created_by=owner.id)
    db_session.add(group)
    db_session.flush()
    db_session.add(GroupMember(group_id=group.id, user_id=owner.id, role="owner"))
    db_session.flush()
    db_session.add(GroupMember(group_id=group.id, user_id=owner.id, role="member"))
    with pytest.raises(IntegrityError):
        db_session.flush()
