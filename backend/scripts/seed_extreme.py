"""Seed an extreme-data group for mobile QA (long strings, many members/books).

Writes directly to the DB (no handoff loops) and dumps login info to
frontend/e2e/extreme-seed.json so the Playwright spec can log in.

Run:  backend/.venv/Scripts/python -m scripts.seed_extreme
"""
import json
import os
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.book import Book
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.handoff_event import HandoffEvent
from app.models.review import Review
from app.models.user import User

STAMP = datetime.now().strftime("%m%d%H%M%S")
PW = "secret1"
NOW = datetime.now(timezone.utc)

LONG_TITLE = "아주 긴 제목의 책 " + "가나다라마바사아자차카타파하 " * 4  # ~70 chars
LONG_AUTHOR = "성이긴저자이름을가진어떤작가님입니다정말로"  # ~22
LONG_GENRE = "장르이름이비정상적으로매우긴카테고리명"  # ~20
LONG_REVIEW = "정말 인상 깊었던 책입니다. " + "한 문장을 아주 길게 이어서 적어보는 리뷰 " * 6  # long
NICK20 = "가나다라마바사아자차카타파하가나다라마바"  # 20 chars


def rid(n: int = 6) -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))


def main() -> None:
    db = SessionLocal()
    try:
        # 12 members (owner + 11); one has a 20-char nickname
        members: list[User] = []
        for i in range(12):
            nick = (NICK20 if i == 1 else f"qa{STAMP}_{i:02d}")[:50]
            u = User(nickname=nick, password_hash=hash_password(PW))
            db.add(u)
            members.append(u)
        db.flush()
        owner = members[0]

        group = Group(
            name="극단데이터 모임 " + "이름이길어도 " * 3,
            invite_code=rid(8),
            reading_period_days=14,
            created_by=owner.id,
        )
        db.add(group)
        db.flush()
        for pos, m in enumerate(members):
            db.add(
                GroupMember(
                    group_id=group.id,
                    user_id=m.id,
                    role="owner" if pos == 0 else "member",
                    rotation_position=pos,
                )
            )
        db.flush()

        def make_book(idx: int, completed: bool) -> Book:
            title = LONG_TITLE if idx % 5 == 0 else f"책 제목 {idx} · {rid(4)}"
            book = Book(
                group_id=group.id,
                title=title[:200],
                author=(LONG_AUTHOR if idx % 3 == 0 else "짧은저자")[:120],
                genre=(LONG_GENRE if idx % 4 == 0 else "소설")[:60],
                total_pages=1200 if idx % 7 == 0 else random.randint(120, 780),
                chooser_user_id=members[idx % 12].id,
                status="completed" if completed else "circulating",
                current_holder_user_id=members[idx % 12].id
                if completed
                else members[(idx + 1) % 12].id,
                current_page=0 if completed else random.randint(0, 100),
                started_at=NOW - timedelta(days=idx),
                due_date=None if completed else NOW + timedelta(days=14),
                completed_at=NOW - timedelta(days=idx) if completed else None,
            )
            db.add(book)
            db.flush()
            # start handoff + readers (all members held it -> 12 avatars)
            db.add(HandoffEvent(book_id=book.id, from_user_id=None, to_user_id=book.chooser_user_id, note="시작"))
            prev = book.chooser_user_id
            reader_count = 12 if completed else random.randint(1, 4)
            for r in range(1, reader_count):
                to = members[(idx + r) % 12].id
                db.add(HandoffEvent(book_id=book.id, from_user_id=prev, to_user_id=to, page_at_handoff=random.randint(10, 700), is_manual=(r % 3 == 0), note=None))
                prev = to
            if completed:
                for r in range(6):  # 6 reviews per completed book
                    db.add(
                        Review(
                            book_id=book.id,
                            user_id=members[r].id,
                            rating=random.randint(1, 5),
                            one_liner=(LONG_REVIEW if r == 0 else f"리뷰 {r} 한 줄 감상")[:280],
                        )
                    )
            return book

        for i in range(12):
            make_book(i, completed=False)  # 12 circulating
        for i in range(100, 124):
            make_book(i, completed=True)  # 24 completed

        db.commit()

        out = Path(__file__).resolve().parents[2] / "frontend" / "e2e" / "extreme-seed.json"
        out.write_text(json.dumps({"nickname": owner.nickname, "password": PW, "groupId": group.id}), encoding="utf-8")
        print(f"SEEDED group={group.id} owner={owner.nickname} -> {out}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
