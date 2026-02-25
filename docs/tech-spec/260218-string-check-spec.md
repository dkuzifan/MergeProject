---
title: 스트링 체크 - Tech Spec
date: 2026-02-18
prd: docs/prd/260218-string-check.md
status: implemented
---

## 의존성 분석 및 기술 설계 (Dependency Analysis & Technical Design)

### 프로젝트 호환성 검사

| 항목 | 현황 | 스트링 체크 적용 |
|------|------|------|
| 프레임워크 | Next.js 16.1.6 + React 19.2 (App Router) | ✅ 동일 패턴 사용 |
| 스타일링 | Tailwind CSS + dark mode | ✅ 동일 패턴 사용 |
| 인증 게이트 | `src/proxy.ts` — 미인증 시 `/login` 리디렉션 | ✅ `/string-check` 자동 보호 |
| 상태 관리 | 페이지 내 useState (외부 라이브러리 없음) | ✅ 동일 패턴 사용 |
| DB 사용 | Supabase | ⛔ 이 기능은 DB 사용 없음 (브라우저 내 처리) |
| xlsx | ❌ 미설치 → 설치 완료 | ✅ `xlsx` (SheetJS) |
| 언어 감지 | ❌ 미설치 | ✅ Gemini API (`/api/string-check/lang-check`) |
| 번역 | - | ⛔ 제거됨 — 검사 전용으로 범위 축소 |

### API

- **`POST /api/string-check/lang-check`** (신규, 사용 중)
  - 파싱 완료 후 자동 호출되는 Gemini AI 언어 검사 프록시 라우트
  - 클라이언트가 40행 단위(BATCH_SIZE)로 배치 전송 → 서버가 Gemini API 호출 → 언어 오류 목록 반환
  - 빈 셀·공용 외래어 셀은 사전에 제외하고 전송 (불필요한 API 호출 방지)
  - 모델 폴백: `gemini-3-pro-preview` → 503 시 `gemini-2.5-pro`
  - 클라이언트에 API 키 노출 없음

- **`POST /api/string-check/translate`** (기존, 현재 UI 미사용)
  - Gemini 기반 번역 API 라우트. 코드는 유지되어 있으나 현재 페이지 UI에서 호출하지 않음.
  - 번역 기능이 이번 범위에서 제외된 상태.

- **기존 API 변경 없음** (auth API 등 그대로)

### DB

- **변경 없음** — 데이터는 브라우저 메모리에서만 처리
- 업로드된 xlsx 파일, 파싱 결과, 편집 내용 모두 클라이언트 state에만 존재
- 서버 저장 없음 → 세션 종료 시 데이터 소멸

### Domain (핵심 로직)

두 가지 모듈로 분리:

1. **xlsx 파싱** (UploadScreen 내 처리): SheetJS `read()` → 전체 시트 순회 → 유효한 시트(4행~, A~K 11컬럼)만 파싱 → `SheetData[]` 반환
2. **오류/경고 감지** (`lib/detectIssues.ts`): 행·셀 단위 순회
   - 공용 외래어 감지: 9개 비한국어 언어 중 4개 이상 동일 표현 → `warning: 'loanword'`
   - 빈 셀 감지 → `error: 'empty'`
   - ⚠️ 언어 오류(`wrong-lang`)는 detectIssues에서 처리하지 않음 — Gemini API(`lang-check`) 가 담당

### UI

- **신규 페이지**: `src/app/string-check/page.tsx`
  - `'use client'` 컴포넌트 (파일 파싱, 상태 관리 모두 클라이언트)
  - 기존 `AppShell` 내에 포함 → Navbar 자동 표시
  - 상태: `phase`, `sheets: SheetData[]`, `activeSheetName`, `fileName`, `isChecking`, `checkProgress`, `checkError`
  - 업로드 완료 즉시 `runLangCheck()` 호출 → 40행 배치로 `/api/string-check/lang-check` 순차 호출
  - 시트 탭 UI: 탭 클릭 → activeSheetName 변경 → SummaryPanel/StringTable 자동 갱신
  - 표는 **읽기 전용** (인라인 편집, 번역, 다운로드 기능 없음)

- **신규 컴포넌트** (`src/app/string-check/components/`):
  - `UploadScreen.tsx` — 드래그&드롭 업로드 UI, 전체 시트 파싱 후 유효 시트만 전달
  - `SummaryPanel.tsx` — 오류/경고 요약 패널 (행 그룹 + index 스크롤)
  - `StringTable.tsx` — 11컬럼 표 (sticky 인덱스, 하이라이트, 툴팁, 읽기 전용)

- **신규 유틸** (`src/app/string-check/lib/`):
  - `detectIssues.ts` — 클라이언트 사이드 빈 셀·공용 외래어 감지

- **타입** (`src/app/string-check/types.ts`):
  - `SheetData`, `StringRow`, `CellIssue`, `LANG_MAP` (tinyld 필드 없음, `col·name·google` 3개 필드)

- **홈 페이지** (`src/app/page.tsx`): 스트링 체크 도구 카드 추가 (기존 도구 목록에 추가)

### Release Strategy

- DB 변경 없음 → 배포 즉시 롤백 가능
- Gemini API 키는 Vercel 환경 변수(`GEMINI_API_KEY`)에만 저장
- `/string-check` 라우트는 인증 게이트로 자동 보호 (proxy.ts)
- 기존 기능에 영향 없음 → 독립 배포 가능

---

## 설치 패키지

```bash
npm install xlsx
```

| 패키지 | 용도 | 비고 |
|--------|------|------|
| `xlsx` (SheetJS) | xlsx 파일 파싱·생성 | MIT 라이선스, 브라우저·Node 모두 지원 |

> **tinyld 미사용**: 초기에는 tinyld(통계 기반 언어 감지)를 검토했으나, 짧은 게임 UI 문자열에서의 오탐률이 높고 게임 용어·외래어 예외 처리가 어려워 Gemini AI 기반 검사로 전환.

---

## 신규/수정 파일 목록

```
신규:
  src/app/string-check/
    page.tsx                         # 메인 페이지 (client component)
    types.ts                         # SheetData, StringRow, CellIssue, LANG_MAP
    lib/
      detectIssues.ts                # 빈 셀·공용 외래어 클라이언트 감지
    components/
      UploadScreen.tsx               # 업로드 화면
      SummaryPanel.tsx               # 오류/경고 요약 패널
      StringTable.tsx                # 스트링 표 (읽기 전용)
  src/app/api/string-check/
    lang-check/route.ts              # Gemini AI 언어 검사 프록시 (사용 중)
    translate/route.ts               # Gemini 번역 프록시 (코드 유지, UI 미사용)

수정:
  src/app/page.tsx                   # 홈에 스트링 체크 카드 추가
  .env.local                         # GEMINI_API_KEY 추가
  package.json                       # xlsx 추가
```

---

## Plan (Implementation Checklist)

**P1: 환경 설정**
- [x] Google AI Studio에서 Gemini API 키 발급
- [x] `GEMINI_API_KEY`를 `.env.local`과 Vercel 환경 변수에 등록
- [x] `xlsx` 패키지 설치 (`npm install xlsx`)
- [x] `src/app/string-check/page.tsx` 빈 shell 생성, `src/app/page.tsx`에 도구 카드 추가

**P2: xlsx 파싱 및 표 렌더링**
- [x] `UploadScreen`: 드래그&드롭 + 파일 선택, xlsx 포맷 검증 (확장자 + 파싱 시도)
- [x] SheetJS `read()`로 파일 파싱 — 4행(index 3)~부터 데이터 추출, A~K 컬럼 매핑
- [x] 파싱 실패(구조 불일치) 시 업로드 화면에 오류 메시지 표시
- [x] `StringTable`: 인덱스 + 10개 언어 컬럼, sticky 인덱스 열, 가로 스크롤
- [x] 파싱 완료 → 결과 화면 전환, 시트 탭 렌더링

**P3: 클라이언트 오류·경고 감지**
- [x] `detectIssues()` 함수 구현 — 공용 외래어(loanword) 우선, 빈 셀 감지
- [x] 빈 셀 → 레드 링 테두리
- [x] 공용 외래어 셀 → 옐로 배경 + 툴팁 ("공용 외래어 추정")
- [x] `SummaryPanel`: 오류/경고 그룹, index 클릭→해당 행 스크롤

**P4: Gemini AI 언어 검사 연동**
- [x] `/api/string-check/lang-check` Route Handler 구현
  - Supabase 세션 검증 (미인증 시 401)
  - 40행 배치 단위 수신, Gemini API 호출 (gemini-3-pro-preview → gemini-2.5-pro 폴백)
  - `{"issues": [...]}` JSON 반환
- [x] 클라이언트: 업로드 완료 즉시 `runLangCheck()` 자동 실행
  - 빈 셀·외래어 셀 사전 제외 후 배치 전송
  - 진행 배너 (파란 스피너 + N/전체행)
  - 오류 시 빨간 배너 표시
- [x] 언어 오류 셀 → 레드 배경 + 툴팁 ("언어 오류 (감지: OO)")
  - loanword 경고 셀은 wrong-lang으로 덮어쓰지 않음

---

## 테스트 계획 (Test Plan)

> 프로젝트에 테스트 프레임워크 없음 → 수동 시나리오 테스트로 진행.

### 1. 핵심 기본 플로우 검증 (Regression)

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| R1 | 미인증 접근 차단 | 로그아웃 상태에서 `/string-check` 직접 입력 | `/login`으로 리디렉션 |
| R2 | 기존 페이지 정상 동작 | `/`, `/p32` 접근 | 페이지 정상 렌더링, 오류 없음 |

### 2. 신규 피처 플로우 검증

**업로드**

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| U1 | 정상 업로드 | 1000행 string.xlsx 드래그&드롭 | 3초 이내 표 렌더링 완료, AI 검사 자동 시작 |
| U2 | 포맷 오류 | `.csv` 파일 업로드 | "xlsx 파일만 지원합니다" 오류 메시지, 화면 유지 |
| U3 | 구조 불일치 | 4행 미만이거나 11컬럼 미만인 xlsx | "파일 구조가 올바르지 않습니다" 오류 메시지 |

**오류·경고 감지**

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| D1 | 빈 셀 | 영어 컬럼이 비어있는 행 | 해당 셀 레드 링, 요약 패널에 해당 행 표시 |
| D2 | 언어 오류 (AI) | 일본어 컬럼에 한국어 텍스트 입력 | AI 검사 완료 후 해당 셀 레드 배경, 툴팁 "언어 오류 (감지: 한국어)" |
| D3 | 공용 외래어 | "Tutorial"이 9개 비한국어 컬럼 중 4개 이상에 동일하게 입력 | 해당 셀 옐로 배경 + 툴팁 "공용 외래어 추정" |
| D4 | 오탐 방지 — 게임 용어 | 영어 컬럼에 "OK", "Level", "Boss" 등 | AI 검사에서 오류 미표시 |
| D5 | 외래어 우선 처리 | loanword 경고 셀이 AI에서도 오류로 감지된 경우 | yellow 경고(loanword) 유지, wrong-lang으로 덮어쓰지 않음 |
| D6 | AI 검사 배너 | 파일 업로드 직후 | 파란 배너 + "AI 언어 검사 중... (N/전체행)" 표시 |
| D7 | AI 검사 오류 | 네트워크 차단 또는 API 키 미설정 | 빨간 배너 + 에러 메시지 + "빈 셀·외래어 검사만 표시됩니다" |
| D8 | 요약 패널 스크롤 | 요약 패널의 index 링크 클릭 | 표에서 해당 행으로 스크롤 |

---

## 데이터 흐름 및 타입 명세

> DB 없음 — 모든 데이터는 클라이언트 React state에만 존재. 서버는 Gemini AI 프록시 역할만 함.

### Flow 1: 파일 업로드 → 파싱 → 클라이언트 감지 → AI 검사

```
[사용자] 파일 드롭 / 선택
    │
    ▼
FileReader.readAsArrayBuffer(file)
    │
    ▼
XLSX.read(buffer, { type: 'array' })  ── 실패 → 업로드 화면에 오류 메시지
    │
    ▼
sheet_to_json(worksheet, { header: 1 })
→ rawRows: string[][]

rawRows[0~2] 버림 (헤더/메타)            ← 1~3행 건너뜀
rawRows[3~] 사용                         ← 4행~이 데이터
    │
    ▼
검증: row[3] 존재 & 컬럼 수 >= 11        ── 실패 → "파일 구조가 올바르지 않습니다"
    │
    ▼
StringRow[] 변환
  index = row[0]  (A열)
  cells = row[1..10]  (B~K열, 10개)
    │
    ▼
detectIssues(rows)                       ← 클라이언트: 공용 외래어 + 빈 셀만
→ 각 StringRow에 issues 채움 (loanword, empty)
    │
    ▼
setState({ fileName, sheets })
→ 결과 화면 렌더링

→ runLangCheck() 자동 호출              ← AI 검사 시작
```

---

### Flow 2: Gemini AI 언어 검사 (runLangCheck)

```
[페이지] 업로드 완료 → runLangCheck(uploadedSheets) 자동 실행
    │
    ▼
모든 시트의 전체 행 수 계산 → setCheckProgress({ done: 0, total })
    │
    ▼ (시트별, 40행 배치 단위 반복)

배치 구성:
  빈 셀(empty) 셀 → 제외 (이미 레드 표시됨)
  loanword 셀 → 제외 (이미 옐로 표시됨)
  남은 비어있지 않은 셀만 → { colIdx, text, lang, langName }
  requestRows가 비면 → 배치 스킵, doneRows += batchSize

    ▼
fetch POST /api/string-check/lang-check
  body: { rows: [{ index, cells: [{colIdx, text, lang, langName}] }] }
    │
    ▼ [서버: lang-check/route.ts]
    │
    ├─ Supabase 세션 검증 실패 → 401
    ├─ rows 비어있음 → { issues: [] } 즉시 반환
    │
    ▼
Gemini API 호출 (gemini-3-pro-preview 1순위, 503 시 gemini-2.5-pro 폴백)
  system prompt: 언어 검증 전문가, 오탐 최소화 규칙 포함
  user prompt: 각 셀의 기대 언어(langName)와 실제 텍스트 전달
  responseMimeType: 'application/json', temperature: 0
    │
    ├─ 성공: { issues: [{ rowIndex, colIdx, detected }] } 반환
    └─ 실패(503 폴백 후 실패, 기타): 502 반환
    │
    ▼ [클라이언트]
    │
    ├─ 성공: 해당 시트 rows에서 rowIndex 매칭 → wrong-lang 이슈 추가
    │        loanword 셀은 덮어쓰지 않음
    ├─ 실패: setCheckError(message) → 빨간 배너 표시, 루프 중단
    │
    ▼
doneRows += batchSize → setCheckProgress 업데이트
→ 다음 배치로 이동

모든 배치 완료 → setIsChecking(false)
```

---

### 핵심 타입

```typescript
// 셀 상태
type CellIssue =
  | { type: 'error'; reason: 'empty' }
  | { type: 'error'; reason: 'wrong-lang'; detected: string }
  | { type: 'warning'; reason: 'loanword'; matchCount: number }

// 파싱된 행
interface StringRow {
  index: string                       // A열 값 (예: "STR_0001")
  cells: string[]                     // B~K 10개 언어 값 (순서 고정)
  issues: Record<number, CellIssue>   // 컬럼 인덱스(0~9) → 이슈
}

// 시트 데이터
interface SheetData {
  name: string
  rows: StringRow[]
}
```

### 언어 코드 매핑

```typescript
// B~K 컬럼 순서, Gemini langName 및 Google Translate 코드 매핑
const LANG_MAP = [
  { col: 'B', name: '한국어',       google: 'ko'    },
  { col: 'C', name: '영어',         google: 'en'    },
  { col: 'D', name: '프랑스어',     google: 'fr'    },
  { col: 'E', name: '일본어',       google: 'ja'    },
  { col: 'F', name: '스페인어',     google: 'es'    },
  { col: 'G', name: '독일어',       google: 'de'    },
  { col: 'H', name: '인도네시아어', google: 'id'    },
  { col: 'I', name: '베트남어',     google: 'vi'    },
  { col: 'J', name: '중국어(번체)', google: 'zh-TW' },
  { col: 'K', name: '러시아어',     google: 'ru'    },
] as const
```

> **tinyld 미사용**: LANG_MAP에서 tinyld ISO 639-1 코드 필드 제거. 언어 감지는 Gemini API가 langName(한국어명) 기준으로 처리.

### 클라이언트 오류 감지 로직 (detectIssues.ts)

```
detectIssues(rows: StringRow[]):
  행 순회:
    // ① 공용 외래어 먼저 판별 (col 1~9, 한국어 제외)
    각 셀(col 1~9)에 대해:
      sameCount = 9개 비한국어 셀 중 cellValue와 동일한 값 개수
      IF sameCount >= 4 (LOANWORD_THRESHOLD)
        → issue: warning/loanword

    // ② 빈 셀 검사 (col 0~9 전체)
    IF cellValue가 비어있음 (공백·줄바꿈 제거 후)
      → issue: error/empty

// ※ wrong-lang은 여기서 처리하지 않음 — Gemini lang-check API가 담당
```

---

## API 명세

### POST `/api/string-check/lang-check`

Gemini AI를 사용해 각 셀의 언어 오류를 검사한다.

- **Permission**: 로그인 세션 필요 (Supabase 세션 검증)
- **Request Body**:
```json
{
  "rows": [
    {
      "index": "STR_0001",
      "cells": [
        { "colIdx": 1, "text": "Hello", "lang": "en", "langName": "영어" },
        { "colIdx": 2, "text": "안녕하세요", "lang": "fr", "langName": "프랑스어" }
      ]
    }
  ]
}
```
- **Response (200)**:
```json
{
  "issues": [
    { "rowIndex": "STR_0001", "colIdx": 2, "detected": "한국어" }
  ]
}
```
- **Response (400)**: `{ "error": "Invalid input" }`
- **Response (401)**: `{ "error": "Unauthorized" }`
- **Response (502)**: `{ "error": "Language check API failed" }` (Gemini API 오류 시)

> **Gemini 호출 방식**: 배치 단위(40행) 처리. `responseMimeType: 'application/json'`, `temperature: 0`으로 일관된 결과. 시스템 프롬프트에 오탐 방지 규칙 포함 (브랜드명·게임 용어·3자 이하 미감지 등).

---

## Risk & Rollback

| 리스크 | 발생 조건 | 대응 |
|--------|----------|------|
| **AI 언어 감지 오탐** | 게임 용어·브랜드명을 언어 오류로 잘못 감지 | 시스템 프롬프트에 오탐 방지 규칙 명시 (게임 용어, 3자 이하, 의심스러우면 미감지). 오탐 시 사용자가 원본 파일 직접 확인 |
| **Gemini API 503 과부하** | gemini-3-pro-preview 서버 과부하 | 자동 폴백: gemini-2.5-pro로 재시도 |
| **Gemini API 전체 실패** | API 키 미설정 또는 네트워크 오류 | 빨간 배너로 에러 표시, 빈 셀·외래어 감지 결과는 그대로 유지 |
| **xlsx 파일 구조 불일치** | 헤더가 4행 이외 위치이거나 컬럼 순서가 다른 파일 | 파싱 전 row[3] 존재·11컬럼 이상 여부 검증 + 명확한 오류 메시지 표시 |
| **대용량 파일 성능** | 1000행 초과 xlsx 업로드 시 감지 지연 | 40행 배치 처리로 UI 블로킹 없음. 단, 전체 완료까지 시간 소요 |

**롤백 절차**: 독립 라우트(`/string-check`)와 새 API 라우트만 추가, 기존 코드와 완전 분리. 문제 발생 시 해당 파일 삭제로 즉시 롤백 가능. DB 변경 없음.

**관찰 포인트**:
- Vercel 함수 로그에서 `/api/string-check/lang-check` 401·502 오류율 모니터링
- Google AI Studio 대시보드에서 `GEMINI_API_KEY` 토큰 사용량 확인
