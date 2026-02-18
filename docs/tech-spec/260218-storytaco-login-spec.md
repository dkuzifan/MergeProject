---
title: storytaco.com 계정 로그인 - Tech Spec
date: 2026-02-18
prd: docs/prd/260218-storytaco-login.md
status: implemented
---

## 의존성 분석 및 기술 설계

- **API**: 신규 Route Handler 4개
  - `GET /auth/callback` — Magic Link 인증 코드를 세션으로 교환
  - `POST /api/auth/check-user` — 이메일로 유저 존재 여부 및 PIN 설정 여부 확인 (RPC)
  - `POST /api/auth/verify-pin` — 이메일 + PIN 검증 후 세션 토큰 반환
  - `POST /api/auth/set-pin` — Magic Link 인증 완료 후 PIN 최초 저장
- **DB**: `public.user_pins` 테이블 신규 생성. Supabase Auth가 `auth.users` 테이블을 자동 관리
- **Supabase RPC**: SQL 함수 2개
  - `check_user_login_status(p_email)` — auth.users + user_pins 동시 조회
  - `get_user_id_by_email(p_email)` — 이메일로 user_id(UUID) 조회
- **Domain**: 도메인 검증 로직 (클라이언트 폼 레벨 + 서버 API 레벨)
- **UI**: 신규 페이지 1개(`/login`), `AppShell` 컴포넌트로 Navbar 표시 제어, Navbar 수정
- **Release Strategy**: 단일 PR. Proxy(Middleware)가 모든 경로를 게이팅하므로 배포 즉시 전체 사이트에 인증 적용됨. 배포 전 Supabase 대시보드 설정 및 환경변수 등록 필수

---

## 프로젝트 호환성 검사

| 항목 | 현황 | 판단 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router | ✅ 적합 |
| Supabase 환경변수 | `.env.local` 이미 설정됨 | ✅ 재사용 |
| `@supabase/supabase-js` | 설치됨 | ✅ 재사용 |
| `@supabase/ssr` | **미설치** | ⚠️ **신규 설치 필요** |
| 기존 Supabase 클라이언트 유틸 | 없음 | 📝 신규 생성 |
| Middleware | 없음 | 📝 신규 생성 (`proxy.ts`) |
| 스타일링 | Tailwind CSS | ✅ 목업과 일치 |
| 테스트 프레임워크 | 없음 | ℹ️ 수동 테스트로 대체 |

> **호환성 경고 1**: Next.js App Router에서 Supabase 세션을 Middleware + 서버 컴포넌트에서 안전하게 읽으려면 `@supabase/ssr` 패키지가 필수입니다.

> **호환성 경고 2**: Next.js 16부터 `middleware.ts` 대신 `proxy.ts`를 사용하며, export 함수명도 `middleware`가 아닌 `proxy`여야 합니다.

---

## 신규 설치 패키지

```bash
npm install @supabase/ssr
```

---

## 파일 변경 목록

### 신규 생성

| 파일 | 역할 |
|---|---|
| `src/utils/supabase/client.ts` | 브라우저용 Supabase 클라이언트 (`createBrowserClient`) |
| `src/utils/supabase/server.ts` | 서버 컴포넌트용 Supabase 클라이언트 (`createServerClient`) |
| `src/utils/supabase/admin.ts` | 서버 전용 Admin 클라이언트 (`service_role` 키 사용, RLS 우회) |
| `src/proxy.ts` | 전체 경로 인증 게이트 — 미인증 시 `/login` 리디렉션 (Next.js 16 방식) |
| `src/components/AppShell.tsx` | 경로별 Navbar 표시 여부 제어 — 로그인 페이지에서 Navbar 숨김 |
| `src/app/login/page.tsx` | 로그인 페이지 — 5단계 상태 머신 (이메일 입력 → PIN 또는 Magic Link 분기) |
| `src/app/auth/callback/route.ts` | Magic Link 콜백 Route Handler — PIN 설정 여부 확인 후 분기 |
| `src/app/api/auth/check-user/route.ts` | 이메일로 유저 존재 여부 및 PIN 설정 여부 확인 (Supabase RPC 사용) |
| `src/app/api/auth/verify-pin/route.ts` | PIN 검증 후 세션 토큰 반환 (Supabase RPC + generateLink) |
| `src/app/api/auth/set-pin/route.ts` | PIN 최초 저장 — 인증된 세션에서만 호출 가능 |

### 수정

| 파일 | 변경 내용 |
|---|---|
| `src/components/Navbar.tsx` | 로그인된 사용자 이메일 표시 + 로그아웃 버튼 추가 |
| `src/app/layout.tsx` | `<AppShell>`로 래핑하여 경로별 Navbar 제어 |

### Supabase DB 변경

| 항목 | 내용 |
|---|---|
| `public.user_pins` 테이블 | `user_id(uuid PK)`, `pin_hash(text)`, `created_at`, `updated_at` |
| RLS | 활성화 — Admin 클라이언트(service_role)만 접근 |
| `check_user_login_status` RPC | `auth.users` + `user_pins` 동시 조회, `security definer` |
| `get_user_id_by_email` RPC | 이메일로 `auth.users.id` 반환, `security definer` |

---

## 기술 설계 상세

### 1. Supabase 클라이언트 유틸

```
src/utils/supabase/
  client.ts   → createBrowserClient() 래퍼 (클라이언트 컴포넌트 전용)
  server.ts   → createServerClient() 래퍼 (서버 컴포넌트/Route Handler용, cookies() 연동)
  admin.ts    → createClient(service_role_key) 래퍼 (서버 전용, RLS 우회)
```

### 2. Proxy 인증 게이트 (`src/proxy.ts`)

- 모든 요청에서 Supabase 세션 쿠키를 확인
- 미인증 + `/login` 이외 경로 → `/login` 리디렉션
- 인증됨 + `/login` 접근 → `/` 리디렉션 (단, `?setup=pin` 쿼리 있으면 예외)
- `/api/auth/*`, `/auth/callback`, `/_next/*`, `/favicon.ico` 제외 (matcher 설정)
- 세션 갱신(refresh) 처리 포함

```
matcher: ['/((?!api/auth|auth/callback|_next/static|_next/image|favicon.ico).*)']
```

### 3. 로그인 페이지 (`src/app/login/page.tsx`)

클라이언트 컴포넌트. 5단계 상태 머신:
- `email_input`: 이메일 입력 폼 (기본 화면)
- `checking`: 서버 확인 중 (스피너)
- `pin_input`: 재방문 유저 — PIN 입력
- `magic_sent`: 신규 유저 — Magic Link 발송 완료
- `pin_setup`: Magic Link 인증 후 — 최초 PIN 설정

URL 파라미터는 `useEffect`에서 읽어 hydration 오류 방지:
- `?setup=pin` → `pin_setup` 상태로 초기화
- `?error=expired` → 에러 메시지 표시

### 4. 콜백 Route Handler (`src/app/auth/callback/route.ts`)

```
GET /auth/callback?code=xxx
  → exchangeCodeForSession(code)
  → user_pins 존재 여부 확인 (Admin 클라이언트)
  → PIN 미설정: redirect('/login?setup=pin')
  → PIN 설정 완료: redirect('/')
  → (실패 시) redirect('/login?error=expired')
```

### 5. PIN 시스템

**PIN 저장 (`/api/auth/set-pin`)**
```
인증된 세션에서 user.id 조회 (server Supabase client)
  → pinHash = HMAC-SHA256(key=user.id, data=pin).hex()
  → user_pins.upsert({ user_id, pin_hash }) (Admin 클라이언트)
```

**PIN 검증 (`/api/auth/verify-pin`)**
```
RPC get_user_id_by_email(email) → userId
  → pinHash = HMAC-SHA256(key=userId, data=pin).hex()
  → user_pins.select(pin_hash).eq(user_id, userId)
  → hash 비교
  → 일치: admin.auth.admin.generateLink({ type: 'magiclink', email })
  → hashed_token 반환
클라이언트: supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
```

**보안 고려사항**
- PIN은 평문 저장 없음 — user_id를 키로 하는 HMAC-SHA256 해시만 저장
- Admin 클라이언트는 서버에서만 사용, 브라우저 노출 없음
- API Route에서 이메일 도메인 검증 추가 (클라이언트 검증과 이중화)

### 6. AppShell 컴포넌트 (`src/components/AppShell.tsx`)

- `usePathname()`으로 현재 경로 확인
- `/login` 경로: Navbar/Footer 없음, 배경색 적용
- 그 외 경로: 기존 Navbar/Footer 표시
- 기존 페이지 파일 이동 없이 레이아웃 분기 처리

### 7. Navbar 수정

- `useEffect` + `getUser()` + `onAuthStateChange`로 세션 추적
- 로그인 상태: 이메일(최대 24자 truncate) + 로그아웃 버튼 표시
- 로그아웃: `supabase.auth.signOut()` → `router.push('/login')`

### 8. Supabase 대시보드 설정 (배포 전 필수)

- Authentication > Email > Enable Magic Link: ON
- Authentication > URL Configuration > Site URL: `https://{production-domain}`
- Authentication > URL Configuration > Redirect URLs: `http://localhost:3000/auth/callback`, `https://{production-domain}/auth/callback`

### 9. Vercel 환경변수

| 변수명 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (서버 전용) |

---

## Plan (Implementation Checklist)

> **의존성 순서**: Phase 1 완료 후 → Phase 2, 3, 4 순차 진행 → Phase 5 검증

**Phase 1: 기반 세팅**
- [x] `npm install @supabase/ssr` 패키지 설치
- [x] `src/utils/supabase/client.ts` 생성
- [x] `src/utils/supabase/server.ts` 생성
- [x] `src/utils/supabase/admin.ts` 생성

**Phase 2: 인증 게이트**
- [x] `src/proxy.ts` 생성 (Next.js 16, `export function proxy`)
- [x] `src/app/auth/callback/route.ts` 생성 (PIN 설정 여부 분기 포함)

**Phase 3: 로그인 UI**
- [x] `src/components/AppShell.tsx` 생성 (경로별 Navbar 표시 제어)
- [x] `src/app/layout.tsx` 수정 (AppShell 래핑)
- [x] `src/app/login/page.tsx` 생성 (5단계 상태 머신)

**Phase 4: PIN 시스템 API**
- [x] `src/app/api/auth/check-user/route.ts` 생성
- [x] `src/app/api/auth/set-pin/route.ts` 생성
- [x] `src/app/api/auth/verify-pin/route.ts` 생성
- [x] Supabase SQL: `user_pins` 테이블 생성
- [x] Supabase SQL: `check_user_login_status` RPC 생성
- [x] Supabase SQL: `get_user_id_by_email` RPC 생성

**Phase 5: Navbar 연동**
- [x] `src/components/Navbar.tsx` 수정

**Phase 6: 검증**
- [x] `npm run build` — 빌드 에러 없음
- [x] 수동 시나리오 테스트 통과

---

## 테스트 계획

**1. 핵심 기본 플로우 검증 (Regression)**
- [x] 로그인 완료 후 `/`, `/p32`, `/p40`, `/pAI` 정상 접근 가능 확인
- [x] 다크모드 토글 정상 동작 확인
- [x] 기존 Navbar 메뉴(P32, P40, pAI) 링크 정상 동작 확인

**2. 신규 피처 플로우 검증**
- [x] 미인증 상태에서 `/` 접근 → `/login` 리디렉션 확인
- [x] `@gmail.com` 이메일 입력 → 에러 메시지 표시, 메일 미발송 확인
- [x] 신규 유저: `@storytaco.com` 이메일 입력 → Magic Link 이메일 수신 확인
- [x] Magic Link 클릭 → PIN 설정 화면 표시
- [x] PIN 설정 완료 → `/` 리디렉션 + Navbar에 이메일 표시 확인
- [x] 재방문 유저: 이메일 입력 → PIN 입력 화면 분기 확인
- [x] 올바른 PIN 입력 → 로그인 성공 확인
- [x] 잘못된 PIN 입력 → 에러 메시지 표시 확인
- [x] 로그인 후 `/login` 접근 → `/` 리디렉션 확인
- [x] 로그아웃 버튼 클릭 → `/login` 이동 + 재접근 시 게이트 동작 확인
- [x] 만료된 Magic Link 클릭 → `/login?error=expired` 리디렉션 확인

---

## 데이터 흐름 및 테이블 명세

### 신규 유저 로그인 플로우 (Magic Link + PIN 설정)

```
[브라우저] 이메일 입력
    → POST /api/auth/check-user (RPC: check_user_login_status)
    → { exists: false, hasPin: false }
    → POST supabase.auth.signInWithOtp()
    → [Supabase] 이메일 발송 + auth.users에 임시 등록
    → [사용자] 메일함에서 Magic Link 클릭
    → GET /auth/callback?code=xxx
    → [서버] exchangeCodeForSession(code)
    → [Supabase] auth.users 확정 등록 + 세션 쿠키 발급
    → user_pins 없음 확인 → redirect('/login?setup=pin')
    → [브라우저] PIN 입력
    → POST /api/auth/set-pin (서버 세션에서 user.id 조회, HMAC-SHA256 해싱)
    → user_pins.upsert({ user_id, pin_hash })
    → redirect('/')
```

### 재방문 유저 로그인 플로우 (PIN)

```
[브라우저] 이메일 입력
    → POST /api/auth/check-user (RPC: check_user_login_status)
    → { exists: true, hasPin: true }
    → PIN 입력 화면 표시
    → POST /api/auth/verify-pin
    → RPC get_user_id_by_email(email) → userId
    → HMAC-SHA256(key=userId, data=pin) 해시 계산
    → user_pins.select(pin_hash).eq(user_id, userId) 비교
    → 일치: admin.generateLink({ type: 'magiclink', email })
    → { hashed_token } 반환
    → [브라우저] supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
    → 세션 생성 → redirect('/')
```

### 테이블 명세

**public.user_pins**
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | `uuid PK` | `auth.users.id` 참조, ON DELETE CASCADE |
| `pin_hash` | `text` | HMAC-SHA256(key=user_id, data=pin) 헥스 문자열 |
| `created_at` | `timestamptz` | 최초 PIN 설정 시각 |
| `updated_at` | `timestamptz` | PIN 변경 시각 |

---

## API 명세

### GET `/auth/callback`

- **Description**: Magic Link 클릭 후 Supabase가 리디렉션하는 콜백 엔드포인트
- **Permission**: 없음 (공개 엔드포인트)
- **Query Params**: `code` (string) — Supabase 발급 인증 코드
- **Response**: `302 redirect /login?setup=pin` (PIN 미설정) / `302 redirect /` (PIN 설정 완료) / `302 redirect /login?error=expired` (실패)

### POST `/api/auth/check-user`

- **Description**: 이메일로 유저 존재 여부 및 PIN 설정 여부 확인
- **Permission**: 없음 (공개 엔드포인트 — proxy 매처에서 제외)
- **Request Body**: `{ email: string }`
- **Response (200)**: `{ exists: boolean, hasPin: boolean }`
- **Response (400)**: `{ error: 'Invalid email' }`
- **Response (500)**: `{ error: 'Server error' }`

### POST `/api/auth/verify-pin`

- **Description**: 이메일 + PIN 검증 후 세션 토큰 반환
- **Permission**: 없음 (공개 엔드포인트 — proxy 매처에서 제외)
- **Request Body**: `{ email: string, pin: string }`
- **Response (200)**: `{ success: true, email: string, token: string }` (token = hashed_token)
- **Response (400)**: `{ error: 'Invalid input' }`
- **Response (401)**: `{ error: 'PIN이 올바르지 않습니다' }`
- **Response (404)**: `{ error: '등록되지 않은 이메일입니다' }`
- **Response (500)**: `{ error: 'Failed to create session' }`

### POST `/api/auth/set-pin`

- **Description**: Magic Link 로그인 완료 후 PIN 최초 저장
- **Permission**: 인증 필요 (서버 세션 쿠키)
- **Request Body**: `{ pin: string }`
- **Response (200)**: `{ success: true }`
- **Response (400)**: `{ error: '4자리 숫자를 입력해주세요' }`
- **Response (401)**: `{ error: 'Unauthorized' }`
- **Response (500)**: `{ error: 'Failed to save PIN' }`

---

## Risk & Rollback

**리스크 1: Proxy 미들웨어 무한 루프**
- **발생 조건**: `/login` 자체가 미들웨어에 잡혀 루프 발생
- **방지**: matcher에서 `api/auth`, `/auth/callback` 명시적 제외
- **롤백**: `proxy.ts` 파일 삭제 시 즉시 해제됨

**리스크 2: Supabase 리디렉션 URL 미설정**
- **발생 조건**: Magic Link가 localhost만 허용된 상태에서 프로덕션 배포
- **방지**: 배포 전 Supabase 대시보드 Site URL + Redirect URL 등록 필수
- **롤백**: 대시보드에서 URL 추가 (코드 변경 불필요)

**리스크 3: SUPABASE_SERVICE_ROLE_KEY 환경변수 미등록**
- **발생 조건**: Vercel에 service_role 키 미등록 시 Admin 클라이언트 생성 실패 → 500 에러
- **방지**: 배포 전 Vercel 프로젝트 환경변수 등록 체크리스트화
- **롤백**: Vercel 환경변수 등록 후 Redeploy

**리스크 4: PIN 분실**
- **발생 조건**: 유저가 PIN을 잊어버림
- **대응**: 신규 유저 플로우(Magic Link)를 다시 실행하면 PIN 재설정 가능 (`set-pin` upsert 방식)

**리스크 5: Magic Link 발송 Rate Limit**
- **발생 조건**: 같은 이메일로 단시간 내 반복 요청 시 Supabase 429 에러 (Free 플랜: 시간당 2회/이메일)
- **방지**: `signInWithOtp` 에러 응답에서 429 상태 감지 → "잠시 후 다시 시도해주세요" 메시지 표시

**관찰 포인트**
- Supabase 대시보드 > Authentication > Users: 사용자 등록 여부 확인
- Supabase 대시보드 > Authentication > Logs: Magic Link 발송/인증 성공 여부 확인
- Supabase 대시보드 > Table Editor > user_pins: PIN 저장 여부 확인
