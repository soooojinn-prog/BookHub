import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.schemas.group import (
    GroupCreate,
    GroupDetailOut,
    GroupJoin,
    GroupOut,
    MemberOut,
)

router = APIRouter(prefix="/groups", tags=["groups"])

_ALPHABET = string.ascii_uppercase + string.digits


def _generate_invite_code(db: Session) -> str:
    for _ in range(10):
        code = "".join(secrets.choice(_ALPHABET) for _ in range(8))
        if db.scalar(select(Group).where(Group.invite_code == code)) is None:
            return code
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "초대코드 생성에 실패했어요")


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Group:
    group = Group(
        name=body.name,
        reading_period_days=body.reading_period_days,
        invite_code=_generate_invite_code(db),
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()
    db.add(
        GroupMember(
            group_id=group.id, user_id=current_user.id, role="owner", rotation_position=0
        )
    )
    db.commit()
    db.refresh(group)
    return group


@router.post("/join", response_model=GroupOut)
def join_group(
    body: GroupJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Group:
    group = db.scalar(select(Group).where(Group.invite_code == body.invite_code))
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "초대코드를 찾을 수 없어요")
    already = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group.id, GroupMember.user_id == current_user.id
        )
    )
    if already is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 가입한 모임이에요")
    max_pos = db.scalar(
        select(func.max(GroupMember.rotation_position)).where(
            GroupMember.group_id == group.id
        )
    )
    db.add(
        GroupMember(
            group_id=group.id,
            user_id=current_user.id,
            role="member",
            rotation_position=(max_pos or 0) + 1,
        )
    )
    db.commit()
    return group


@router.get("", response_model=list[GroupOut])
def my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Group]:
    return list(
        db.scalars(
            select(Group)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .where(GroupMember.user_id == current_user.id)
            .order_by(Group.created_at)
        ).all()
    )


@router.get("/{group_id}", response_model=GroupDetailOut)
def group_detail(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GroupDetailOut:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "모임을 찾을 수 없어요")
    membership = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == current_user.id
        )
    )
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "이 모임의 멤버가 아니에요")
    rows = db.execute(
        select(GroupMember, User)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
        .order_by(GroupMember.rotation_position)
    ).all()
    members = [
        MemberOut(
            user_id=gm.user_id,
            nickname=user.nickname,
            role=gm.role,
            rotation_position=gm.rotation_position,
        )
        for gm, user in rows
    ]
    return GroupDetailOut(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        reading_period_days=group.reading_period_days,
        members=members,
    )
