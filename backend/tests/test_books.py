def _register(client, nickname):
    r = client.post("/auth/register", json={"nickname": nickname, "password": "secret1"})
    assert r.status_code == 201
    return r.json()  # {id, nickname}


def _create_group(client, days=14):
    r = client.post("/groups", json={"name": "g", "reading_period_days": days})
    assert r.status_code == 201
    return r.json()


def _create_book(client, gid, **overrides):
    payload = {"title": "아몬드", "author": "손원평", "genre": "장편소설", "total_pages": 220}
    payload.update(overrides)
    return client.post(f"/groups/{gid}/books", json=payload)


def test_create_book_sets_due_date_and_start_handoff(client, nick):
    owner = _register(client, nick)
    group = _create_group(client, days=14)
    r = _create_book(client, group["id"])
    assert r.status_code == 201
    book = r.json()
    assert book["status"] == "circulating"
    assert book["current_holder_user_id"] == owner["id"]
    assert book["chooser_user_id"] == owner["id"]
    assert book["due_date"] is not None

    detail = client.get(f"/books/{book['id']}").json()
    assert detail["percent"] == 0
    assert detail["chooser"]["user_id"] == owner["id"]
    assert len(detail["history"]) == 1
    assert detail["history"][0]["to_user_id"] == owner["id"]
    assert detail["history"][0]["note"] == "시작"
    assert len(detail["rotation_path"]) == 1


def test_list_books_filter_by_status(client, nick):
    _register(client, nick)
    group = _create_group(client)
    _create_book(client, group["id"])
    circulating = client.get(f"/groups/{group['id']}/books?status=circulating").json()
    completed = client.get(f"/groups/{group['id']}/books?status=completed").json()
    assert len(circulating) == 1
    assert completed == []


def test_book_detail_non_member_forbidden(client, nick):
    _register(client, nick)
    group = _create_group(client)
    book = _create_book(client, group["id"]).json()

    _register(client, nick + "b")  # switch to a non-member
    assert client.get(f"/books/{book['id']}").status_code == 403
