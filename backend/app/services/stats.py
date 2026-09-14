from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.group_member import GroupMember
from app.models.handoff_event import HandoffEvent
from app.models.review import Review
from app.models.user import User
from app.schemas.stats import (
    GenreCount,
    GroupStats,
    MemberStat,
    MonthCount,
    StarCount,
)


def compute_group_stats(db: Session, group_id: int) -> GroupStats:
    members = db.execute(
        select(GroupMember.user_id, User.nickname)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
        .order_by(GroupMember.rotation_position)
    ).all()

    completed = list(
        db.scalars(
            select(Book).where(Book.group_id == group_id, Book.status == "completed")
        ).all()
    )
    completed_ids = [b.id for b in completed]

    pages_total = sum(b.total_pages for b in completed)

    # by month (completed_at) and by genre
    month_counts: dict[str, int] = defaultdict(int)
    genre_counts: dict[str, int] = defaultdict(int)
    for b in completed:
        if b.completed_at is not None:
            month_counts[f"{b.completed_at.year}.{b.completed_at.month:02d}"] += 1
        genre_counts[b.genre or "기타"] += 1

    by_month = [MonthCount(month=m, count=c) for m, c in sorted(month_counts.items())]
    by_genre = [
        GenreCount(genre=g, count=c)
        for g, c in sorted(genre_counts.items(), key=lambda kv: (-kv[1], kv[0]))
    ]

    # reviews across completed books
    review_rows = (
        db.execute(
            select(Review.user_id, Review.rating).where(Review.book_id.in_(completed_ids))
        ).all()
        if completed_ids
        else []
    )
    all_ratings = [r.rating for r in review_rows]
    avg_rating = round(sum(all_ratings) / len(all_ratings), 1) if all_ratings else None

    star_map: dict[int, int] = defaultdict(int)
    given_by_user: dict[int, list[int]] = defaultdict(list)
    for r in review_rows:
        star_map[r.rating] += 1
        given_by_user[r.user_id].append(r.rating)
    star_distribution = [StarCount(rating=s, count=star_map.get(s, 0)) for s in range(5, 0, -1)]

    # readers per book (from handoffs) -> pages read per user
    handoff_rows = (
        db.execute(
            select(HandoffEvent.book_id, HandoffEvent.to_user_id).where(
                HandoffEvent.book_id.in_(completed_ids)
            )
        ).all()
        if completed_ids
        else []
    )
    pages_of = {b.id: b.total_pages for b in completed}
    read_pairs: set[tuple[int, int]] = {(bid, uid) for bid, uid in handoff_rows}
    pages_read_by_user: dict[int, int] = defaultdict(int)
    for bid, uid in read_pairs:
        pages_read_by_user[uid] += pages_of.get(bid, 0)

    picks_by_user: dict[int, int] = defaultdict(int)
    for b in completed:
        picks_by_user[b.chooser_user_id] += 1

    member_stats: list[MemberStat] = []
    for uid, nickname in members:
        given = given_by_user.get(uid, [])
        member_stats.append(
            MemberStat(
                user_id=uid,
                nickname=nickname,
                picks=picks_by_user.get(uid, 0),
                pages_read=pages_read_by_user.get(uid, 0),
                avg_given=round(sum(given) / len(given), 1) if given else None,
            )
        )

    return GroupStats(
        books_completed=len(completed),
        pages_total=pages_total,
        avg_rating=avg_rating,
        loops=len(completed),
        by_month=by_month,
        by_genre=by_genre,
        star_distribution=star_distribution,
        members=member_stats,
    )
