from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_membership
from app.models.book import Book
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewIn, ReviewOut

router = APIRouter(tags=["reviews"])


def _load_book_with_membership(db: Session, book_id: int, user_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "책을 찾을 수 없어요")
    require_membership(db, book.group_id, user_id)
    return book


@router.post("/books/{book_id}/reviews", response_model=ReviewOut)
def upsert_review(
    book_id: int,
    body: ReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewOut:
    _load_book_with_membership(db, book_id, current_user.id)
    review = db.scalar(
        select(Review).where(Review.book_id == book_id, Review.user_id == current_user.id)
    )
    if review is None:
        review = Review(
            book_id=book_id,
            user_id=current_user.id,
            rating=body.rating,
            one_liner=body.one_liner,
        )
        db.add(review)
    else:
        review.rating = body.rating
        review.one_liner = body.one_liner
    db.commit()
    db.refresh(review)
    return ReviewOut(
        user_id=current_user.id,
        nickname=current_user.nickname,
        rating=review.rating,
        one_liner=review.one_liner,
        created_at=review.created_at,
    )


@router.get("/books/{book_id}/reviews", response_model=list[ReviewOut])
def list_reviews(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ReviewOut]:
    _load_book_with_membership(db, book_id, current_user.id)
    rows = db.execute(
        select(Review, User)
        .join(User, User.id == Review.user_id)
        .where(Review.book_id == book_id)
        .order_by(Review.created_at)
    ).all()
    return [
        ReviewOut(
            user_id=r.user_id,
            nickname=u.nickname,
            rating=r.rating,
            one_liner=r.one_liner,
            created_at=r.created_at,
        )
        for r, u in rows
    ]
