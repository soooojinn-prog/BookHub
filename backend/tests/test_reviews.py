def _register(client, nickname):
    r = client.post("/auth/register", json={"nickname": nickname, "password": "secret1"})
    assert r.status_code == 201
    return r.json()


def _make_book(client, complete):
    group = client.post("/groups", json={"name": "g", "reading_period_days": 14}).json()
    book = client.post(
        f"/groups/{group['id']}/books",
        json={"title": "데미안", "author": "헤세", "genre": "소설", "total_pages": 220},
    ).json()
    if complete:
        # solo group: one handoff returns to chooser -> completed
        client.post(f"/books/{book['id']}/handoff", json={})
    return group, book


def _book(client):
    return _make_book(client, complete=True)


def test_upsert_review(client, nick):
    me = _register(client, nick)
    _, book = _book(client)
    r = client.post(f"/books/{book['id']}/reviews", json={"rating": 5, "one_liner": "최고의 밤"})
    assert r.status_code == 200
    assert r.json()["nickname"] == me["nickname"]
    assert r.json()["rating"] == 5

    # re-submit updates in place (upsert)
    r2 = client.post(f"/books/{book['id']}/reviews", json={"rating": 3, "one_liner": "다시 보니 별로"})
    assert r2.status_code == 200
    reviews = client.get(f"/books/{book['id']}/reviews").json()
    assert len(reviews) == 1
    assert reviews[0]["rating"] == 3
    assert reviews[0]["one_liner"] == "다시 보니 별로"


def test_review_rating_out_of_range(client, nick):
    _register(client, nick)
    _, book = _book(client)
    assert client.post(f"/books/{book['id']}/reviews", json={"rating": 6, "one_liner": ""}).status_code == 422
    assert client.post(f"/books/{book['id']}/reviews", json={"rating": 0, "one_liner": ""}).status_code == 422


def test_review_non_member_forbidden(client, nick):
    _register(client, nick)
    _, book = _book(client)
    _register(client, nick + "b")  # non-member
    assert client.post(f"/books/{book['id']}/reviews", json={"rating": 4, "one_liner": "x"}).status_code == 403


def test_review_rejected_on_circulating_book(client, nick):
    _register(client, nick)
    _, book = _make_book(client, complete=False)  # still circulating
    r = client.post(f"/books/{book['id']}/reviews", json={"rating": 4, "one_liner": "아직 읽는 중"})
    assert r.status_code == 409
