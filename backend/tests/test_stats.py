def _register(client, nickname):
    r = client.post("/auth/register", json={"nickname": nickname, "password": "secret1"})
    assert r.status_code == 201
    return r.json()


def _login(client, nickname):
    assert client.post("/auth/login", json={"nickname": nickname, "password": "secret1"}).status_code == 200


def _trio(client, nick):
    owner = _register(client, nick)
    group = client.post("/groups", json={"name": "g", "reading_period_days": 14}).json()
    code = group["invite_code"]
    b = _register(client, nick + "b")
    client.post("/groups/join", json={"invite_code": code})
    c = _register(client, nick + "c")
    client.post("/groups/join", json={"invite_code": code})
    return owner, b, c, group


def test_group_stats_aggregates(client, nick):
    owner, b, c, group = _trio(client, nick)
    gid = group["id"]
    _login(client, owner["nickname"])
    book = client.post(
        f"/groups/{gid}/books",
        json={"title": "데미안", "author": "헤세", "genre": "소설", "total_pages": 220},
    ).json()
    bid = book["id"]

    _login(client, owner["nickname"]); client.post(f"/books/{bid}/handoff", json={})
    _login(client, b["nickname"]); client.post(f"/books/{bid}/handoff", json={})
    _login(client, c["nickname"]); client.post(f"/books/{bid}/handoff", json={})

    _login(client, owner["nickname"]); client.post(f"/books/{bid}/reviews", json={"rating": 5, "one_liner": "a"})
    _login(client, b["nickname"]); client.post(f"/books/{bid}/reviews", json={"rating": 4, "one_liner": "b"})
    _login(client, c["nickname"]); client.post(f"/books/{bid}/reviews", json={"rating": 3, "one_liner": "c"})

    stats = client.get(f"/groups/{gid}/stats").json()
    assert stats["books_completed"] == 1
    assert stats["pages_total"] == 220
    assert stats["avg_rating"] == 4.0
    assert stats["loops"] == 1
    assert {"genre": "소설", "count": 1} in stats["by_genre"]
    assert sum(s["count"] for s in stats["star_distribution"]) == 3
    five = next(s for s in stats["star_distribution"] if s["rating"] == 5)
    assert five["count"] == 1
    assert len(stats["by_month"]) == 1

    owner_stat = next(m for m in stats["members"] if m["user_id"] == owner["id"])
    assert owner_stat["picks"] == 1
    assert owner_stat["avg_given"] == 5.0
    assert owner_stat["pages_read"] == 220


def test_group_stats_non_member_forbidden(client, nick):
    _register(client, nick)
    group = client.post("/groups", json={"name": "g", "reading_period_days": 14}).json()
    _register(client, nick + "x")  # non-member
    assert client.get(f"/groups/{group['id']}/stats").status_code == 403
