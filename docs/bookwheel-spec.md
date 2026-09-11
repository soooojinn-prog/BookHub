# 책바퀴 (BookWheel) — 서비스 기획/디자인 스펙

> 슬로건: **"책을 돌려 마음을 잇다"**
> 실제 교환독서 모임 '책바퀴'에서 장기간 사용할 웹서비스. 예쁜 화면뿐 아니라 사용성과 데이터 구조를 함께 고려한다.

## Context (왜 만드는가)

교환독서 모임에서 한 권의 책이 구성원 사이를 순서대로 돌며 함께 읽는다. 지금은 "누가 어디까지 읽었는지", "다음은 누구인지", "어떤 책이 돌았는지"를 추적할 도구가 없다. 책바퀴는 **지금 돌고 있는 책(살아 움직이는 책)** 과 **다 읽은 책(차곡차곡 쌓이는 기록)** 을 대비시켜 보여주고, 진행률·전달·평가·누적 독서량을 한곳에서 관리한다.

---

## 1. 핵심 사용자 Flow / MVP 범위

- **인증**: 닉네임 + 비밀번호 기반 간단 인증 (소셜 로그인 X, v1).
- **v1 범위 = 멀티 모임 + 로그인**
  - 로그인 → 내가 가입한 **모임 목록** → 모임 선택 → 그 모임의 책/멤버 상태.
  - 모임 생성/가입 가능 (v1 가입은 **초대코드/링크** 방식).
  - 모임별로 멤버·진행 중인 책·완료된 책·순환 기록을 분리.
- **v2 (확장, 데이터 모델만 열어둠)**: 닉네임 검색 친구 추가, 친구 초대, 공개 책장(선택적 공개).
- **프라이버시 기본값**: 같은 모임의 기록만 공유. 개인 기록 전체 자동공개 없음.

## 2. 순환(circulation) 모델 — 하이브리드

- 기본: 모임 멤버 순서를 따르는 **round-robin**.
- 각 책은 **최초 선택자(chooser)를 기준**으로 순환 시작.
- 책이 최초 선택자에게 복귀하면 **1회 순환 완료** → 완료 처리.
- 사정에 따라 **다음 독자를 수동 변경** 가능. 단 순번(rotation_order)을 덮어쓰지 않고 **handoff history**로만 기록.
- UI에는 **현재 독자 / 다음 독자 / 전체 순환 경로**를 표시.

## 3. 페이지 구조

1. **로그인 / 회원가입** (닉네임·비밀번호)
2. **내 모임 목록** — 가입한 모임 카드, 모임 생성/초대코드 가입
3. **모임 홈** — 두 영역의 대비
   - **지금 돌고 있는 책 (Hero)**: 약 4권, 살아 움직이는 인터랙티브 목록
   - **완료된 책 (서재)**: Cover / Bookshelf 뷰 + 누적 지표
4. **책 상세 · 전달(handoff)** — 진행률 입력, 순환 경로, 전달, 이동 기록 타임라인
5. **완료된 책 상세** — 구성원별 별점·한줄평
6. *(v2)* 친구 / 프로필 / 공개 책장

## 4. 데이터 모델

핵심: **순번(rotation_order)** 과 **실제 이동(handoff_events)** 분리.

| 테이블 | 주요 컬럼 | 메모 |
|---|---|---|
| **users** | id, nickname(unique), password_hash, created_at | 닉네임 기반 간단 인증 |
| **groups** | id, name, invite_code, created_by, created_at | 모임. 초대코드로 가입(v1) |
| **group_members** | group_id, user_id, role(owner/member), rotation_position, joined_at | 멤버십 + 모임 내 순번 |
| **books** | id, group_id, title, author, genre, cover_url, total_pages, chooser_user_id, status(circulating/completed), current_holder_user_id, current_page, started_at, due_date, completed_at | 모임별 책 |
| **handoff_events** | id, book_id, from_user_id, to_user_id, page_at_handoff, is_manual, note, created_at | 이동 기록. 순번을 덮지 않음 |
| **reviews** | id, book_id, user_id, rating(1–5), one_liner, created_at | 구성원별 별점·한줄평 |
| *(v2)* **friendships** | user_id, friend_user_id, status, created_at | 닉네임 검색·친구 |
| *(v2)* **invitations** | id, group_id, inviter_user_id, invitee, status, created_at | 친구 초대 |

**설계 포인트**
- "다음 독자"는 `group_members.rotation_position`에서 계산(기본). 수동 변경 시 `handoff_events.is_manual=true`로만 기록 → 순번 원본 보존.
- 완료 판정 = 다음 대상이 chooser로 복귀(한 바퀴) → `status=completed`, `completed_at`.
- 모임별 분리는 `group_id` 스코프로 프라이버시 기본값(같은 모임만 공유)을 자연 충족.
- 누적 지표(완독 수·쌓인 페이지·평균 별점)는 저장하지 않고 집계로 도출(필요 시 캐시).

## 5. 비주얼 시스템 (확정)

**방향: 다크 갤러리 (getcluster.ai 참고 · AI 템플릿 느낌 배제)**

- **팔레트 (쿨 스틸/실버 + 오로라)**
  - 배경 `#0f1214` (웜X, 쿨 near-black), 패널 `#171c1f` / `#1e2528`
  - 잉크 `#e8edef`, 보조 `#b4bfc3`, dim `#828d92`, faint `#565f63`
  - 헤어라인 `#262d30` / `#343d41`
  - **포인트 컬러 1개: 오로라 그린 `#63d1a3`** (진행률·강조·번호에만 절제되게)
- **타이포**: 본문/UI = IBM Plex Sans KR (300–600), 라틴 라벨/숫자 = Schibsted Grotesk. (세리프 남발·크림색·이모지 마커 지양)
- **배경 분위기**: 미세한 별빛(canvas starfield, 커서 시차) + 오로라 성운(그린·시안·연보라 저농도).
- **소재감**: 완료된 책 서재는 **실제 스틸 책장 가구** — 양옆 금속 기둥, 상단 캡, 하단 베이스, 반사되는 선반 널.
- **유리 효과(절제)**: 책 표지 hover 시 빛이 스치는 glass sweep, 툴팁/리뷰는 frosted glass(backdrop-blur). 과한 글래스모피즘은 지양.

## 6. 화면별 인터랙션

- **Hero (지금 돌고 있는 책)** — unveil.fr식: 4권을 큰 타이포 목록으로. 제목 hover 시
  - 나머지 항목 흐려짐(fade others)
  - 표지가 **커서를 따라 언베일**(clip-path wipe + 관성 추적) + 오로라 글로우
  - 행은 **얇은 헤어라인 카드로 살짝 커지며 바깥으로 팝**(테두리+확대+팝)
  - 표지에 현재 독자·다음 차례·진행률 표시. 모바일은 탭.
- **완료된 책 서재** — Cover / Bookshelf 토글
  - **Cover**: 서점 매대처럼 표지 정면 배치. 제목·저자는 위, hover 시 아래에서 한줄평 리뷰가 올라옴. 별점·함께 읽은 사람 아바타(고른 사람은 오로라 링).
  - **Bookshelf**: 책등(spine)이 꽂힘. **페이지 수 = 두께**. 책등 hover 시 책이 책장에서 빠져나오며 정보 툴팁.
  - 상단 누적 지표(완독 수·쌓인 페이지·평균 별점). Cover가 기본 뷰(초기엔 책이 적으므로).
- **책 상세 · 전달** — 현재 페이지 입력→진행률 자동계산, 순환 경로(현재/다음/지난), "다음 사람에게 전달" + 수동 변경, 이동 기록 타임라인.

## 6.5 통계 · 재미(게이미피케이션) 요소

완료된 책 데이터에서 **자동 집계**되며, 별도 입력을 강요하지 않는다.

**통계(Stats)**
- 누적 타일: 완독 수 · 쌓인 페이지 · 평균 별점 · 함께한 날 · **책바퀴 회전수**(순환 완료 횟수)
- 차트: 월별 완독 추이 · 장르 분포 · 별점 분포 (단일 색 + 값 라벨 + hover 툴팁)
- 멤버별: 고른 책 수, 읽은 페이지, 준 별점 평균, 참여 책 수
- 기록: 가장 두꺼운/빨리 읽힌 책, 연속 완독 streak, 모임 나이

**재미(Fun)**
- **배지·업적**: 첫 완독 / 벽돌책 격파(600p+) / 한 바퀴 완주 / 10권 클럽 / 정시 전달러 / 별점 수집가 / 밤샘 독서 / 취향 짝꿍 — 획득/잠금 상태.
- **자동 칭호**: 큐레이터(고른 책 별점 높음) · 벽돌책 헌터 · 완독 요정 · 속독가 등, 통계 기반 자동 부여.
- **이달의 큐레이터** 하이라이트.
- **연말 결산(Wrapped)**: 한 해 요약 카드.
- **다음 책 투표**, **전달 한마디(handoff note 활용)**, **취향 짝꿍**(별점 패턴 매칭).
- **마일스톤 축하**: 완독·한 바퀴 완주 시 오로라 이펙트.

> 데이터 영향: 대부분 기존 테이블(`books`, `reviews`, `handoff_events`, `group_members`)의 집계로 도출. 추가 후보 테이블 — `achievements`(user_id, group_id, code, earned_at), `book_votes`(group_id, candidate, voter_user_id).

## 7. Motion / Transition 원칙

애니메이션은 장식이 아니라 **서비스 개념(쌓이고·이동하고·책장에서 빠지고·전달)** 과 연결:
- 표지 언베일 = "책이 드러난다"
- 책이 책장에서 빠져나옴 = "그 책을 꺼내 본다"
- 전달 시 타임라인에 노드 추가 = "다음 사람에게 넘어간다"
- 별빛 시차 = 공간의 깊이
- `prefers-reduced-motion` 존중(반짝임·시차·sweep 비활성).

## 8. 모바일 대응

- Hero 목록: hover→**탭**으로 표지 표시. 큰 타이포 유지, 1열.
- 서재: Cover 그리드는 자동 줄바꿈, Bookshelf는 가로 스크롤 허용. 나무/스틸 프레임 축소.
- 전달 화면: 2열 → 1열 스택. 순환 경로 chip wrap.
- 상단 nav는 좁은 화면에서 숨김(추후 메뉴).

## 9. 기술 스택

- 프런트: **Next.js + TypeScript + Tailwind CSS + Framer Motion**
- 백엔드: **FastAPI + PostgreSQL**
- 인증: 세션/JWT 기반 간단 인증(닉네임+비밀번호, 해시 저장).

## 10. 개발 순서 (제안)

1. **기반**: 프로젝트 셋업, DB 스키마(users/groups/group_members/books/handoff_events/reviews), 인증(가입/로그인).
2. **모임**: 모임 생성·초대코드 가입·내 모임 목록·모임 홈 골격.
3. **책 + 순환 코어**: 책 등록, 현재 페이지→진행률, 순환 경로, 전달(handoff_events), 완료 판정.
4. **완료된 책 뷰**: Cover / Bookshelf, 별점·한줄평, 누적 지표.
5. **비주얼 마감**: 다크 갤러리 시스템, Hero 언베일, 별빛/오로라, 스틸 책장, 유리 효과, 모션.
6. **모바일 대응 · 다듬기.**
7. *(v2)* 친구/초대/공개 책장.

## 참고 프로토타입 (Artifact)

- Hero (다크 갤러리): 커서 추적 hover-reveal
- 완료된 책 서재: 스틸 책장 Cover/Bookshelf
- 책 전달 UX: 진행률·순환·handoff 타임라인
