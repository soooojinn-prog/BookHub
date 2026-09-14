from pydantic import BaseModel


class MonthCount(BaseModel):
    month: str
    count: int


class GenreCount(BaseModel):
    genre: str
    count: int


class StarCount(BaseModel):
    rating: int
    count: int


class MemberStat(BaseModel):
    user_id: int
    nickname: str
    picks: int
    pages_read: int
    avg_given: float | None


class GroupStats(BaseModel):
    books_completed: int
    pages_total: int
    avg_rating: float | None
    loops: int
    by_month: list[MonthCount]
    by_genre: list[GenreCount]
    star_distribution: list[StarCount]
    members: list[MemberStat]
