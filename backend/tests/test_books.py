def _register(client, nickname):
    r = client.post("/auth/register", json={"nickname": nickname, "password": "secret1"})
    assert r.status_code == 201
    return r.json()  # {id, nickname}


def _create_group(client, days=14):
    r = client.post("/groups", json={"name": "g", "reading_period_days": days})
    assert r.status_code == 201
    return r.json()


def _login(client, nickname):
    r = client.post("/auth/login", json={"nickname": nickname, "password": "secret1"})
    assert r.status_code == 200


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


def test_update_progress_computes_percent(client, nick):
    _register(client, nick)
    group = _create_group(client)
    book = _create_book(client, group["id"], total_pages=220).json()
    r = client.patch(f"/books/{book['id']}/progress", json={"current_page": 110})
    assert r.status_code == 200
    assert r.json()["percent"] == 50
    assert r.json()["current_page"] == 110


def test_progress_out_of_range_rejected(client, nick):
    _register(client, nick)
    group = _create_group(client)
    book = _create_book(client, group["id"], total_pages=220).json()
    assert client.patch(f"/books/{book['id']}/progress", json={"current_page": 999}).status_code == 422
    assert client.patch(f"/books/{book['id']}/progress", json={"current_page": -1}).status_code == 422


def test_progress_only_current_holder(client, nick):
    _register(client, nick)
    group = _create_group(client)
    code = group["invite_code"]
    book = _create_book(client, group["id"]).json()

    _register(client, nick + "b")  # member but not current holder
    client.post("/groups/join", json={"invite_code": code})
    r = client.patch(f"/books/{book['id']}/progress", json={"current_page": 10})
    assert r.status_code == 403


def _setup_trio(client, nick):
    """owner + two members joined; returns (owner, b, c, group)."""
    owner = _register(client, nick)
    group = _create_group(client)
    code = group["invite_code"]
    b = _register(client, nick + "b")
    client.post("/groups/join", json={"invite_code": code})
    c = _register(client, nick + "c")
    client.post("/groups/join", json={"invite_code": code})
    return owner, b, c, group


def test_handoff_advances_to_next(client, nick):
    owner, b, c, group = _setup_trio(client, nick)
    _login(client, owner["nickname"])
    book = _create_book(client, group["id"]).json()
    r = client.post(f"/books/{book['id']}/handoff", json={})
    assert r.status_code == 200
    detail = r.json()
    assert detail["current_holder"]["user_id"] == b["id"]
    assert detail["history"][-1]["from_user_id"] == owner["id"]
    assert detail["history"][-1]["to_user_id"] == b["id"]
    assert detail["history"][-1]["is_manual"] is False


def test_manual_handoff_skips_and_flags(client, nick):
    owner, b, c, group = _setup_trio(client, nick)
    _login(client, owner["nickname"])
    book = _create_book(client, group["id"]).json()
    r = client.post(f"/books/{book['id']}/handoff", json={"manual_to_user_id": c["id"], "note": "일정상 지아 먼저"})
    assert r.status_code == 200
    detail = r.json()
    assert detail["current_holder"]["user_id"] == c["id"]
    assert detail["history"][-1]["is_manual"] is True


def test_full_loop_completes(client, nick):
    owner, b, c, group = _setup_trio(client, nick)
    _login(client, owner["nickname"])
    book = _create_book(client, group["id"]).json()
    bid = book["id"]

    _login(client, owner["nickname"])
    client.post(f"/books/{bid}/handoff", json={})   # owner -> b
    _login(client, b["nickname"])
    client.post(f"/books/{bid}/handoff", json={})   # b -> c
    _login(client, c["nickname"])
    r = client.post(f"/books/{bid}/handoff", json={})  # c -> owner (chooser) => complete
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert r.json()["completed_at"] is not None

    # completed book cannot be handed off again
    assert client.post(f"/books/{bid}/handoff", json={}).status_code == 409
    # and shows up in the completed feed
    completed = client.get(f"/groups/{group['id']}/books?status=completed").json()
    assert any(x["id"] == bid for x in completed)


def test_handoff_only_current_holder(client, nick):
    owner, b, c, group = _setup_trio(client, nick)
    _login(client, owner["nickname"])
    book = _create_book(client, group["id"]).json()
    _login(client, b["nickname"])  # b is a member but not the current holder
    assert client.post(f"/books/{book['id']}/handoff", json={}).status_code == 403


def test_circulating_feed_uses_backend_computed_state(client, nick):
    owner, b, c, group = _setup_trio(client, nick)
    _login(client, owner["nickname"])
    _create_book(client, group["id"])
    feed = client.get(f"/groups/{group['id']}/books?status=circulating").json()
    assert len(feed) == 1
    item = feed[0]
    assert item["percent"] == 0
    assert item["current_holder"]["nickname"] == owner["nickname"]
    assert item["next_user"]["nickname"] == b["nickname"]  # next by rotation, from backend


def test_completed_feed_includes_reviews_and_readers(client, nick):
    owner, b, c, group = _setup_trio(client, nick)
    _login(client, owner["nickname"])
    book = _create_book(client, group["id"]).json()
    bid = book["id"]

    _login(client, owner["nickname"]); client.post(f"/books/{bid}/handoff", json={})
    _login(client, b["nickname"]); client.post(f"/books/{bid}/handoff", json={})
    _login(client, c["nickname"]); client.post(f"/books/{bid}/handoff", json={})

    _login(client, owner["nickname"]); client.post(f"/books/{bid}/reviews", json={"rating": 5, "one_liner": "성장의 밤"})
    _login(client, b["nickname"]); client.post(f"/books/{bid}/reviews", json={"rating": 4, "one_liner": "좋았다"})
    _login(client, c["nickname"]); client.post(f"/books/{bid}/reviews", json={"rating": 3, "one_liner": "무난"})

    feed = client.get(f"/groups/{group['id']}/books?status=completed").json()
    item = next(x for x in feed if x["id"] == bid)
    assert item["avg_rating"] == 4.0
    assert item["review_count"] == 3
    assert item["recent_review"] is not None
    reader_names = {p["nickname"] for p in item["readers"]}
    assert {owner["nickname"], b["nickname"], c["nickname"]} <= reader_names
