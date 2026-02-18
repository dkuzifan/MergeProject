---
title: storytaco.com 계정 로그인
date: 2026-02-18
owner: @merge-team
status: implemented
---

## Context

머지팀 작업실(MergeProject)은 현재 누구나 접근 가능한 공개 도구 모음이다. 향후 팀 전용 툴(스트링 체크, 데이터 분석, 상품 가치 계산 등)이 추가될 예정이며, 이를 스토리타코 팀원(@storytaco.com)만 사용할 수 있도록 접근 제어가 필요하다.

**첫 로그인**은 비밀번호 없는 이메일 인증 방식(Magic Link)을 채택한다. 이는 비밀번호 관리 부담 없이 간단하게 팀원 인증을 구현할 수 있으며, Supabase Auth가 이미 프로젝트에 설치되어 있어 추가 인프라 비용이 없다.

**재방문 로그인**은 4자리 PIN 인증을 채택한다. Magic Link는 매번 메일함을 확인해야 하는 불편함이 있어, 첫 로그인 시 PIN을 설정하고 이후부터는 이메일 + PIN으로 빠르게 로그인한다.

**제약사항:**
- 도메인 제한: `@storytaco.com` 이메일만 허용
- 첫 로그인: Magic Link (Passwordless)
- 재방문 로그인: 이메일 + 4자리 PIN
- 인증 기술: Supabase Auth (이미 설치됨, 추가 인프라 불필요)

## Goals / Non-Goals

**Goals (목표):**
- 전체 사이트(모든 페이지) 접근에 로그인 필요 — 미인증 시 어느 경로로 접근해도 로그인 페이지로 리디렉션
- `@storytaco.com` 이메일만 허용, 타 도메인 차단
- 첫 로그인: Magic Link 방식으로 비밀번호 없이 이메일로 인증, 세션 생성 및 Supabase Auth에 사용자 등록
- 첫 로그인 완료 후 4자리 PIN 설정 → Supabase `user_pins` 테이블에 저장
- 재방문 로그인: 이메일 입력 → PIN 입력 → 즉시 로그인 (Magic Link 불필요)
- Magic Link 클릭 후 원래 접근하려던 페이지(또는 `/`)로 리디렉션
- 로그아웃: Navbar에서 세션 종료 후 `/login`으로 이동

**Non-Goals (비목표):**
- Google/GitHub 등 소셜 로그인 미지원
- 관리자 기능(사용자 목록 관리, 권한 등급) 미구현
- PIN 분실 시 셀프 복구 기능 미구현 (Magic Link 재발급으로 대체)
- 이메일 도메인 외 추가 승인 프로세스 없음

## Success Definition

- `@storytaco.com` 이메일 입력 → 메일에서 인증 버튼 클릭 → PIN 설정 → 작업실 접근까지 완료 가능
- 재방문 시 이메일 + PIN 입력만으로 로그인 가능 (Magic Link 불필요)
- 다른 도메인 이메일 입력 시 로그인 차단 (에러 메시지 표시)
- 첫 로그인 후 Supabase Auth에 사용자 계정이 저장되고, `user_pins`에 PIN 해시가 저장됨
- 어느 페이지로 접근해도 미인증 시 로그인 페이지로 리디렉션
- 로그아웃 기능 동작

## Requirements

**Must-have (필수):**
- [x] **로그인 페이지** (`/login`): 이메일 입력 폼 — 신규 유저 / 재방문 유저 자동 분기
- [x] **도메인 검증**: `@storytaco.com` 이외 이메일 입력 시 폼 레벨에서 에러 메시지 표시 후 발송 차단
- [x] **Magic Link 인증 (첫 로그인)**: Supabase Auth OTP(magiclink) 방식으로 이메일 발송, 클릭 시 세션 생성 및 Supabase Auth에 사용자 등록
- [x] **PIN 설정 (첫 로그인 완료 후)**: Magic Link 인증 직후 4자리 PIN 설정 화면 표시, PIN을 HMAC-SHA256으로 해싱 후 `user_pins` 테이블에 저장
- [x] **PIN 로그인 (재방문)**: 이메일 입력 시 `user_pins` 존재 여부 확인 → PIN 입력 화면으로 분기 → PIN 검증 후 세션 생성
- [x] **전체 페이지 인증 게이트**: Next.js Proxy(Middleware)로 미인증 사용자의 모든 경로 접근을 `/login`으로 리디렉션 (`/login`, `/api/auth/*`, `/auth/callback` 제외)
- [x] **로그아웃**: Navbar에 로그아웃 버튼 추가, 클릭 시 Supabase 세션 종료 후 `/login`으로 이동
- [x] **발송 완료 안내**: Magic Link 발송 성공 시 "이메일을 확인해주세요" 안내 상태로 UI 전환
- [x] **Navbar 사용자 표시**: 로그인된 사용자 이메일 표시 (공용 환경에서 현재 계정 식별)

**Nice-to-have (선택):**
- [ ] **원래 경로 복원**: 미인증 접근 시 `?returnTo=/원래경로` 파라미터를 저장하고, 로그인 완료 후 해당 경로로 리디렉션
- [x] **이미 로그인 상태에서 `/login` 접근 시** `/`로 자동 리디렉션
- [x] **Magic Link 재발송**: 발송 완료 안내 화면에서 "다시 보내기" 버튼 제공

## UX Acceptance Criteria

**로그인 페이지 (`/login`) — 이메일 입력**
- 화면 중앙에 로고 + 이메일 입력 폼 + 발송 버튼이 표시된다 (서브문구: "타코메일로 로그인해주세요")
- 이메일 미입력 상태에서 버튼은 비활성(disabled) 상태
- `@storytaco.com` 이외 도메인 입력 후 발송 시 → 에러 메시지 표시, 이메일 발송 없음
- 올바른 이메일 입력 후 제출 시 → "확인 중" 스피너 → 신규/재방문 분기

**PIN 입력 화면 (재방문 유저)**
- 이메일 표시 + PIN 4자리 입력 폼
- PIN 4자리 미만일 때 버튼 비활성
- 잘못된 PIN 입력 시 에러 메시지 표시, PIN 초기화
- "← 이메일 다시 입력" 링크 제공

**발송 완료 안내 화면 (신규 유저)**
- "이메일을 보냈습니다" 메시지 + 입력한 이메일 주소 표시
- "메일함에서 인증 버튼을 눌러주세요" 안내 문구
- "다시 보내기" 링크 제공

**PIN 설정 화면 (Magic Link 인증 완료 직후)**
- 4자리 PIN 입력 폼 + "PIN 설정 완료" 버튼
- PIN 4자리 미만일 때 버튼 비활성
- PIN 설정 완료 후 `/`로 리디렉션

**인증 완료 후**
- Navbar 우측에 로그인된 이메일 표시 + 로그아웃 버튼 표시

**인증 게이트**
- 미인증 상태에서 어느 경로 접근해도 `/login`으로 리디렉션
- `/login` 페이지에는 Navbar 미표시 (AppShell이 경로별 Navbar 표시 여부 제어)

**로그아웃**
- 로그아웃 버튼 클릭 시 Supabase 세션 종료 → `/login`으로 이동

**에러 케이스**
- 만료되거나 이미 사용된 Magic Link 클릭 시 → `/login`으로 리디렉션 + "링크가 만료되었습니다. 다시 시도해주세요" 안내

## User Flows

```mermaid
flowchart TD
    A([사이트 접근]) --> B{세션 유효?}
    B -- Yes --> C[요청 페이지 표시]
    B -- No --> D[/login 리디렉션]

    D --> E[이메일 입력]
    E --> F{@storytaco.com?}
    F -- No --> G[에러 메시지 표시]
    G --> E
    F -- Yes --> H{user_pins 존재?}

    H -- Yes / 재방문 --> I[PIN 입력 화면]
    I --> J{PIN 일치?}
    J -- No --> K[에러 표시]
    K --> I
    J -- Yes --> L[세션 생성]
    L --> C

    H -- No / 신규 --> M[Magic Link 발송]
    M --> N[발송 완료 안내 화면]
    N --> O[메일함에서 인증 버튼 클릭]
    O --> P[Supabase 콜백 처리]
    P --> Q[세션 생성 + 사용자 등록]
    Q --> R[PIN 설정 화면]
    R --> S[PIN 저장 → user_pins]
    S --> C

    C --> T{로그아웃 클릭?}
    T -- Yes --> U[세션 종료]
    U --> D
```

## Wireframes

- HTML 목업 파일: 구현 완료 후 삭제됨
