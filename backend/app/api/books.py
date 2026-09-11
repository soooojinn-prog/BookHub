from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.book import Book
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.handoff_event import HandoffEvent
from app.models.user import User
from app.schemas.book import (
    BookCreate,
    BookDetailOut,
    BookOut,
    HandoffOut,
    PersonOut,
    ProgressIn,
)
from app.schemas.handoff import HandoffIn
from app.services.rotation import completes_loop, next_reader

router = APIRouter(tags=["books"])


def _require_membership(db: Session, group_id: int, user_id: int) -> GroupMember:
    membership = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == user_id
        )
    )
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "이 모임의 멤버가 아니에요")
    return membership


def _rotation_order(db: Session, group_id: int) -> list[int]:
    return list(
        db.scalars(
            select(GroupMember.user_id)
            .where(GroupMember.group_id == group_id)
            .order_by(GroupMember.rotation_position)
        ).all()
    )


def _people(db: Session, ids: set[int]) -> dict[int, PersonOut]:
    ids = {i for i in ids if i is not None}
    if not ids:
        return {}
    rows = db.execute(select(User.id, User.nickname).where(User.id.in_(ids))).all()
    return {uid: PersonOut(user_id=uid, nickname=nick) for uid, nick in rows}


def _percent(page: int, total: int) -> int:
    if total <= 0:
        return 0
    return max(0, min(100, round(page / total * 100)))


@router.post(
    "/groups/{group_id}/books", response_model=BookOut, status_code=status.HTTP_201_CREATED
)
def create_book(
    group_id: int,
    body: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Book:
    _require_membership(db, group_id, current_user.id)
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "모임을 찾을 수 없어요")

    now = datetime.now(timezone.utc)
    book = Book(
        group_id=group_id,
        title=body.title,
        author=body.author,
        genre=body.genre,
        cover_url=body.cover_url,
        total_pages=body.total_pages,
        chooser_user_id=current_user.id,
        current_holder_user_id=current_user.id,
        current_page=0,
        status="circulating",
        started_at=now,
        due_date=now + timedelta(days=group.reading_period_days),
    )
    db.add(book)
    db.flush()
    db.add(
        HandoffEvent(
            book_id=book.id,
            from_user_id=None,
            to_user_id=current_user.id,
            page_at_handoff=None,
            is_manual=False,
            note="시작",
        )
    )
    db.commit()
    db.refresh(book)
    return book


@router.get("/groups/{group_id}/books", response_model=list[BookOut])
def list_books(
    group_id: int,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Book]:
    _require_membership(db, group_id, current_user.id)
    query = select(Book).where(Book.group_id == group_id)
    if status is not None:
        query = query.where(Book.status == status)
    query = query.order_by(Book.created_at.desc())
    return list(db.scalars(query).all())


def _build_detail(db: Session, book: Book) -> BookDetailOut:
    order = _rotation_order(db, book.group_id)
    next_uid: int | None = None
    if book.status == "circulating" and book.current_holder_user_id in order:
        next_uid = next_reader(order, book.current_holder_user_id)

    people = _people(
        db,
        set(order)
        | {book.chooser_user_id, book.current_holder_user_id, next_uid},
    )

    events = db.scalars(
        select(HandoffEvent)
        .where(HandoffEvent.book_id == book.id)
        .order_by(HandoffEvent.created_at)
    ).all()
    history = [
        HandoffOut(
            from_user_id=e.from_user_id,
            to_user_id=e.to_user_id,
            page_at_handoff=e.page_at_handoff,
            is_manual=e.is_manual,
            note=e.note,
            created_at=e.created_at,
        )
        for e in events
    ]

    return BookDetailOut(
        id=book.id,
        group_id=book.group_id,
        title=book.title,
        author=book.author,
        genre=book.genre,
        cover_url=book.cover_url,
        total_pages=book.total_pages,
        status=book.status,
        current_page=book.current_page,
        current_holder_user_id=book.current_holder_user_id,
        chooser_user_id=book.chooser_user_id,
        due_date=book.due_date,
        completed_at=book.completed_at,
        percent=_percent(book.current_page, book.total_pages),
        chooser=people.get(book.chooser_user_id),
        current_holder=people.get(book.current_holder_user_id),
        next_user=people.get(next_uid),
        rotation_path=[people[uid] for uid in order if uid in people],
        history=history,
    )


@router.get("/books/{book_id}", response_model=BookDetailOut)
def book_detail(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookDetailOut:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "책을 찾을 수 없어요")
    _require_membership(db, book.group_id, current_user.id)
    return _build_detail(db, book)


@router.patch("/books/{book_id}/progress", response_model=BookDetailOut)
def update_progress(
    book_id: int,
    body: ProgressIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookDetailOut:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "책을 찾을 수 없어요")
    _require_membership(db, book.group_id, current_user.id)
    if book.current_holder_user_id != current_user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "현재 이 책을 읽고 있는 사람만 진도를 수정할 수 있어요"
        )
    if body.current_page > book.total_pages:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "현재 페이지가 전체 페이지를 넘을 수 없어요"
        )
    book.current_page = body.current_page
    db.commit()
    db.refresh(book)
    return _build_detail(db, book)


@router.post("/books/{book_id}/handoff", response_model=BookDetailOut)
def handoff(
    book_id: int,
    body: HandoffIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookDetailOut:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "책을 찾을 수 없어요")
    _require_membership(db, book.group_id, current_user.id)
    if book.status != "circulating":
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 완료된 책이에요")
    if book.current_holder_user_id != current_user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "현재 이 책을 읽고 있는 사람만 전달할 수 있어요"
        )

    order = _rotation_order(db, book.group_id)
    try:
        next_uid = next_reader(order, current_user.id, manual_to=body.manual_to_user_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    is_manual = body.manual_to_user_id is not None
    db.add(
        HandoffEvent(
            book_id=book.id,
            from_user_id=current_user.id,
            to_user_id=next_uid,
            page_at_handoff=book.current_page,
            is_manual=is_manual,
            note=body.note,
        )
    )

    now = datetime.now(timezone.utc)
    book.current_holder_user_id = next_uid
    book.current_page = 0
    if completes_loop(next_uid, book.chooser_user_id):
        book.status = "completed"
        book.completed_at = now
        book.due_date = None
    else:
        group = db.get(Group, book.group_id)
        book.started_at = now
        book.due_date = now + timedelta(days=group.reading_period_days)

    db.commit()
    db.refresh(book)
    return _build_detail(db, book)
