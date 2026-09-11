from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class HandoffEvent(Base):
    __tablename__ = "handoff_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), index=True, nullable=False
    )
    from_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    page_at_handoff: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_manual: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
