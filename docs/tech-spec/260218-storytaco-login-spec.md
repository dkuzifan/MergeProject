---
title: storytaco.com 계정 로그인 - Tech Spec
date: 2026-02-18
prd: docs/prd/260218-storytaco-login.md
status: approved
---

## 의존성 분석 및 기술 설계

- **API**: 신규 Route Handler 1개 (`/auth/callback`) — Magic Link 인증 코드를 세션으로 교환
- **DB**: 변경 없음. Supabase Auth가 `auth.users` 테이블을 자동 관리
- **Domain**: 도메인 검증 로직 (클라이언트 폼 레벨 + 서버 미들웨어 레벨)
- **UI**: 신규 페이지 1개(`/login`), 신규 레이아웃 1개, Navbar 수정
- **Release Strategy**: 단일 PR. 미들웨어가 모든 경로를 게이팅하므로 배포 즉시 전체 사이트에 인증 적용됨. 배포 전 Supabase 대시보드 설정 완료 필수

---

## 프로젝트 호환성 검사

| 항목 | 현황 | 판단 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router | ✅ 적합 |
| Supabase 환경변수 | `.env.local` 이미 설정됨 | ✅ 재사용 |
| `@supabase/supabase-js` | 설치됨 | ✅ 재사용 |
| `@supabase/ssr` | **미설치** | ⚠️ **신규 설치 필요** |
| 기존 Supabase 클라이언트 유틸 | 없음 | 📝 신규 생성 |
| Middleware | 없음 | 📝 신규 생성 |
| 스타일링 | Tailwind CSS | ✅ 목업과 일치 |
| 테스트 프레임워크 | 없음 | ℹ️ 수동 테스트로 대체 |

> **호환성 경고**: Next.js App Router에서 Supabase 세션을 Middleware + 서버 컴포넌트에서 안전하게 읽으려면 `@supabase/ssr` 패키지가 필수입니다. 기존 `@supabase/supabase-js`만으로는 Middleware에서 쿠키 기반 세션 처리가 불가능합니다.

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
| `src/middleware.ts` | 전체 경로 인증 게이트 — 미인증 시 `/login` 리디렉션 |
| `src/app/login/layout.tsx` | 로그인 전용 레이아웃 (Navbar 없음, 심플 배경) |
| `src/app/login/page.tsx` | 로그인 페이지 — 이메일 입력, 도메인 검증, Magic Link 발송, 발송 완료 UI |
| `src/app/auth/callback/route.ts` | Magic Link 콜백 Route Handler — 코드 → 세션 교환 후 `/` 리디렉션 |

### 수정

| 파일 | 변경 내용 |
|---|---|
| `src/components/Navbar.tsx` | 로그인된 사용자 이메일 표시 + 로그아웃 버튼 추가 |

---

## 기술 설계 상세

### 1. Supabase 클라이언트 유틸

```
src/utils/supabase/
  client.ts   → createBrowserClient() 래퍼 (클라이언트 컴포넌트용)
  server.ts   → createServerClient() 래퍼 (서버 컴포넌트용: 쿠키 읽기 전용)
              → Middleware/Route Handler용은 cookies()가 쓰기를 지원하는 컨텍스트에서 직접 생성
```

### 2. Middleware 인증 게이트 (`src/middleware.ts`)

- 모든 요청에서 Supabase 세션 쿠키를 확인
- 미인증 + `/login` 이외 경로 → `/login` 리디렉션
- 인증됨 + `/login` 접근 → `/` 리디렉션 (Nice-to-have)
- `/auth/callback`, `/_next/*`, `/favicon.ico` 제외 (matcher 설정)
- 세션 갱신(refresh) 처리 포함 — 만료 직전 토큰 자동 갱신

```
matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
```

### 3. 로그인 페이지 (`src/app/login/page.tsx`)

클라이언트 컴포넌트. 상태 3단계:
- `idle`: 이메일 입력 폼
- `loading`: 발송 중 (버튼 스피너)
- `sent`: 발송 완료 안내 화면

도메인 검증: 폼 제출 시 `email.endsWith('@storytaco.com')` 체크 → 실패 시 Supabase 호출 없이 에러 표시

Magic Link 발송:
```typescript
supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${origin}/auth/callback` }
})
```

### 4. 콜백 Route Handler (`src/app/auth/callback/route.ts`)

```
GET /auth/callback?code=xxx
  → exchangeCodeForSession(code)
  → redirect('/')
  → (실패 시) redirect('/login?error=expired')
```

### 5. Navbar 수정

- `createBrowserClient()`로 세션 구독 (`onAuthStateChange`)
- 로그인 상태: 이메일(최대 24자 truncate) + 로그아웃 버튼 표시
- 로그아웃: `supabase.auth.signOut()` → `router.push('/login')`

### 6. Supabase 대시보드 설정 (배포 전 필수)

- Authentication > Email > Enable Magic Link: ON
- Authentication > URL Configuration > Redirect URLs: `http://localhost:3000/auth/callback`, `https://{production-domain}/auth/callback`
- (선택) Authentication > Email > Confirm email: OFF (Magic Link만 사용하므로)

---

## Plan (Implementation Checklist)

> **의존성 순서**: Phase 1 완료 후 → Phase 2, 3, 4 순차 진행 → Phase 5 검증

**Phase 1: 기반 세팅** ← 모든 Phase가 의존하는 선행 작업
- [ ] `npm install @supabase/ssr` 패키지 설치
- [ ] `src/utils/supabase/client.ts` 생성
  - `createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)` 래퍼 함수
- [ ] `src/utils/supabase/server.ts` 생성
  - `createServerClient()` + `next/headers`의 `cookies()` 연동 래퍼 함수

**Phase 2: 인증 게이트** ← Phase 1 완료 후
- [ ] `src/middleware.ts` 생성
  - 모든 요청에서 `getUser()` 세션 체크
  - 미인증 → `/login` 리디렉션 (단, `/login`, `/auth/callback` 경로는 통과)
  - 인증됨 + `/login` 접근 → `/` 리디렉션
  - 세션 쿠키 자동 갱신(refresh) 처리
- [ ] `src/app/auth/callback/route.ts` 생성
  - `?code` 파라미터로 `exchangeCodeForSession()` 호출
  - 성공 → `redirect('/')`
  - 실패 → `redirect('/login?error=expired')`

**Phase 3: 로그인 UI** ← Phase 1 완료 후
- [ ] `src/app/login/layout.tsx` 생성
  - Navbar, Footer 없는 풀스크린 레이아웃 (그라데이션 배경)
- [ ] `src/app/login/page.tsx` 생성 (`'use client'`)
  - 상태 관리: `idle` → `loading` → `sent` / `error`
  - `@storytaco.com` 도메인 검증 (클라이언트 레벨)
  - `signInWithOtp({ email, options: { emailRedirectTo: '/auth/callback' } })`
  - 발송 완료 안내 UI (이메일 표시 + "다시 보내기" 링크)
  - `/login?error=expired` 쿼리 파라미터 감지 → 에러 배너 표시

**Phase 4: Navbar 연동** ← Phase 1 완료 후
- [ ] `src/components/Navbar.tsx` 수정
  - `createBrowserClient()` 로 세션 초기 조회 (`useEffect` + `getUser()`)
  - `onAuthStateChange` 구독으로 실시간 상태 동기화
  - 로그인 상태: 이메일(24자 초과 시 `…` truncate) + 로그아웃 버튼 표시
  - 로그아웃: `signOut()` → `router.push('/login')`

**Phase 5: 검증**
- [ ] `npm run build` — 빌드 에러 없음 확인
- [ ] `npm run lint` — 린트 에러 없음 확인
- [ ] 수동 테스트 전 체크: Supabase 대시보드 Magic Link ON, Redirect URL 등록 확인
- [ ] 수동 시나리오 테스트 (아래 테스트 계획 참고)

**코드 주석 가이드** (각 파일 상단에 포함)
- `middleware.ts`: 역할(전체 경로 인증 게이트), 제외 경로 이유 명시
- `utils/supabase/client.ts`: 브라우저 전용임을 명시 (서버 컴포넌트에서 import 금지)
- `utils/supabase/server.ts`: 서버 컴포넌트/Route Handler 전용임을 명시
- `auth/callback/route.ts`: Magic Link 콜백 처리 흐름 명시

---

## 테스트 계획

- **목표**: 기존 페이지가 깨지지 않고, 인증 게이트와 로그인 플로우가 기획 의도대로 동작하는 것을 수동으로 검증합니다.

**1. 핵심 기본 플로우 검증 (Regression)**
- [ ] 로그인 완료 후 `/`, `/p32`, `/p40`, `/pAI` 정상 접근 가능 확인
- [ ] 다크모드 토글 정상 동작 확인
- [ ] 기존 Navbar 메뉴(P32, P40, pAI) 링크 정상 동작 확인

**2. 신규 피처 플로우 검증**
- [ ] 미인증 상태에서 `/` 접근 → `/login` 리디렉션 확인
- [ ] 미인증 상태에서 `/p32` 접근 → `/login` 리디렉션 확인
- [ ] `@gmail.com` 이메일 입력 → 에러 메시지 표시, 메일 미발송 확인
- [ ] `@storytaco.com` 이메일 입력 → Magic Link 이메일 수신 확인
- [ ] Magic Link 클릭 → `/` 리디렉션 + Navbar에 이메일 표시 확인
- [ ] 로그인 후 `/login` 접근 → `/` 리디렉션 확인
- [ ] 로그아웃 버튼 클릭 → `/login` 이동 + 재접근 시 게이트 동작 확인
- [ ] 만료된/잘못된 Magic Link 클릭 → `/login?error=expired` 리디렉션 확인

---

## 데이터 흐름 및 테이블 명세

### Magic Link 로그인 플로우

```
[브라우저] 이메일 입력
    → POST supabase.auth.signInWithOtp()
    → [Supabase] 이메일 발송 + auth.users에 임시 등록
    → [사용자] 메일함에서 Magic Link 클릭
    → GET /auth/callback?code=xxx
    → [서버] exchangeCodeForSession(code)
    → [Supabase] auth.users 확정 등록 + 세션 쿠키 발급
    → redirect('/')
```

**auth.users** (Supabase 자동 관리, 직접 쿼리 없음)
- Write: 첫 로그인 시 `email`, `last_sign_in_at` 자동 기록

### 세션 갱신 플로우

```
[모든 요청] Middleware 실행
    → createServerClient (쿠키 읽기)
    → supabase.auth.getUser()
    → 세션 유효: 통과 / 만료: /login 리디렉션
    → 세션 갱신 필요 시: 쿠키 자동 업데이트
```

---

## API 명세

### GET `/auth/callback`

- **Description**: Magic Link 클릭 후 Supabase가 리디렉션하는 콜백 엔드포인트. `code` 파라미터를 세션으로 교환
- **Permission**: 없음 (공개 엔드포인트)
- **Query Params**: `code` (string, optional) — Supabase 발급 인증 코드
- **Response (성공)**: `302 redirect /`
- **Response (code 없음 / 만료 / 재사용)**: `302 redirect /login?error=expired`

---

## Risk & Rollback

**리스크 1: 미들웨어 무한 루프**
- **발생 조건**: `/login` 자체가 미들웨어에 잡혀 루프 발생
- **방지**: matcher 또는 조건에서 `/login`, `/auth/callback` 명시적 제외
- **롤백**: `middleware.ts` 파일 삭제 시 즉시 해제됨

**리스크 2: Supabase 리디렉션 URL 미설정**
- **발생 조건**: Magic Link가 localhost만 허용된 상태에서 프로덕션 배포
- **방지**: 배포 전 Supabase 대시보드 Redirect URL 등록 필수 체크리스트화
- **롤백**: 대시보드에서 URL 추가 (코드 변경 불필요)

**리스크 3: 배포 직후 기존 방문자 세션 없음**
- **발생 조건**: 배포 전 방문자가 세션 없이 새로고침 시 `/login`으로 튕김
- **발생 조건**: 최초 배포이므로 기존 세션 자체가 없음 — 모든 사용자가 재로그인 필요
- **대응**: 팀 내 공지 후 배포

**리스크 4: Magic Link 발송 Rate Limit**
- **발생 조건**: 같은 이메일로 단시간 내 반복 요청 시 Supabase 429 에러 반환 (Free 플랜 기본값: 시간당 2회/이메일)
- **방지**: `signInWithOtp` 에러 응답에서 429 상태를 감지 → "잠시 후 다시 시도해주세요" 메시지 표시
- **롤백**: 코드 레벨 처리이므로 별도 롤백 불필요

**관찰 포인트**
- Supabase 대시보드 > Authentication > Users: 사용자 등록 여부 확인
- Supabase 대시보드 > Authentication > Logs: Magic Link 발송/인증 성공 여부 확인
