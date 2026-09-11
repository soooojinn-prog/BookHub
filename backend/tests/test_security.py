import jwt
import pytest

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("s3cret!")
    assert h != "s3cret!"
    assert verify_password("s3cret!", h) is True
    assert verify_password("wrong", h) is False


def test_token_roundtrip():
    token = create_access_token(42)
    assert decode_token(token) == "42"


def test_token_tampered_raises():
    token = create_access_token(1)
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(token + "x")
