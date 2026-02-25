---
title: CS 페이지 (게임 고객지원 포털) - Tech Spec
date: 2026-02-26
prd: docs/prd/260226-cs-page.md
status: implemented
---

## ⚠️ 프로젝트 호환성 체크

| 항목 | 프로젝트 현황 | 호환 여부 | 비고 |
|------|-------------|----------|------|
| 아키텍처 | Next.js App Router (`src/app/`) | ✅ | CS도 동일 구조 사용 |
| 상태 관리 | `useState` / `useEffect` (라이브러리 없음) | ✅ | CS도 동일 패턴 |
| 스타일링 | Tailwind CSS v3, `darkMode: "class"` | ✅ | `dark:` 클래스 그대로 사용 |
| DB/Auth | Supabase SSR (`@supabase/ssr`) | ✅ | 동일 인스턴스 활용 |
| 테스트 | 없음 | N/A | 수동 검증으로 대체 |
| **Next.js 버전** | **16** | **⚠️ 주의** | `params`가 `Promise` → 동적 라우트에서 `await params` 필수 |
| `useSearchParams()` | - | **⚠️ 주의** | 검색 페이지에서 Suspense 래핑 필수 (Next.js 요구사항) |

---

## 의존성 분석 및 기술 설계

### API
- **신규** `POST /api/cs/submit`
  - `NODE_ENV !== 'development'`일 때만 Supabase Auth 인증 확인 (401)
  - insert는 `createAdminClient()` (service role) 사용 → RLS 우회하여 직접 저장
  - 파일 업로드 없음 — 파일명 배열(`string[]`)만 body에서 수신하여 저장
- **기존 API 변경 없음**

### DB
- **신규 테이블** `public.cs_submissions`
  - 기존 테이블 무관 (완전 신규, 사이드 이펙트 없음)
  - RLS: authenticated 유저만 INSERT 허용 (정책 존재)
  - API Route에서 service role 클라이언트로 insert → RLS 우회
  - 수동 SQL 실행 필요 (Supabase 대시보드)

### Domain
- **신규** `src/app/cs/types.ts` — CsCategory, CategoryMeta, CsArticle, SearchResult, ContactTopic 타입
- **신규** `src/app/cs/lib/categories.ts` — 6개 카테고리 메타, VALID_CATEGORY_SLUGS(Set), CATEGORY_SLUG_MAP(Record)
- **신규** `src/app/cs/lib/articles.ts` — 더미 아티클 30개 + `searchArticles(query)` (title > body > tag 우선순위)
  - 성능: 30개 아티클 선형 탐색. 충분히 작아 성능 문제 없음. 확장 시 인덱스 기반 검색으로 대체 가능
- **사이드 이펙트 없음** — 정적 데이터, 빌드 타임 상수

### UI
- **사용 패키지**: 추가 설치 없음. 기존 `lucide-react`(아이콘), `framer-motion`(AccessibilityDrawer 슬라이드 애니메이션) 활용
- **수정** `src/components/AppShell.tsx` — `pathname.startsWith('/cs')` 분기 추가 (기존 `/login` 분기 패턴 동일)
- **수정** `src/components/Navbar.tsx` — CS 드롭다운 추가 **(이미 완료)**
- **신규 CS 레이아웃**: `src/app/cs/layout.tsx`
- **신규 CS 페이지 4개**: `page.tsx`, `search/page.tsx`, `contact/page.tsx`, `refund-guides/page.tsx`, `[category]/page.tsx`
- **신규 CS 컴포넌트 10개**: SearchBar, CsHeader, TopicCard, TopicGrid, WhatsNewSection, ContactForm, CsFooter, LanguageModal, CookieModal, AccessibilityDrawer

### Release Strategy
- `/cs/*` 경로 하위에 완전 격리 → 기존 페이지(P32, P40, 도구, pAI) 영향 없음
- DB 변경은 신규 테이블 추가만 → 기존 테이블 무변경
- AppShell 수정은 분기 추가만 → 기존 `/login`, 일반 페이지 동작 불변
- 피처 플래그 불필요 — Navbar 링크가 이미 노출되어 있으므로 CS 페이지 구현 완료 후 즉시 사용 가능

---

## Plan (Implementation Checklist)

> 작업 순서: A → B → C → D → E → F → G
> C와 D는 서로 의존성이 없어 병행 가능

**Phase A: 데이터 설계** ― CS 페이지 전체의 뼈대가 되는 데이터를 먼저 정의합니다.
- [x] 카테고리·아티클·문의 토픽 등 CS에서 쓰이는 데이터 형태(타입) 정의
- [x] 6개 카테고리 목록 작성 (이름·설명·아이콘·URL 슬러그)
- [x] 더미 아티클 30개 작성 (카테고리별 5개) + 키워드 검색 함수 구현

**Phase B: CS 페이지 레이아웃 분리** ― CS 페이지에서 기존 사이트의 하단바가 나오지 않도록 처리합니다.
- [x] CS 경로(`/cs/...`)에서는 기존 글로벌 하단바 숨김, 여백(padding) 제거
- [x] 완료 후 확인: 기존 페이지(스트링 체크 등)에서 하단바가 여전히 정상 표시되는지 검증

**Phase C: CS 화면 구성 요소** ― 메인 페이지를 구성하는 각 UI 조각을 만듭니다.
- [x] CsHeader: 상단 히어로 배너 (그라디언트 배경 + 타이틀)
- [x] SearchBar: 검색어 입력 후 Enter/버튼 클릭 시 검색 결과 페이지로 이동
- [x] TopicCard / TopicGrid: 카테고리 카드 1개 + 2×3 그리드 레이아웃
- [x] WhatsNew 섹션: "What's New?" 더미 카드 6개 (2×3 그리드)

**Phase D: CS 하단바 + 모달** ― CS 전용 하단 영역과 팝업 3종을 만듭니다. (C와 병행 가능)
- [x] Language 모달: 언어 목록 팝업 (실제 언어 전환 없음, 더미 UI)
- [x] Cookie 모달: 쿠키 설정 토글 팝업 (더미 UI)
- [x] Accessibility 드로어: 우측에서 슬라이드로 열리는 접근성 설정 패널 (더미 UI)
- [x] CsFooter: 위 3개 팝업을 열고 닫는 버튼이 있는 CS 전용 하단바 조립

**Phase E: CS 페이지 라우트 연결** ― C·D가 완성된 구성 요소들을 실제 URL에 붙입니다.
- [x] CS 레이아웃(`/cs/layout.tsx`): 모든 CS 페이지 하단에 CsFooter 자동 삽입
- [x] `/cs` 메인 페이지: 히어로·검색·카테고리·뉴스 섹션 조합
- [x] `/cs/[카테고리]` 페이지: 유효 카테고리면 아티클 목록, 없는 카테고리면 404
- [x] `/cs/refund-guides` 페이지: 환불 안내 Q&A 정적 페이지
- [x] `/cs/search` 페이지: URL의 검색어를 읽어 아티클 검색 결과 표시

**Phase F: 문의 폼(Contact Us)** ― E 완료 후 진행. DB 테이블 생성을 먼저 수동으로 실행해야 합니다.
- [x] **[수동 작업]** Supabase 대시보드에서 `cs_submissions` 테이블 생성 SQL 실행
- [x] `/api/cs/submit` API: 폼 데이터를 받아 로그인 여부 확인 후 DB에 저장 (service role 클라이언트로 insert)
- [x] ContactForm 컴포넌트: 입력 유효성 검증, 이메일 일치 확인, 파일 첨부(파일명만), 제출 후 완료 메시지
- [x] `/cs/contact` 페이지: ContactForm 삽입

**Phase G: 최종 검증**
- [x] 빌드 오류 없음 확인 (`next build`)
- [x] 아래 테스트 계획의 모든 시나리오 수동 확인

---

## 테스트 계획

- **목표**: 이번 작업이 기존 페이지를 건드리지 않았는지 확인하고, CS 페이지 각 기능이 기획한 대로 동작하는지 수동으로 검증합니다.
- **방식**: 브라우저에서 직접 클릭·입력하며 확인 (자동화 테스트 없음)
- **실행 시점**: Phase G — 구현 완료 후 최종 확인 단계

**1. 기존 기능 이상 없음 확인** ― CS 작업이 기존 페이지를 망가뜨리지 않았는지 확인
- [x] 로그인 페이지(`/login`) 접속 → 화면 깨짐 없음
- [x] 스트링 체크 페이지(`/string-check`) 접속 → 상단 네비바·하단 푸터 정상 표시
- [x] 네비바에서 P32, 도구, pAI 메뉴 클릭 → 각 페이지 정상 이동
- [x] 다크모드 전환 → 기존 페이지 색상 깨짐 없음

**2. CS 메인 페이지 확인** (`/cs`)
- [x] 접속 시 히어로 배너·검색바·카테고리 카드 6개·뉴스 카드 6개 모두 보임
- [x] 하단에 기존 사이트 푸터가 **없고**, CS 전용 푸터가 보임
- [x] 다크모드로 전환해도 CS 페이지 UI가 깨지지 않음

**3. 검색 기능 확인**
- [x] 검색바에 `"로딩"` 입력 후 Enter → 검색 결과 페이지 이동, 관련 아티클 1건 이상 표시
- [x] 검색바에 `"xyzabc999"` 입력 → 결과 없음 메시지(`"No results for 'xyzabc999'"`) 표시
- [x] 검색바 아무것도 안 입력하고 Enter → 페이지 이동 없음

**4. 카테고리 탐색 확인**
- [x] `"How to Play"` 카테고리 카드 클릭 → `/cs/how-to-play` 페이지, 아티클 5개 표시
- [x] 브라우저 주소창에 `/cs/없는카테고리` 직접 입력 → 404 페이지

**5. 문의 폼 확인** (`/cs/contact`)
- [x] 폼 접속 시 날짜 칸에 오늘 날짜 자동 입력, 제출 버튼 비활성화 상태
- [x] 이메일 확인 칸에 다른 이메일 입력 후 다른 곳 클릭 → 빨간색 오류 메시지 표시
- [x] 모든 칸 입력 + 이메일 두 칸 일치 → 제출 버튼 활성화
- [x] 제출 버튼 클릭 → 로딩 표시 → Supabase 대시보드에서 `cs_submissions` 테이블에 새 행(row) 생성 확인
- [x] 제출 완료 → "Thank you" 완료 메시지로 폼이 교체됨
- [x] `"Documentation required for refund"` 링크 클릭 → 환불 안내 페이지로 이동

**6. 나머지 페이지·기능 확인**
- [x] `/cs/refund-guides` 접속 → 환불 Q&A 5개 정상 표시
- [x] CS 하단바 `"Language"` 버튼 → 언어 선택 팝업 열림·닫힘
- [x] CS 하단바 `"Cookie Settings"` 버튼 → 쿠키 설정 팝업 열림, 토글 동작
- [x] CS 하단바 `"Accessibility"` 버튼 → 우측에서 패널 슬라이드로 열림·닫힘

---

## 데이터 흐름 및 테이블 명세

### 1. 문의 폼 제출 흐름

> 사용자가 폼을 작성하고 제출 버튼을 누르면 서버를 거쳐 DB에 저장되는 흐름입니다.
> 이 흐름에서만 실제 네트워크 요청과 DB 쓰기가 발생합니다.

```
[문의 폼 화면 — 브라우저]
  └─ 제출 버튼 클릭 → POST /api/cs/submit (서버 API 호출)
       ├─ 로그인 여부 확인 (운영 환경에서만 / 개발 중엔 우회)
       ├─ 필수 필드 누락 여부 검사
       └─ cs_submissions 테이블에 문의 내용 저장
            └─ 성공 → 브라우저에 { success: true } 반환 → Thank you 화면 표시
```

**`cs_submissions` 테이블** — 문의 내용이 저장되는 곳 (현재는 저장 전용, 조회 기능 없음)

| 컬럼명 | 의미 | 비고 |
|--------|------|------|
| `id` | 문의 고유 식별자 | 자동 생성 UUID |
| `submitted_at` | 제출 시각 | 자동 기록 |
| `date_of_issue` | 문제 발생 날짜 | 폼 입력값 |
| `topic` | 문의 유형 | 7개 토픽 중 하나 |
| `description` | 문의 내용 | 폼 입력값 |
| `first_name` | 문의자 이름 | 폼 입력값 |
| `email` | 문의자 이메일 | 폼 입력값 |
| `attachment_urls` | 첨부 파일명 목록 | 실제 파일이 아닌 파일명만 저장 |

### 2. 아티클 검색 흐름

> 검색은 서버 요청 없이 브라우저 안에서만 처리됩니다.
> 30개 더미 아티클을 키워드로 걸러내는 단순한 구조입니다.

```
[검색바 — 브라우저]
  └─ 검색어 입력 + Enter → 주소창을 /cs/search?q={검색어} 로 이동
       └─ 검색 결과 페이지
            └─ searchArticles(검색어) 함수 실행 — 서버 요청 없음, 즉시 처리
                 ├─ 제목에 검색어 포함 → 최우선 노출
                 ├─ 본문/요약에 검색어 포함 → 차순위 노출
                 └─ 태그에 검색어 포함 → 최하순위 노출
```

### 3. 카테고리 페이지 흐름

> 카테고리 페이지는 서버에서 완성된 HTML을 내려주는 방식입니다.
> DB 조회 없이 코드에 내장된 더미 데이터를 사용합니다.

```
[브라우저에서 /cs/how-to-play 접속]
  └─ 서버에서 URL의 카테고리명 추출
       ├─ 유효한 카테고리명? → 해당 카테고리 아티클 5개 필터링 → 페이지 렌더링
       └─ 없는 카테고리명? → 404 페이지 반환
```

---

## API 명세

### POST `/api/cs/submit`

- **역할**: 문의 폼 데이터를 받아 DB에 저장하는 서버 API
- **접근 권한**: 로그인한 사용자만 가능 (개발 환경에서는 로그인 없이도 동작)
- **요청 본문 예시** (브라우저 → 서버로 전송되는 JSON):
```json
{
  "dateOfIssue": "2026-02-26",
  "topic": "Purchases",
  "description": "결제 후 아이템을 받지 못했습니다.",
  "firstName": "홍길동",
  "email": "user@example.com",
  "attachmentUrls": ["receipt.png"]
}
```
- **내부 처리**: 필드명을 DB 컬럼 형식으로 변환 후 저장
  - `dateOfIssue` → `date_of_issue`, `firstName` → `first_name`, `attachmentUrls` → `attachment_urls`
- **응답 결과**:

| 상황 | 응답 코드 | 내용 |
|------|----------|------|
| 정상 저장 | 200 | `{ "success": true }` |
| 로그인 안 됨 (운영 환경) | 401 | `{ "error": "Unauthorized" }` |
| 필수 필드 누락 | 400 | `{ "error": "Invalid input" }` |
| DB 오류 | 500 | `{ "error": "Server error" }` |

---

## Risk & Rollback

**[R1] 기존 페이지 레이아웃 깨짐**
- **어떤 상황**: CS 경로 감지 코드(`/cs/...` 여부 판단)가 오작동하면 CS가 아닌 기존 페이지에서도 하단 푸터·여백이 사라질 수 있음
- **가능성**: 낮음 — 로직이 단순한 문자열 비교 1줄
- **복구 방법**: `AppShell.tsx`에서 CS 분기 조건 1줄 제거 → 즉시 기존 레이아웃으로 복구
- **배포 후 확인**: 스트링 체크·P32 등 기존 페이지에서 하단 푸터가 정상 표시되는지 즉시 확인

**[R2] 문의 폼 제출 시 DB 저장 실패 (권한 오류)**
- **어떤 상황**: Supabase DB 권한 설정(RLS 정책)이 잘못 적용되면 로그인한 사용자도 저장이 거부되어 에러 발생
- **가능성**: 중간 — SQL을 수동으로 실행하는 단계이므로 오타·누락 가능성 있음
- **복구 방법**: Supabase 대시보드 → Table Editor → `cs_submissions` 테이블 → RLS Policies에서 권한 설정 재확인 후 수정 (코드 배포 불필요)
- **테이블 전체 취소 시**: `DROP TABLE public.cs_submissions;` 한 줄로 제거 가능 — 기존 테이블과 연결관계(FK) 없으므로 다른 데이터에 영향 없음
- **설계 참고**: 유저가 자신의 제출 내역을 조회하는 기능은 의도적으로 제외 (어드민 대시보드는 이번 범위 밖)
- **배포 후 확인**: 최초 1회 폼 제출 후 Supabase Table Editor에서 행이 생성되었는지 바로 확인

**[R3] 카테고리 페이지 렌더링 오류 (Next.js 16 호환성)**
- **어떤 상황**: Next.js 16에서 URL 파라미터를 읽는 방식이 바뀌었음 (`await` 필수). 기존 방식대로 작성하면 빌드 에러 또는 런타임 오류 발생
- **가능성**: 낮음 — 알려진 변경사항이고 체크리스트에 명시
- **복구 방법**: `[category]/page.tsx` 파라미터 읽는 부분에 `await` 추가 (1줄 수정)
- **배포 후 확인**: `next build` 실행 시 경고·에러 메시지 없는지 확인
