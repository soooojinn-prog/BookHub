def _register(client, nickname):
    r = client.post("/auth/register", json={"nickname": nickname, "password": "secret1"})
    assert r.status_code == 201


def test_create_group_sets_reading_period_and_owner(client, nick):
    _register(client, nick)
    r = client.post("/groups", json={"name": "책바퀴", "reading_period_days": 21})
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "책바퀴"
    assert body["reading_period_days"] == 21
    assert len(body["invite_code"]) >= 4

    # owner sees it in my groups
    mine = client.get("/groups")
    assert mine.status_code == 200
    assert any(g["id"] == body["id"] for g in mine.json())


def test_create_group_invalid_reading_period(client, nick):
    _register(client, nick)
    r = client.post("/groups", json={"name": "g", "reading_period_days": 100})
    assert r.status_code == 422


def test_join_by_invite_code(client, nick):
    _register(client, nick)
    code = client.post("/groups", json={"name": "g", "reading_period_days": 14}).json()["invite_code"]

    # second user joins
    _register(client, nick + "b")  # register switches cookie to new user
    r = client.post("/groups/join", json={"invite_code": code})
    assert r.status_code == 200
    # duplicate join
    assert client.post("/groups/join", json={"invite_code": code}).status_code == 409


def test_join_unknown_code(client, nick):
    _register(client, nick)
    assert client.post("/groups/join", json={"invite_code": "NOPE9999"}).status_code == 404


def test_group_detail_members_and_permission(client, nick):
    _register(client, nick)
    created = client.post("/groups", json={"name": "g", "reading_period_days": 14}).json()
    gid, code = created["id"], created["invite_code"]

    # owner sees detail with members + rotation position
    detail = client.get(f"/groups/{gid}")
    assert detail.status_code == 200
    members = detail.json()["members"]
    assert len(members) == 1
    assert members[0]["role"] == "owner"
    assert members[0]["rotation_position"] == 0

    # second user joins -> now two members with distinct positions
    _register(client, nick + "b")
    client.post("/groups/join", json={"invite_code": code})
    positions = sorted(m["rotation_position"] for m in client.get(f"/groups/{gid}").json()["members"])
    assert positions == [0, 1]

    # a third, non-member user is forbidden
    _register(client, nick + "c")
    assert client.get(f"/groups/{gid}").status_code == 403
