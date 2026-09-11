def test_register_login_me_flow(client, nick):
    r = client.post("/auth/register", json={"nickname": nick, "password": "secret1"})
    assert r.status_code == 201
    assert r.json()["nickname"] == nick

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["nickname"] == nick


def test_register_duplicate_nickname(client, nick):
    client.post("/auth/register", json={"nickname": nick, "password": "secret1"})
    r = client.post("/auth/register", json={"nickname": nick, "password": "secret2"})
    assert r.status_code == 409


def test_login_wrong_password(client, nick):
    client.post("/auth/register", json={"nickname": nick, "password": "secret1"})
    client.post("/auth/logout")
    r = client.post("/auth/login", json={"nickname": nick, "password": "WRONG"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    client.cookies.clear()
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_logout_clears_session(client, nick):
    client.post("/auth/register", json={"nickname": nick, "password": "secret1"})
    assert client.get("/auth/me").status_code == 200
    client.post("/auth/logout")
    client.cookies.clear()
    assert client.get("/auth/me").status_code == 401
