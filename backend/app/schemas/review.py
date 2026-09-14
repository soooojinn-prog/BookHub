from datetime import datetime

from pydantic import BaseModel, Field


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    one_liner: str = Field(default="", max_length=280)


class ReviewOut(BaseModel):
    user_id: int
    nickname: str
    rating: int
    one_liner: str
    created_at: datetime
