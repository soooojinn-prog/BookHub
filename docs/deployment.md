# 책바퀴 (BookWheel) 배포 가이드

MVP를 프로덕션에 올리기 위한 실무 절차. 구조는 **프런트(Next.js) + 백엔드(FastAPI) + Neon(PostgreSQL)** 3개 컴포넌트.

```
[브라우저] ──> Vercel (Next.js frontend)  ──REST(credentials)──>  Render/Fly (FastAPI backend)  ──>  Neon (PostgreSQL)
```

> 실제 배포는 이 문서 기준으로 진행. 아직 미배포 상태.

---

## 0. 사전 준비
- GitHub 저장소 (이 repo)
- Neon 계정, Vercel 계정, 백엔드 호스트 계정(Render/Fly/Railway 중 택1)
- 로컬: Python 3.12, Node 20+

## 1. Neon (PostgreSQL) — dev/prod 분리

**중요:** 개발/테스트 DB와 운영 DB를 반드시 분리한다 (테스트 데이터가 운영에 유입되지 않도록).

Neon **branch** 기능으로 한 프로젝트 안에서 분리하는 것을 권장:
1. Neon 콘솔 → 프로젝트 생성 → 기본 브랜치 `main` = **운영(prod)**.
2. `main`에서 브랜치 생성 → `dev` = **개발/로컬**. (원하면 `test` 브랜치 추가로 CI 전용 분리)
3. 각 브랜치의 connection string을 확보하고 드라이버 접두사를 맞춘다:
   ```
   postgresql+psycopg://<user>:<pw>@<host>/<db>?sslmode=require
   ```
   - 로컬 `backend/.env` → **dev** 브랜치 URL
   - 운영 호스트 env → **prod** 브랜치 URL
   - CI → **dev**(또는 test) 브랜치 URL (절대 prod 아님)

## 2. 백엔드 배포 (예: Render Web Service)

- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Pre-deploy (마이그레이션): `alembic upgrade head`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**환경변수 (운영):**
| 변수 | 예시/값 | 비고 |
|---|---|---|
| `ENVIRONMENT` | `production` | |
| `DATABASE_URL` | `postgresql+psycopg://…?sslmode=require` | Neon **prod** 브랜치 |
| `SECRET_KEY` | `python -c "import secrets;print(secrets.token_urlsafe(48))"` 결과 | **필수, 강한 랜덤** |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `20160` | 14일 |
| `FRONTEND_ORIGIN` | `https://<앱>.vercel.app` | 콤마로 프리뷰 추가 가능 |
| `COOKIE_SECURE` | `true` | HTTPS 필수 |
| `COOKIE_SAMESITE` | `none` (프런트/백엔드 도메인 다를 때) 또는 `lax` | `none`이면 `COOKIE_SECURE=true` 필수 |

> **쿠키 주의:** Vercel(프런트)과 Render(백엔드)는 서로 다른 도메인이므로 인증 쿠키가 cross-site.
> 이 경우 반드시 `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` 로 설정해야 로그인 쿠키가 전송된다.
> 같은 도메인(예: `api.책바퀴.com` + `책바퀴.com`, 서브도메인)이면 `lax`로 충분.

**마이그레이션 (신규 운영 DB 최초 구성):**
```bash
cd backend
export DATABASE_URL="postgresql+psycopg://…prod…?sslmode=require"
alembic upgrade head        # 빈 DB → 전체 스키마(users→groups→books/handoffs→reviews)
```
(모델과 마이그레이션 일치 검증: `alembic check` → "No new upgrade operations detected")

## 3. 프런트 배포 (Vercel)

- Root directory: `frontend`
- Framework: Next.js (자동 감지), Build: `next build`
- **환경변수:**
  | 변수 | 값 |
  |---|---|
  | `NEXT_PUBLIC_API_URL` | `https://<백엔드 도메인>` (트레일링 슬래시 없이) |

배포 후 프런트 도메인을 백엔드 `FRONTEND_ORIGIN`에 반영(재배포).

## 4. 배포 후 smoke test

```bash
# 1) 백엔드 헬스
curl -s https://<backend>/health            # {"status":"ok"}

# 2) 인증 플로우 (쿠키 왕복)
JAR=$(mktemp)
curl -s -c $JAR -b $JAR -X POST https://<backend>/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"smoke_'$(date +%s)'","password":"secret1"}' -o /dev/null -w "register %{http_code}\n"
curl -s -b $JAR https://<backend>/auth/me -o /dev/null -w "me %{http_code}\n"   # 200

# 3) 프런트: 브라우저에서 https://<frontend>/register 로 가입 → /groups → 모임 생성 →
#    책 등록 → 진행률 → 전달 → 완료 → 리뷰 → 통계까지 육안 확인
```

## 5. CI에서 E2E (선택)

Playwright는 `CI` 환경변수가 있으면 자동으로 clean server 모드(`reuseExistingServer=false`, `retries=1`).
```bash
cd frontend && CI=1 npx playwright test    # webServer(build+start) 자동 기동
```
CI 러너에는 dev/test용 `DATABASE_URL`과 `NEXT_PUBLIC_API_URL=http://localhost:8000`, 백엔드 `.env`가 필요.

## 6. 로컬 개발 실행 (참고)
```bash
# 백엔드
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
cp .env.example .env   # DATABASE_URL(dev), SECRET_KEY 채우기
.venv/Scripts/alembic upgrade head
.venv/Scripts/uvicorn app.main:app --reload --port 8000

# 프런트
cd frontend && npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## 7. 환경변수 요약

**backend** (`backend/.env` / 호스트 env): `ENVIRONMENT`, `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `FRONTEND_ORIGIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE`
**frontend** (`frontend/.env.local` / Vercel): `NEXT_PUBLIC_API_URL`

시크릿(`SECRET_KEY`, `DATABASE_URL`)은 코드/Git에 절대 커밋하지 않는다 (`.env*`는 `.gitignore` 처리됨).
