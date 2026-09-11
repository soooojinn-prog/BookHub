from pydantic import BaseModel, ConfigDict, Field


class RegisterIn(BaseModel):
    nickname: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    nickname: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nickname: str
