from pydantic import BaseModel, Field


class HandoffIn(BaseModel):
    manual_to_user_id: int | None = None
    note: str | None = Field(default=None, max_length=500)
