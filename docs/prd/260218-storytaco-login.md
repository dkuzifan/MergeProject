---
title: storytaco.com 계정 로그인
date: 2026-02-18
owner: @merge-team
status: draft
---

## Context

머지팀 작업실(MergeProject)은 현재 누구나 접근 가능한 공개 도구 모음이다. 향후 팀 전용 툴(스트링 체크, 데이터 분석, 상품 가치 계산 등)이 추가될 예정이며, 이를 스토리타코 팀원(@storytaco.com)만 사용할 수 있도록 접근 제어가 필요하다.

비밀번호 없는 이메일 인증 방식(Magic Link)을 채택한다. 이는 비밀번호 관리 부담 없이 간단하게 팀원 인증을 구현할 수 있으며, Supabase Auth가 이미 프로젝트에 설치되어 있어 추가 인프라 비용이 없다.

**제약사항:**
- 도메인 제한: `@storytaco.com` 이메일만 허용
- 비밀번호 없는 인증 (Passwordless / Magic Link)
- 첫 로그인 후 세션 유지 (재방문 시 자동 로그인)
- 인증 기술: Supabase Auth (이미 설치됨, 추가 인프라 불필요)

## Goals / Non-Goals

**Goals (목표):**
- 전체 사이트(모든 페이지) 접근에 로그인 필요 — 미인증 시 어느 경로로 접근해도 로그인 페이지로 리디렉션
- `@storytaco.com` 이메일만 허용, 타 도메인 차단
- Magic Link 방식으로 비밀번호 없이 이메일로 인증 (첫 로그인)
- 첫 로그인 시 Supabase Auth에 사용자 계정 등록 및 저장
- 로그인 완료 후 Supabase 세션 유지 → 재방문 시 자동 로그인 (세션 만료 전까지)
- Magic Link 클릭 후 원래 접근하려던 페이지(또는 `/`)로 리디렉션

**Non-Goals (비목표):**
- Google/GitHub 등 소셜 로그인 미지원
- 관리자 기능(사용자 목록 관리, 권한 등급) 미구현
- 비밀번호 기반 로그인 미지원
- 이메일 도메인 외 추가 승인 프로세스 없음

## Success Definition

- `@storytaco.com` 이메일 입력 → 메일에서 인증 버튼 클릭 → 작업실 접근까지 완료 가능
- 다른 도메인 이메일 입력 시 로그인 차단 (에러 메시지 표시)
- 첫 로그인 후 Supabase Auth에 사용자 계정이 저장됨
- 재방문 시 세션이 유효하면 자동 로그인 (이메일 재입력 불필요)
- 어느 페이지로 접근해도 미인증 시 로그인 페이지로 리디렉션
- 로그아웃 기능 동작

## Requirements

**Must-have (필수):**
- [ ] **로그인 페이지** (`/login`): 이메일 입력 폼 + Magic Link 발송 버튼
- [ ] **도메인 검증**: `@storytaco.com` 이외 이메일 입력 시 폼 레벨에서 에러 메시지 표시 후 발송 차단
- [ ] **Magic Link 인증**: Supabase Auth OTP(magiclink) 방식으로 이메일 발송, 클릭 시 세션 생성 및 Supabase Auth에 사용자 등록
- [ ] **전체 페이지 인증 게이트**: Next.js Middleware로 미인증 사용자의 모든 경로 접근을 `/login`으로 리디렉션 (`/login` 자체와 Supabase callback 경로 제외)
- [ ] **로그아웃**: Navbar에 로그아웃 버튼 추가, 클릭 시 Supabase 세션 종료 후 `/login`으로 이동
- [ ] **발송 완료 안내**: Magic Link 발송 성공 시 "이메일을 확인해주세요" 안내 상태로 UI 전환
- [ ] **Navbar 사용자 표시**: 로그인된 사용자 이메일 표시 (공용 환경에서 현재 계정 식별)

**Nice-to-have (선택):**
- [ ] **원래 경로 복원**: 미인증 접근 시 `?returnTo=/원래경로` 파라미터를 저장하고, 로그인 완료 후 해당 경로로 리디렉션
- [ ] **이미 로그인 상태에서 `/login` 접근 시** `/`로 자동 리디렉션
- [ ] **Magic Link 재발송**: 발송 완료 안내 화면에서 "다시 보내기" 버튼 제공

## UX Acceptance Criteria

**로그인 페이지 (`/login`)**
- 화면 중앙에 로고 + 이메일 입력 폼 + 발송 버튼이 표시된다 (서브문구: "타코메일로 로그인해주세요")
- 이메일 미입력 상태에서 버튼은 비활성(disabled) 상태
- `@storytaco.com` 이외 도메인 입력 후 발송 시 → 폼 아래 "스토리타코 이메일(@storytaco.com)만 로그인 가능합니다" 에러 표시, 이메일 발송 없음
- 올바른 이메일 입력 후 발송 시 → 버튼 로딩 상태 전환 → 발송 완료 안내 화면으로 전환

**발송 완료 안내 화면**
- "이메일을 보냈습니다" 메시지 + 입력한 이메일 주소 표시
- "메일함에서 인증 버튼을 눌러주세요" 안내 문구
- (Nice-to-have) "다시 보내기" 링크 제공

**인증 완료 후**
- Magic Link 클릭 → Supabase 콜백 처리 → `/`(메인 페이지)로 리디렉션
- Navbar 우측에 로그인된 이메일 표시 + 로그아웃 버튼 표시
- ThemeToggle은 로그아웃 버튼 옆에 유지

**인증 게이트**
- 미인증 상태에서 어느 경로 접근해도 `/login`으로 리디렉션
- `/login` 페이지에는 Navbar 미표시 (별도 심플 레이아웃)

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
    F -- Yes --> H[Magic Link 발송]
    H --> I[발송 완료 안내 화면]
    I --> J[메일함에서 인증 버튼 클릭]
    J --> K[Supabase 콜백 처리]
    K --> L[세션 생성 + Supabase 사용자 등록]
    L --> C

    C --> M{로그아웃 클릭?}
    M -- Yes --> N[세션 종료]
    N --> D
```

## Wireframes

- HTML 목업 파일 경로: `docs/mockups/storytaco-login.html`
