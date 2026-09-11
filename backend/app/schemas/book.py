from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=120)
    genre: str = Field(default="", max_length=60)
    total_pages: int = Field(gt=0, le=10000)
    cover_url: str | None = Field(default=None, max_length=500)


class ProgressIn(BaseModel):
    current_page: int = Field(ge=0)


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    title: str
    author: str
    genre: str
    cover_url: str | None
    total_pages: int
    status: str
    current_page: int
    current_holder_user_id: int | None
    chooser_user_id: int
    due_date: datetime | None
    completed_at: datetime | None


class PersonOut(BaseModel):
    user_id: int
    nickname: str


class BookFeedOut(BookOut):
    """List item enriched with backend-computed circulation state (source of truth)."""

    percent: int
    current_holder: PersonOut | None
    next_user: PersonOut | None


class HandoffOut(BaseModel):
    from_user_id: int | None
    to_user_id: int
    page_at_handoff: int | None
    is_manual: bool
    note: str | None
    created_at: datetime


class BookDetailOut(BookOut):
    percent: int
    chooser: PersonOut | None
    current_holder: PersonOut | None
    next_user: PersonOut | None
    rotation_path: list[PersonOut]
    history: list[HandoffOut]
