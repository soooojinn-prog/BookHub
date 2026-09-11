from pydantic import BaseModel, ConfigDict, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    reading_period_days: int = Field(default=14, ge=1, le=90)


class GroupJoin(BaseModel):
    invite_code: str = Field(min_length=4, max_length=16)


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    invite_code: str
    reading_period_days: int


class MemberOut(BaseModel):
    user_id: int
    nickname: str
    role: str
    rotation_position: int


class GroupDetailOut(GroupOut):
    members: list[MemberOut]
