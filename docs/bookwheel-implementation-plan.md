# 책바퀴 (BookWheel) 구현 계획서 (Implementation Plan)

> **For agentic workers:** 이 계획은 `docs/bookwheel-spec.md`를 **source of truth**로 한다. Task는 위에서부터 순서대로 실행하며, 각 Task의 "선행 조건"을 만족한 뒤 진행한다. 각 Task는 자체 테스트를 통과하고 커밋한 뒤 다음으로 넘어간다. **v2(부록 A) 기능은 MVP 단계에서 절대 구현하지 않는다.**

**Goal:** 교환독서 모임 '책바퀴'의 v1(멀티 모임 + 로그인)을 동작하는 웹앱으로 구현한다 — 닉네임 인증, 모임, 순환(하이브리드) 책 관리, 완료된 책 뷰, 통계.

**Architecture:** 모노레포. `/backend` = FastAPI + SQLAlchemy + Alembic + PostgreSQL(REST API). `/frontend` = Next.js(App Router) + TypeScript + Tailwind + Framer Motion. 프런트는 REST로 백엔드와 통신, 인증은 JWT(httpOnly 쿠키).

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 + pydantic-settings, **pwdlib[argon2]**(비밀번호 해시), **PyJWT**(토큰), pytest, httpx / Node 20, **Next.js 16.x(현재 patched Active LTS)**, TypeScript, TailwindCSS, Framer Motion, Vitest + React Testing Library, Playwright.

**공통 규칙**
- TDD 지향: 가능한 곳은 실패 테스트 → 구현 → 통과 → 커밋.
- 커밋은 Task 단위(또는 그보다 작게) 자주.
- MVP 우선. **부록 A(v2)** 항목은 스키마 확장 여지만 두고 구현하지 않는다.
- 디자인 토큰/무드는 spec §5(다크 갤러리 · 스틸/오로라) 준수. 프로토타입 아티팩트를 시각 레퍼런스로 참고.

---

## 파일 구조 (초기 목표)

```
/backend
  app/
    main.py                 # FastAPI 앱, 라우터 등록, CORS
    core/config.py          # 설정(env, pydantic-settings)
    core/db.py              # 엔진/세션/Base
    core/security.py        # 비밀번호 해시(pwdlib argon2), JWT(PyJWT)
    core/deps.py            # get_db, get_current_user
    models/{user,group,group_member,book,handoff_event,review}.py
    schemas/{auth,group,book,handoff,review,stats}.py
    api/{auth,groups,books,reviews,stats}.py   # APIRouter
    services/{rotation,stats,achievements}.py
  alembic/                  # 마이그레이션
  tests/{test_health,test_db,test_security,test_auth,test_groups,test_books,test_rotation,test_reviews,test_stats,test_achievements}.py
  requirements.txt
  docker-compose.yml        # postgres
  .env.example
/frontend
  app/
    (auth)/login/page.tsx, (auth)/register/page.tsx
    groups/page.tsx                 # 내 모임 목록
    groups/[groupId]/page.tsx       # 모임 홈(Hero + 서재)
    groups/[groupId]/books/new/page.tsx       # 책 등록
    groups/[groupId]/books/[bookId]/page.tsx  # 상세·전달
    groups/[groupId]/stats/page.tsx # 통계
    layout.tsx, globals.css
  components/{Starfield,Panel,BookUnveilList,BookForm,Bookcase,HandoffPanel,StatTiles,Charts,Badges}.tsx
  lib/{api,auth,types}.ts
  tailwind.config.ts
  playwright.config.ts
  e2e/{circulation-smoke,core-flow}.spec.ts
  package.json
/docs
  bookwheel-spec.md
  bookwheel-implementation-plan.md
```

---

## Task 요약 (번호 · 선행 조건)

| Task | 이름 | 선행 조건 |
|---|---|---|
| 0.1 | 백엔드 스켈레톤 + Postgres | — |
| 0.2 | DB 연결 + Alembic | 0.1 |
| 0.3 | 프런트 스켈레톤 + 토큰(Next.js 16) | — |
| 1.1 | User 모델 | 0.2 |
| 1.2 | 보안 유틸(pwdlib argon2 + PyJWT) | 0.1 |
| 1.3 | 인증 API(register/login/me/logout) | 1.1, 1.2 |
| 1.4 | 프런트 인증 화면 | 0.3, 1.3 |
| 2.1 | Group/GroupMember 모델(+reading_period_days) | 1.1 |
| 2.2 | 모임 API(독서기간 설정 포함) | 2.1, 1.3 |
| 2.3 | 프런트 모임 화면(독서기간 UI) | 1.4, 2.2 |
| 3.1 | Book 모델 | 2.1 |
| 3.2 | HandoffEvent 모델 | 3.1 |
| 3.3 | 순환 서비스(rotation) | 2.1, 3.1 |
| 3.4 | 책 등록/조회 API | 3.1, 3.2, 2.2 |
| 3.5 | 진행률 API | 3.4 |
| 3.6 | 전달(handoff) API + 완료 판정 | 3.3, 3.4 |
| 3.7 | 프런트 책 등록 UI | 2.3, 3.4 |
| 3.8 | 프런트 Hero(순환 목록) | 3.4, 3.7 |
| 3.9 | 프런트 책 상세·전달 UI | 3.5, 3.6, 3.8 |
| 3.10 | Phase 3 Playwright 스모크 | 3.9 |
| 4.1 | Review 모델 + API | 3.1, 1.3 |
| 4.2 | 완료된 책 피드 API | 3.6, 4.1 |
| 4.3 | 통계 집계 API | 3.6, 4.1 |
| 4.4 | 프런트 서재(Cover/Bookshelf) | 3.9, 4.2 |
| 4.5 | 프런트 통계 대시보드 | 4.3, 4.4 |
| 5.1 | *(nice-to-have)* 업적/칭호 계산 API | 4.3 |
| 5.2 | *(nice-to-have)* 프런트 배지·칭호 UI | 4.5, 5.1 |
| 6.1 | 모바일 대응 + 모션 | 4.5 (5.x 선택) |
| 6.2 | 전체 e2e 스모크 | 6.1 |

---

## Phase 0 — 스캐폴딩 & 툴링

### Task 0.1 — 백엔드 스켈레톤 + Postgres
- **목적:** FastAPI 앱과 로컬 Postgres를 띄워 `/health`가 응답하게 한다.
- **생성 파일:** `backend/app/main.py`, `backend/app/core/config.py`, `backend/requirements.txt`(fastapi, uvicorn, sqlalchemy, alembic, psycopg[binary], pydantic-settings, pwdlib[argon2], pyjwt, pytest, httpx), `backend/docker-compose.yml`, `backend/.env.example`, `backend/tests/test_health.py`
- **DB/API/UI:** API `GET /health` → `{"status":"ok"}`. docker-compose에 postgres 16(포트 5432, DB `bookwheel`).
- **선행 조건:** 없음.
- **완료 조건:** `uvicorn app.main:app` 기동, `/health` 200. `docker compose up -d`로 postgres 기동.
- **테스트:** `pytest backend/tests/test_health.py`(httpx TestClient로 `/health` 200).

### Task 0.2 — DB 연결 + Alembic 초기화
- **목적:** SQLAlchemy 세션과 Alembic 마이그레이션 파이프라인.
- **생성/수정 파일:** `backend/app/core/db.py`, `backend/app/core/deps.py`(`get_db`), `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/`
- **DB/API/UI:** `DATABASE_URL` env. `env.py`가 `Base.metadata`를 target으로.
- **선행 조건:** 0.1.
- **완료 조건:** `alembic upgrade head`가 에러 없이 수행. `get_db`가 세션 yield.
- **테스트:** `pytest backend/tests/test_db.py`(`get_db` 세션으로 `SELECT 1`).

### Task 0.3 — 프런트 스켈레톤 + 디자인 토큰 (Next.js 16)
- **목적:** **Next.js 16.x** 앱을 세우고 다크 갤러리 토큰/폰트/배경 준비.
- **생성 파일:** `frontend/`(create-next-app@latest ⇒ Next.js 16, TS, App Router, Tailwind), `frontend/tailwind.config.ts`(spec §5 색 토큰), `frontend/app/globals.css`(폰트: IBM Plex Sans KR, Schibsted Grotesk; body 배경 그라디언트), `frontend/components/Starfield.tsx`, `frontend/lib/api.ts`(fetch 래퍼, `NEXT_PUBLIC_API_URL`), `frontend/.env.local.example`
- **DB/API/UI:** UI 레이아웃(마스트헤드 + 별밤 배경) + API 래퍼.
- **선행 조건:** 없음(백엔드와 병행).
- **완료 조건:** `npm run dev`(Next 16)로 홈이 다크 톤 렌더, Starfield 표시.
- **테스트:** `frontend/components/Starfield.test.tsx`(Vitest: 캔버스 마운트 스모크). 수동: 배경 확인.

---

## Phase 1 — 인증 (닉네임 + 비밀번호)

### Task 1.1 — User 모델 + 마이그레이션
- **목적:** 사용자 테이블.
- **생성 파일:** `backend/app/models/user.py`, `backend/alembic/versions/xxxx_users.py`
- **DB/API/UI:** `users(id PK, nickname unique not null, password_hash, created_at)`.
- **선행 조건:** 0.2.
- **완료 조건:** `alembic upgrade head`로 users 생성.
- **테스트:** `backend/tests/test_models_user.py`(insert/조회, nickname unique 위반 IntegrityError).

### Task 1.2 — 보안 유틸(pwdlib argon2 + PyJWT)
- **목적:** 비밀번호 해시(argon2)와 JWT(PyJWT) 함수.
- **생성 파일:** `backend/app/core/security.py`(`hash_password`/`verify_password` via `pwdlib.PasswordHash.recommended()` argon2; `create_access_token`/`decode_token` via `jwt.encode`/`jwt.decode`)
- **DB/API/UI:** 없음(순수 함수). `SECRET_KEY`, `ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES` env.
- **선행 조건:** 0.1.
- **완료 조건:** 해시 round-trip, 토큰 encode/decode round-trip.
- **테스트:** `backend/tests/test_security.py`(verify true/false, decode가 sub 반환, 만료/변조 토큰 `jwt.InvalidTokenError`).

### Task 1.3 — 인증 엔드포인트(register/login/me/logout) + current_user 의존성
- **목적:** 회원가입/로그인/내 정보/로그아웃 API.
- **생성 파일:** `backend/app/schemas/auth.py`, `backend/app/api/auth.py`, `backend/app/core/deps.py`(수정: `get_current_user`), `backend/app/main.py`(수정: 라우터 등록)
- **DB/API/UI:**
  - `POST /auth/register {nickname,password}` → 사용자 생성, 201 + httpOnly 쿠키 `access_token` 세팅.
  - `POST /auth/login {nickname,password}` → 검증 후 쿠키 세팅, 200 + user.
  - `GET /auth/me` → 쿠키 기반 현재 사용자, 미인증 401.
  - `POST /auth/logout` → **쿠키 삭제**(`access_token` 만료/삭제), 204.
- **선행 조건:** 1.1, 1.2.
- **완료 조건:** register→login→me 200; 중복 닉네임 409; 오답 비번 401; logout 후 me 401.
- **테스트:** `backend/tests/test_auth.py`(happy path, 중복 닉네임, 오답 비번, 미인증 me 401, **logout 후 me 401**).

### Task 1.4 — 프런트 인증 화면 + 세션
- **목적:** 로그인/회원가입 페이지 + 인증 상태 + 로그아웃.
- **생성 파일:** `frontend/app/(auth)/login/page.tsx`, `frontend/app/(auth)/register/page.tsx`, `frontend/lib/auth.ts`(me/login/register/**logout**), `frontend/app/layout.tsx`(수정: 인증 가드)
- **DB/API/UI:** UI 로그인/가입 폼(다크 톤) + 로그아웃 버튼. API `/auth/*`(credentials include).
- **선행 조건:** 0.3, 1.3.
- **완료 조건:** 가입/로그인 후 `/groups` 이동, 미인증 시 로그인 리다이렉트, 로그아웃 동작.
- **테스트:** `frontend/app/(auth)/login/page.test.tsx`(폼 제출 시 api.login 호출). 수동: 가입/로그인/로그아웃.

---

## Phase 2 — 모임 (멀티, 초대코드, 독서기간)

### Task 2.1 — Group / GroupMember 모델 + 마이그레이션
- **목적:** 모임(독서기간 포함)과 멤버십(순번) 테이블.
- **생성 파일:** `backend/app/models/group.py`, `backend/app/models/group_member.py`, `backend/alembic/versions/xxxx_groups.py`
- **DB/API/UI:**
  - `groups(id, name, invite_code unique, **reading_period_days int not null default 14**, created_by FK, created_at)`
  - `group_members(id, group_id FK, user_id FK, role enum[owner,member], rotation_position int, joined_at, UNIQUE(group_id,user_id))`
- **선행 조건:** 1.1.
- **완료 조건:** 마이그레이션 적용, `reading_period_days` 컬럼 및 제약 존재.
- **테스트:** `backend/tests/test_models_group.py`(그룹+멤버 생성, reading_period_days 저장, 중복 멤버 유니크 위반).

### Task 2.2 — 모임 API (독서기간 설정 포함)
- **목적:** 모임 생성(독서기간)/가입/목록/상세.
- **생성 파일:** `backend/app/schemas/group.py`, `backend/app/api/groups.py`, `backend/app/main.py`(수정)
- **DB/API/UI:**
  - `POST /groups {name, reading_period_days}` → owner 멤버 추가, invite_code 자동, rotation_position=0, `reading_period_days` 저장(미지정 시 14 기본, 1..90 검증).
  - `POST /groups/join {invite_code}` → member 추가(다음 rotation_position), 중복 409.
  - `GET /groups` → 내 모임 목록(reading_period_days 포함).
  - `GET /groups/{id}` → 상세 + 멤버(순번). 비멤버 403.
- **선행 조건:** 2.1, 1.3.
- **완료 조건:** 생성 시 독서기간 저장/응답, 가입/목록/상세 반영, 비멤버 403.
- **테스트:** `backend/tests/test_groups.py`(create with reading_period_days, 범위 밖 값 422, join/list/get, 중복가입 409, 비멤버 403).

### Task 2.3 — 프런트 모임 화면 (독서기간 설정 UI)
- **목적:** 내 모임 목록·생성(독서기간 입력)·가입, 모임 홈 셸.
- **생성 파일:** `frontend/app/groups/page.tsx`, `frontend/components/GroupCreateJoin.tsx`, `frontend/app/groups/[groupId]/page.tsx`(셸), `frontend/lib/types.ts`(수정)
- **DB/API/UI:** UI: 모임 카드 목록, 생성 모달에 **독서기간(일) 입력**, 코드가입 모달. API `/groups*`.
- **선행 조건:** 1.4, 2.2.
- **완료 조건:** 독서기간을 지정해 모임 생성, 가입, 홈(빈 상태) 표시.
- **테스트:** `frontend/app/groups/page.test.tsx`(목록 렌더 + 생성 시 reading_period_days 전달). 수동: 두 계정 코드 가입.

---

## Phase 3 — 책 + 순환(하이브리드) 코어

### Task 3.1 — Book 모델 + 마이그레이션
- **목적:** 모임별 책 테이블.
- **생성 파일:** `backend/app/models/book.py`, `backend/alembic/versions/xxxx_books.py`
- **DB/API/UI:** `books(id, group_id FK, title, author, genre, cover_url null, total_pages int, chooser_user_id FK, status enum[circulating,completed] default circulating, current_holder_user_id FK, current_page int default 0, started_at, due_date null, completed_at null, created_at)`.
- **선행 조건:** 2.1.
- **완료 조건:** 마이그레이션 적용.
- **테스트:** `backend/tests/test_models_book.py`(생성/조회, 기본값).

### Task 3.2 — HandoffEvent 모델 + 마이그레이션
- **목적:** 이동 기록(순번 원본 보존).
- **생성 파일:** `backend/app/models/handoff_event.py`, `backend/alembic/versions/xxxx_handoffs.py`
- **DB/API/UI:** `handoff_events(id, book_id FK, from_user_id FK null, to_user_id FK, page_at_handoff int null, is_manual bool default false, note text null, created_at)`.
- **선행 조건:** 3.1.
- **완료 조건:** 마이그레이션 적용.
- **테스트:** `backend/tests/test_models_handoff.py`(이벤트 생성/조회).

### Task 3.3 — 순환 서비스 (rotation)
- **목적:** 다음 독자 계산·완료 판정(하이브리드).
- **생성 파일:** `backend/app/services/rotation.py`, `backend/tests/test_rotation.py`
- **DB/API/UI:** 순수 로직: `next_reader(members_ordered, current_user, manual=None)`(기본 rotation_position 다음, manual 지정 시 그 사용자), `completes_loop(next_user, chooser)`.
- **선행 조건:** 2.1, 3.1.
- **완료 조건:** 기본 순환/수동 변경/한 바퀴 완료 정확.
- **테스트:** `pytest backend/tests/test_rotation.py`(A→B→C→D→A, 수동 스킵, chooser 복귀 True).

### Task 3.4 — 책 등록/조회 API
- **목적:** 책 등록과 목록/상세 조회.
- **생성 파일:** `backend/app/schemas/book.py`, `backend/app/api/books.py`, `backend/app/main.py`(수정)
- **DB/API/UI:**
  - `POST /groups/{gid}/books {title,author,genre,total_pages,cover_url?}` → chooser=현재 사용자, current_holder=chooser, started_at=now, **due_date=now + group.reading_period_days**, 시작 handoff_event(to=chooser, note="시작") 기록.
  - `GET /groups/{gid}/books?status=circulating|completed` → 목록.
  - `GET /books/{id}` → 상세(현재 독자·진행률·다음 독자·순환 경로·handoff 이력).
- **선행 조건:** 3.1, 3.2, 2.2.
- **완료 조건:** 등록 시 due_date가 모임 독서기간으로 계산, 목록/상세 정상, 비멤버 403.
- **테스트:** `backend/tests/test_books.py`(등록 + due_date 계산 검증, 목록 필터, 상세, 비멤버 403).

### Task 3.5 — 진행률 API
- **목적:** 현재 페이지 갱신 → 진행률.
- **생성 파일:** `backend/app/api/books.py`(수정), `backend/app/schemas/book.py`(수정)
- **DB/API/UI:** `PATCH /books/{id}/progress {current_page}` → 0..total_pages 검증 후 갱신, 응답에 `percent` 계산. 현재 독자만 수정 가능(그 외 403).
- **선행 조건:** 3.4.
- **완료 조건:** 페이지 저장 시 percent 정확, 범위 밖 422, 비현재독자 403.
- **테스트:** `backend/tests/test_books.py`(수정: progress happy/범위밖/권한).

### Task 3.6 — 전달(handoff) API + 완료 판정
- **목적:** 다음 독자로 전달, 이력 기록, 한 바퀴 완료.
- **생성 파일:** `backend/app/api/books.py`(수정), `backend/app/schemas/handoff.py`
- **DB/API/UI:** `POST /books/{id}/handoff {manual_to_user_id?, note?}` → rotation 서비스로 다음 독자 결정, handoff_event 기록(`is_manual`=manual 여부, page_at_handoff=현재 페이지), current_holder=다음, current_page=0, started_at=now, **due_date=now + group.reading_period_days** 갱신. 다음이 chooser면 `status=completed`, `completed_at=now`.
- **선행 조건:** 3.3, 3.4.
- **완료 조건:** 기본/수동 전달 동작, 이력 축적, chooser 복귀 시 completed, due_date 재계산.
- **테스트:** `backend/tests/test_books.py`(수정: 기본 전달, 수동 전달 is_manual=true, 한 바퀴 completed, due_date 갱신, 비현재독자 403).

### Task 3.7 — 프런트 책 등록 UI
- **목적:** 책 등록 화면.
- **생성 파일:** `frontend/components/BookForm.tsx`, `frontend/app/groups/[groupId]/books/new/page.tsx`
- **DB/API/UI:** UI: 제목/저자/장르/전체페이지/표지URL 폼(다크 톤). API `POST /groups/{gid}/books`.
- **선행 조건:** 2.3, 3.4.
- **완료 조건:** 폼 제출 시 책이 순환에 등록되고 홈으로 복귀.
- **테스트:** `frontend/components/BookForm.test.tsx`(제출 시 api.createBook 호출, 필수값 검증). 수동: 등록 확인.

### Task 3.8 — 프런트 Hero(순환 목록)
- **목적:** 모임 홈의 unveil hover-reveal 순환 목록.
- **생성 파일:** `frontend/components/BookUnveilList.tsx`, `frontend/app/groups/[groupId]/page.tsx`(수정: Hero 삽입)
- **DB/API/UI:** UI: 순환 책 목록(프로토타입 참고, hover 표지 언베일/모바일 탭), 현재 독자·진행률 표시. API `GET /groups/{gid}/books?status=circulating`.
- **선행 조건:** 3.4, 3.7.
- **완료 조건:** 실제 순환 책이 Hero에 렌더, 항목 클릭 시 상세로 이동.
- **테스트:** `frontend/components/BookUnveilList.test.tsx`(목록 렌더 + 항목 링크). 수동: 표지 언베일 확인.

### Task 3.9 — 프런트 책 상세·전달 UI
- **목적:** 진행률 입력·순환 경로·전달·타임라인.
- **생성 파일:** `frontend/components/HandoffPanel.tsx`, `frontend/app/groups/[groupId]/books/[bookId]/page.tsx`
- **DB/API/UI:** UI: 진행률 입력(→% 자동), 순환 경로(현재/다음/지난), 전달 버튼 + 수동 변경, 이동 기록 타임라인. API `/books/{id}`, `/books/{id}/progress`, `/books/{id}/handoff`.
- **선행 조건:** 3.5, 3.6, 3.8.
- **완료 조건:** 진행률 저장/전달이 화면에 반영, 타임라인 축적.
- **테스트:** `frontend/components/HandoffPanel.test.tsx`(진행률 입력 시 % 계산, 전달 클릭 시 api.handoff 호출). 수동: 등록→진행→전달.

### Task 3.10 — Phase 3 Playwright 스모크 (핵심 순환 flow)
- **목적:** Phase 3 종료 시 핵심 flow를 자동 검증.
- **생성 파일:** `frontend/playwright.config.ts`, `frontend/e2e/circulation-smoke.spec.ts`
- **DB/API/UI:** 시나리오: 가입→모임 생성(독서기간)→책 등록→진행률 입력→전달→상세 타임라인/다음 독자 확인.
- **선행 조건:** 3.9(백엔드 실행 중).
- **완료 조건:** 스모크 e2e 그린.
- **테스트:** `npx playwright test e2e/circulation-smoke.spec.ts`.

---

## Phase 4 — 완료된 책 · 리뷰 · 통계 집계

### Task 4.1 — Review 모델 + API
- **목적:** 구성원별 별점·한줄평.
- **생성 파일:** `backend/app/models/review.py`, `backend/alembic/versions/xxxx_reviews.py`, `backend/app/schemas/review.py`, `backend/app/api/reviews.py`, `backend/app/main.py`(수정)
- **DB/API/UI:** `reviews(id, book_id FK, user_id FK, rating smallint 1..5, one_liner text, created_at, UNIQUE(book_id,user_id))`. API `POST /books/{id}/reviews {rating,one_liner}`(upsert), `GET /books/{id}/reviews`.
- **선행 조건:** 3.1, 1.3.
- **완료 조건:** 작성/수정(upsert)/조회, 1인 1리뷰.
- **테스트:** `backend/tests/test_reviews.py`(작성/재작성 upsert, rating 범위 밖 422, 목록).

### Task 4.2 — 완료된 책 피드 API
- **목적:** 서재(Cover/Bookshelf)용 데이터.
- **생성 파일:** `backend/app/api/books.py`(수정), `backend/app/schemas/book.py`(수정)
- **DB/API/UI:** `GET /groups/{gid}/books?status=completed` 응답에 평균 별점·최근 한줄평·함께 읽은 사람(handoff 이력 도출)·total_pages 포함.
- **선행 조건:** 3.6, 4.1.
- **완료 조건:** 완료된 책 목록이 표지/두께/별점/참여자 렌더 필드를 제공.
- **테스트:** `backend/tests/test_books.py`(수정: completed 피드 필드 검증).

### Task 4.3 — 통계 집계 API
- **목적:** 누적 지표·분포·멤버별 통계(집계).
- **생성 파일:** `backend/app/services/stats.py`, `backend/app/schemas/stats.py`, `backend/app/api/stats.py`, `backend/app/main.py`(수정), `backend/tests/test_stats.py`
- **DB/API/UI:** `GET /groups/{gid}/stats` → `{books_completed, pages_total, avg_rating, loops, by_month[], by_genre[], star_distribution[], members[]}`(멤버별 고른 책/읽은 페이지/준 별점 평균). 순수 집계.
- **선행 조건:** 3.6, 4.1.
- **완료 조건:** 시드 데이터로 각 집계값이 수기 계산과 일치.
- **테스트:** `pytest backend/tests/test_stats.py`(합계/평균/분포).

### Task 4.4 — 프런트 서재(Cover/Bookshelf)
- **목적:** 완료된 책의 두 뷰.
- **생성 파일:** `frontend/components/Bookcase.tsx`, `frontend/app/groups/[groupId]/page.tsx`(수정: 서재 삽입)
- **DB/API/UI:** UI: 스틸 책장 Cover/Bookshelf 토글(프로토타입 참고, 페이지=두께, hover pull-out, 리뷰/참여자). API `GET /groups/{gid}/books?status=completed`.
- **선행 조건:** 3.9, 4.2.
- **완료 조건:** 실제 완료 데이터로 두 뷰 렌더.
- **테스트:** `frontend/components/Bookcase.test.tsx`(토글 전환, spine 두께=pages 매핑). 수동 확인.

### Task 4.5 — 프런트 통계 대시보드
- **목적:** 누적 타일·차트 화면.
- **생성 파일:** `frontend/components/StatTiles.tsx`, `frontend/components/Charts.tsx`, `frontend/app/groups/[groupId]/stats/page.tsx`
- **DB/API/UI:** UI: 누적 타일 + 월별/장르/별점 차트(단일 색, 값 라벨, hover). API `GET /groups/{gid}/stats`.
- **선행 조건:** 4.3, 4.4.
- **완료 조건:** 실제 집계로 타일·차트 렌더.
- **테스트:** `frontend/components/Charts.test.tsx`(값→막대 높이 매핑). 수동 확인.

---

## Phase 5 — 재미 요소 (배지·칭호) · **MVP nice-to-have**

> Phase 5는 **MVP nice-to-have**. 일정이 촉박하면 Phase 6 이후로 미뤄도 핵심 MVP는 성립한다. **Wrapped(연말 결산)는 여기에 포함하지 않고 부록 A(v2)에만 둔다.**

### Task 5.1 — *(nice-to-have)* 업적/칭호 계산 API
- **목적:** 데이터 파생 배지·칭호(저장 없이 계산).
- **생성 파일:** `backend/app/services/achievements.py`, `backend/app/api/stats.py`(수정: `GET /groups/{gid}/achievements`), `backend/tests/test_achievements.py`
- **DB/API/UI:** 규칙: 첫 완독, 벽돌책 격파(≥600p), 한 바퀴 완주, 10권 클럽, 정시 전달러(due 준수 연속), 별점 수집가(리뷰 수). 칭호: 큐레이터/벽돌책 헌터/완독 요정/속독가. 응답: earned/locked + 멤버별 title.
- **선행 조건:** 4.3.
- **완료 조건:** 시드 기준 earned/locked·칭호가 규칙과 일치.
- **테스트:** `pytest backend/tests/test_achievements.py`(각 규칙 경계값).

### Task 5.2 — *(nice-to-have)* 프런트 배지·칭호 UI
- **목적:** 통계 페이지에 배지·칭호 통합.
- **생성 파일:** `frontend/components/Badges.tsx`, `frontend/app/groups/[groupId]/stats/page.tsx`(수정)
- **DB/API/UI:** UI: 배지 그리드(획득/잠금), 멤버 칭호 칩. **Wrapped CTA는 두지 않음(v2).** API `GET /groups/{gid}/achievements`.
- **선행 조건:** 4.5, 5.1.
- **완료 조건:** 배지·칭호가 실제 계산값으로 렌더.
- **테스트:** `frontend/components/Badges.test.tsx`(earned/locked 분기). 수동 확인.

---

## Phase 6 — 마감(모바일·모션·e2e)

### Task 6.1 — 모바일 대응 + 모션 패스
- **목적:** spec §7–8 반영(반응형, reduced-motion, Framer 전환).
- **수정 파일:** `frontend/components/*`(브레이크포인트, hover→탭), `frontend/app/globals.css`
- **DB/API/UI:** UI만. Hero hover→모바일 탭, 서재 가로 스크롤, 전달 2열→1열, `prefers-reduced-motion` 존중.
- **선행 조건:** 4.5(5.x 완료 시 포함).
- **완료 조건:** 모바일 뷰포트에서 핵심 화면 사용 가능, 모션 감소 시 애니메이션 비활성.
- **테스트:** 수동(모바일 에뮬레이션) + 6.2.

### Task 6.2 — 전체 e2e 스모크
- **목적:** 완료된 책·통계까지 포함한 전체 플로우 검증.
- **생성 파일:** `frontend/e2e/core-flow.spec.ts`
- **DB/API/UI:** 시나리오: 가입→모임 생성→책 등록→진행률→전달×N→완료→리뷰→서재/통계 확인.
- **선행 조건:** 6.1(백엔드 실행).
- **완료 조건:** e2e 그린.
- **테스트:** `npx playwright test`.

---

## 부록 A — v2 (MVP에서 구현하지 않음)

> 아래는 **스키마 확장 여지만** 두고, MVP 단계에서는 **절대 구현하지 않는다.** 별도 계획서로 분리하여 진행한다.

- **친구:** `friendships(user_id, friend_user_id, status, created_at)` + 닉네임 검색/추가 API·UI.
- **초대:** `invitations(id, group_id, inviter_user_id, invitee, status, created_at)` + 친구 초대 흐름.
- **공개 책장:** 사용자 선택적 공개 프로필/책장.
- **다음 책 투표:** `book_votes(group_id, candidate, voter_user_id)` + 투표 UI.
- **연말 결산(Wrapped):** 결산 CTA 및 상세 페이지, **취향 짝꿍** 매칭.

---

## 실행 핸드오프

이 계획은 **검토 후** 실행한다. 실행 시:
1. 전용 worktree/브랜치에서 진행.
2. Task 순서대로, 각 Task의 완료 조건·테스트를 통과하면 커밋.
3. Phase 경계(특히 Phase 3 스모크 3.10)에서 사람 검토 체크포인트.
4. Phase 5는 nice-to-have — 여력에 따라 순연 가능.
5. v2(부록 A)는 별도 계획으로만 진행.
