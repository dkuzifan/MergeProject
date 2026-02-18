---
title: 스트링 체크 & 번역 - Tech Spec
date: 2026-02-18
prd: docs/prd/260218-string-check.md
status: draft
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
| xlsx | ❌ 미설치 | 🔧 `xlsx` (SheetJS) 신규 설치 필요 |
| 언어 감지 | ❌ 미설치 | 🔧 `tinyld` 신규 설치 필요 |
| 번역 | ❌ 미설치 | 🔧 Google Translate REST API (서버 프록시 경유) |

### API

- **신규**: `POST /api/string-check/translate`
  - Google Translate API 키를 서버에서만 보관하기 위한 프록시 라우트
  - 클라이언트에서 번역 요청 → 서버가 Google API 호출 → 결과 반환
  - 클라이언트에 API 키 노출 없음
- **기존 API 변경 없음** (auth API 등 그대로)

### DB

- **변경 없음** — 데이터는 브라우저 메모리에서만 처리
- 업로드된 xlsx 파일, 파싱 결과, 편집 내용 모두 클라이언트 state에만 존재
- 서버 저장 없음 → 세션 종료 시 데이터 소멸

### Domain (핵심 로직)

세 가지 순수 JS 함수 모듈로 분리:

1. **xlsx 파싱** (`parseXlsx`): SheetJS `read()` → 4행~부터 데이터 추출 (A=인덱스, B~K=언어)
2. **오류/경고 감지** (`detectIssues`): 행·셀 단위 순회
   - 빈 셀 감지 → `error: 'empty'`
   - 언어 오류 감지: `tinyld.detect(cellValue)` → 기대 언어 코드와 비교 → `error: 'wrong-lang'`
   - 공용 외래어 감지: 같은 행 B열(한국어) 제외 9개 셀 중 6개 이상 동일 표현 → `warning: 'loanword'`
3. **xlsx 다운로드** (`exportXlsx`): 현재 state → SheetJS `write()` → 브라우저 다운로드

### UI

- **신규 페이지**: `src/app/string-check/page.tsx`
  - `'use client'` 컴포넌트 (파일 파싱, 편집, 상태 관리 모두 클라이언트)
  - 기존 `AppShell` 내에 포함 → Navbar 자동 표시
- **신규 컴포넌트** (`src/app/string-check/components/`):
  - `UploadScreen.tsx` — 드래그&드롭 업로드 UI
  - `SummaryPanel.tsx` — 오류/경고 요약 패널 (행 그룹 + 토글 + index 스크롤)
  - `StringTable.tsx` — 11컬럼 표 (sticky 인덱스, 인라인 편집, 하이라이트, 번역 버튼)
- **홈 페이지** (`src/app/page.tsx`): 스트링 체크 도구 카드 추가 (기존 도구 목록에 추가)

### Release Strategy

- DB 변경 없음 → 배포 즉시 롤백 가능
- Google Translate API 키는 Vercel 환경 변수(`GOOGLE_TRANSLATE_API_KEY`)에만 저장
- `/string-check` 라우트는 인증 게이트로 자동 보호 (proxy.ts)
- 기존 기능에 영향 없음 → 독립 배포 가능

---

## 신규 설치 패키지

```bash
npm install xlsx tinyld
```

| 패키지 | 용도 | 비고 |
|--------|------|------|
| `xlsx` (SheetJS) | xlsx 파일 파싱·생성 | MIT 라이선스, 브라우저·Node 모두 지원 |
| `tinyld` | 통계 기반 언어 감지 | 50개 주요 언어, **CJS + ESM 모두 지원**, 짧은 텍스트에 최적화 |

> **franc-min 대신 tinyld를 선택한 이유**: franc-min v6+는 ESM 전용으로 Next.js 서버 컴포넌트·API Route에서 빌드 오류 발생 가능성이 있음. tinyld는 CJS/ESM 모두 지원하여 빌드 이슈 없이 클라이언트·서버 양쪽에서 사용 가능. 또한 짧은 UI 문자열 감지 정확도가 더 높음.

---

## 신규/수정 파일 목록

```
신규:
  src/app/string-check/
    page.tsx                         # 메인 페이지 (client component)
    components/
      UploadScreen.tsx               # 업로드 화면
      SummaryPanel.tsx               # 오류/경고 요약 패널
      StringTable.tsx                # 스트링 표 + 인라인 편집
  src/app/api/string-check/
    translate/route.ts               # Google Translate 프록시 API

수정:
  src/app/page.tsx                   # 홈에 스트링 체크 카드 추가
  .env.local                         # GOOGLE_TRANSLATE_API_KEY 추가
  package.json                       # xlsx, tinyld 추가
```

---

## Plan (Implementation Checklist)

**P1: 환경 설정** ← 이후 모든 Phase의 선행 조건
- [ ] Google Cloud Console에서 Translation API 활성화 + API 키 발급
- [ ] GCP Console > Translation API > Quotas에서 월 500,000자 하드 쿼터 설정
- [ ] `GOOGLE_TRANSLATE_API_KEY`를 `.env.local`과 Vercel 환경 변수에 등록
- [ ] `xlsx`, `tinyld` 패키지 설치 (`npm install xlsx tinyld`)
- [ ] `src/app/string-check/page.tsx` 빈 shell 생성, `src/app/page.tsx`에 도구 카드 추가

**P2: xlsx 파싱 및 표 렌더링** ← P1 완료 후
- [ ] `UploadScreen`: 드래그&드롭 + 파일 선택, xlsx 포맷 검증 (확장자 + 파싱 시도)
- [ ] SheetJS `read()`로 파일 파싱 — 4행(index 3)~부터 데이터 추출, A~K 컬럼 매핑
- [ ] 파싱 실패(구조 불일치) 시 업로드 화면에 오류 메시지 표시
- [ ] `StringTable`: 인덱스 + 10개 언어 컬럼, sticky 인덱스 열, 가로 스크롤
- [ ] 파싱 완료 → 결과 화면 전환, Action Bar(파일명·버튼)·범례 렌더링
- [ ] ✅ **검증**: 실제 string.xlsx 업로드 후 1000행 기준 3초 내 표 렌더링

**P3: 오류·경고 감지** ← P2 완료 후
- [ ] `detectIssues()` 함수 구현 — 3중 필터 포함 (공용 외래어 우선 → 최소 길이 → tinyld 감지)
- [ ] 빈 셀 → red 하이라이트
- [ ] 언어 오류 셀 → red + 호버 툴팁 ("감지된 언어: OO")
- [ ] 공용 외래어 셀 → yellow + 호버 툴팁 ("공용 외래어 추정")
- [ ] `SummaryPanel`: 행 단위 그룹, 언어 태그, 토글 펼치기/접기, index 클릭→해당 행 스크롤
- [ ] `[오류 행만]` 토글 — 이슈 없는 행 숨김
- [ ] ✅ **검증**: 빈 셀·언어 오류·공용 외래어 3가지 케이스 모두 정상 표시, 5자 미만 셀 오류 미표시

**P4-A: 번역 API Route 구현** ← P1 완료 후 (P3와 병렬 가능)
- [ ] `/api/string-check/translate` Route Handler 구현
  - Supabase 세션 검증 (미인증 시 401)
  - 요청 text 500자 초과 시 413 반환
  - Google Translate API v2 배치 호출 (1 text × 9 언어)
  - 성공 시 `{ translations: { en: "...", fr: "...", ... } }` 반환
  - Google API 오류 시 502 반환
- [ ] ✅ **검증**: curl 또는 브라우저 DevTools로 API 직접 호출해 정상 응답 확인

**P4-B: 번역 클라이언트 연결** ← P2 + P4-A 완료 후
- [ ] 한국어만 있는 행 판별 로직 — Action Bar 번역 버튼·행 우측 [번역] 버튼 표시 조건
- [ ] `findExistingTranslations()` 구현 — 번역 전 동일 한국어 원문 행 검색, 재사용 가능한 언어 추출
- [ ] 행 단위 [번역] 버튼 — 내부 재사용 먼저 적용 후, 남은 언어만 API 호출하여 빈 셀 채움
- [ ] [전체 번역] 버튼 클릭 시 예상 문자 수 표시 (재사용 제외 후 실제 API 호출 예정 문자 수) + 사용자 확인 → 순차 처리
- [ ] 번역 진행 중 상태 표시 (진행 중인 셀 파란 배경, 진행률 표시)
- [ ] 번역 실패 셀 — 오렌지 테두리 + "번역 실패" 텍스트, 클릭 시 재시도
- [ ] ✅ **검증**: 행 번역·전체 번역·내부 재사용·실패 재시도 모두 동작 확인

**P5: 인라인 편집 및 다운로드** ← P2 완료 후
- [ ] 셀 클릭 → input으로 전환 (인라인 편집 모드), 포커스 아웃/Enter로 확정
- [ ] 편집 확정 시 `detectIssues()` 해당 행 재실행 → 하이라이트·요약 패널 즉시 업데이트
- [ ] [다운로드] 버튼 — SheetJS `write()`로 현재 state → xlsx 내보내기
  - 원본 1~3행(헤더/메타) 유지, 4행~부터 현재 편집 내용 반영
- [ ] ✅ **검증**: 번역·편집 후 다운로드한 xlsx를 Excel/Sheets에서 열어 내용 확인

---

## 테스트 계획 (Test Plan)

> 프로젝트에 테스트 프레임워크 없음 → 수동 시나리오 테스트로 진행. 각 항목에 **입력**과 **기대 결과**를 명시.

### 1. 핵심 기본 플로우 검증 (Regression)

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| R1 | 미인증 접근 차단 | 로그아웃 상태에서 `/string-check` 직접 입력 | `/login`으로 리디렉션 |
| R2 | 기존 페이지 정상 동작 | `/`, `/p32` 접근 | 페이지 정상 렌더링, 오류 없음 |

### 2. 신규 피처 플로우 검증

**업로드**

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| U1 | 정상 업로드 | 1000행 string.xlsx 드래그&드롭 | 3초 이내 표 렌더링 완료 |
| U2 | 포맷 오류 | `.csv` 파일 업로드 | "xlsx 파일만 지원합니다" 오류 메시지, 화면 유지 |
| U3 | 구조 불일치 | 4행 미만이거나 11컬럼 미만인 xlsx | "파일 구조가 올바르지 않습니다" 오류 메시지 |

**오류·경고 감지**

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| D1 | 빈 셀 | 영어 컬럼이 비어있는 행 | 해당 셀 red, 요약 패널에 해당 행 표시 |
| D2 | 언어 오류 | 일본어 컬럼에 한국어 텍스트 입력 | 해당 셀 red, 툴팁 "감지된 언어: 한국어" |
| D3 | 공용 외래어 | "Tutorial"이 9개 컬럼 중 7개에 동일하게 입력 | 해당 셀 yellow, 툴팁 "공용 외래어 추정" |
| D4 | 오탐 방지 — 짧은 셀 | 영어 컬럼에 "OK" (2자) 입력 | 언어 오류 표시 **없음** |
| D5 | 오탐 방지 — 공용 외래어 우선 | "Beta"가 8/9 컬럼에 동일하게 있는 행의 스페인어 셀 | yellow 경고(loanword)만 표시, red 오류 없음 |
| D6 | 요약 패널 토글 | 여러 이슈가 있는 행의 토글 버튼 클릭 | 언어별 상세 내용 펼치기/접기 동작 |
| D7 | 요약 패널 스크롤 | 요약 패널의 index 링크 클릭 | 표에서 해당 행으로 스크롤, 1.5초 파란 하이라이트 |
| D8 | 오류 행 필터 | `[오류 행만]` 토글 클릭 | 이슈 없는 행 숨김, 재클릭 시 전체 복원 |

**번역**

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| T1 | 행 번역 | 한국어만 있는 행의 [번역] 버튼 클릭 | 빈 9개 셀에 번역 결과 채워짐, 감지 결과 재계산 |
| T2 | 내부 재사용 — 전체 일치 | 동일 한국어 원문이 다른 행에 번역 완료된 상태에서 [번역] 클릭 | API 호출 없이 즉시 번역 결과 채워짐 |
| T3 | 내부 재사용 — 부분 일치 | 동일 한국어 원문 행에 일부 언어(예: 영어·일본어)만 번역된 경우 | 영어·일본어는 재사용, 나머지 7개 언어만 API 호출 |
| T4 | 전체 번역 확인 UI | [전체 번역] 버튼 클릭 | 재사용 후 실제 API 호출 예정 문자 수 표시 + 확인/취소 선택지 노출 |
| T5 | 전체 번역 진행 | 전체 번역 확인 후 진행 | 행 순차 처리, 진행 중인 행 파란 배경, 완료 행 정상 표시 |
| T6 | 번역 실패 | API 오류 발생 (네트워크 차단 등) | 해당 셀 오렌지 테두리 + "번역 실패" 표시 |
| T7 | 재시도 | 번역 실패 셀 클릭 | 해당 셀만 재번역 시도 (재사용 탐지 후 API 호출) |

**편집 및 다운로드**

| # | 시나리오 | 입력 | 기대 결과 |
|---|----------|------|-----------|
| E1 | 인라인 편집 | 셀 클릭 → 텍스트 수정 → Enter | 수정 내용 확정, 해당 행 감지 결과 즉시 재계산 |
| E2 | 편집 취소 | 셀 클릭 후 Escape 또는 바깥 클릭 | 수정 내용 유지 (확정) 또는 취소 여부 결정 |
| E3 | 다운로드 | [다운로드] 버튼 클릭 | xlsx 파일 다운로드, Excel/Sheets에서 열면 번역·편집 내용 반영 확인 |
| E4 | 원본 헤더 유지 | 다운로드 후 Excel에서 확인 | 1~3행 헤더/메타 원본 그대로, 4행~부터 수정 내용 반영 |

---

## 데이터 흐름 및 타입 명세

> DB 없음 — 모든 데이터는 클라이언트 React state에만 존재. 서버는 Google Translate 프록시 역할만 함.

### Flow 1: 파일 업로드 → 파싱 → 감지

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
detectIssues(rows)                       ← 3중 필터 적용 (공용 외래어 → 최소 길이 → tinyld)
→ 각 StringRow에 issues 채움
    │
    ▼
setState({ fileName, rows, originalWorkbook })
→ 결과 화면 렌더링

※ originalWorkbook: 다운로드 시 1~3행 헤더 복원에 사용 — 업로드 시점에 보관
```

---

### Flow 2: 번역 (행 단위 / 전체 일괄)

```
[사용자] [번역] 또는 [전체 번역] 클릭
    │
    ├─ 전체 번역이면 → 예상 문자 수 계산 표시 + 사용자 확인
    │                  취소 → 종료
    │
    ▼
번역 대상 행 목록 확정
  (한국어 cells[0] 값 있음 AND 다른 언어 셀 중 1개 이상 빈 셀)
    │
    ▼ (행별 순차 처리)

setState: translatingRows.add(row.index)  → 해당 행 파란 배경

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP A: 내부 번역 재사용 탐지  ← API 호출 전 먼저 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
findExistingTranslations(rows, korText, targets):
  전체 rows에서 cells[0] === korText 인 다른 행 검색
  해당 행들에서 targets에 해당하는 언어 셀이 채워져 있으면 → 그 값 수집
  → reused: { en: "...", fr: "..." }   (이미 채울 수 있는 언어)
  → remaining: ["ja", "es", ...]       (여전히 비어있어 API 필요한 언어)

reused가 있으면 → 해당 셀에 즉시 채움 (API 호출 없음, 비용 0)

remaining이 비어있으면 → API 호출 생략, 완료
    │
    ▼ remaining이 있을 때만

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP B: Google Translate API 호출
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fetch POST /api/string-check/translate
  body: { text: cells[0], targets: remaining }   ← 재사용 후 남은 언어만
    │
    ▼ [서버: route.ts]
    │
    ├─ Supabase 세션 검증 실패 → 401
    ├─ text.length > 500 → 413
    │
    ▼
Google Translate API v2 호출 (remaining 언어 수 × 개별 요청)
  ※ v2는 target을 하나만 받음 → 언어당 1 요청, Promise.all로 병렬 처리
  GET https://translation.googleapis.com/language/translate/v2
    ?q={text}&source=ko&target={langCode}&key={API_KEY}
    │
    ├─ Google 오류 (429 할당량 초과 포함) → 502 반환
    │
    ▼
{ translations: { ja: "...", es: "...", ... } } 반환
    │
    ▼ [클라이언트]
    │
    ├─ 성공: 남은 빈 셀에 번역 결과 채움
    └─ 실패: 해당 셀 translateFailed 마킹 → 오렌지 테두리 + "번역 실패"

전체 셀 채운 후 → detectIssues 해당 행 재실행
setState: translatingRows.delete(row.index)
→ 다음 행으로 이동 (전체 번역) 또는 완료
```

**재사용 탐지 효과:**
- 동일 한국어 원문이 파일 내 여러 행에 중복되는 경우 (버튼 라벨, 공통 메시지 등)
  API 호출 횟수 절감 → 비용 절감 + 번역 일관성 보장
- 재사용 여부는 투명하게 처리 (사용자에게 별도 알림 없음)

---

### Flow 3: 인라인 편집 → 감지 재계산

```
[사용자] 셀 클릭
    │
    ▼
setState: editingCell = { rowIdx, colIdx }
→ 해당 td → <input> 전환, 기존 값으로 초기화
    │
    ▼ Enter 또는 포커스 아웃
    │
rows[rowIdx].cells[colIdx] = newValue    ← state 직접 갱신
    │
    ▼
detectIssues([rows[rowIdx]])             ← 해당 행만 재실행 (전체 재실행 X)
→ rows[rowIdx].issues 업데이트
    │
    ▼
setState: editingCell = null, rows 업데이트
→ StringTable + SummaryPanel 동시 리렌더
```

---

### Flow 4: xlsx 다운로드

```
[사용자] [다운로드] 클릭
    │
    ▼
originalWorkbook 복사 (업로드 시 보관한 원본)
→ 1~3행 헤더/메타 그대로 유지
    │
    ▼
4행~의 각 셀을 현재 rows state 값으로 덮어쓰기
  worksheet[A(n)] = row.index
  worksheet[B(n)..K(n)] = row.cells[0..9]
    │
    ▼
XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
→ Uint8Array
    │
    ▼
new Blob([data], { type: 'application/vnd.openxmlformats...' })
→ URL.createObjectURL(blob)
→ <a> 태그 programmatic click → 파일 다운로드
파일명: {원본파일명}_translated.xlsx
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
  index: string                   // A열 값 (예: "STR_0001")
  cells: string[]                 // B~K 10개 언어 값 (순서 고정)
  issues: Record<number, CellIssue>  // 컬럼 인덱스(0~9) → 이슈
}

// 페이지 상태
interface StringCheckState {
  fileName: string
  rows: StringRow[]
  originalWorkbook: import('xlsx').WorkBook | null  // 다운로드 시 1~3행 헤더 복원용
  filterErrorOnly: boolean
  translatingRows: Set<string>        // 번역 진행 중인 index 집합
  editingCell: { rowIdx: number; colIdx: number } | null  // 인라인 편집 중인 셀
}
```

### 언어 코드 매핑

```typescript
// B~K 컬럼 순서, tinyld ISO 639-1 코드, Google Translate 코드 매핑
const LANG_MAP = [
  { col: 'B', name: '한국어',      tinyld: 'ko', google: 'ko'    },
  { col: 'C', name: '영어',        tinyld: 'en', google: 'en'    },
  { col: 'D', name: '프랑스어',    tinyld: 'fr', google: 'fr'    },
  { col: 'E', name: '일본어',      tinyld: 'ja', google: 'ja'    },
  { col: 'F', name: '스페인어',    tinyld: 'es', google: 'es'    },
  { col: 'G', name: '독일어',      tinyld: 'de', google: 'de'    },
  { col: 'H', name: '인도네시아어', tinyld: 'id', google: 'id'   },
  { col: 'I', name: '베트남어',    tinyld: 'vi', google: 'vi'    },
  { col: 'J', name: '중국어(번체)', tinyld: 'zh', google: 'zh-TW' },
  { col: 'K', name: '러시아어',    tinyld: 'ru', google: 'ru'    },
] as const
```

> **중국어(번체) 처리**: tinyld는 간체·번체를 구분하지 않고 `'zh'`를 반환함. 언어 오류 감지 시 J열에서 `'zh'`가 감지되면 정상으로 처리.

### 오류 감지 방어 로직 (오탐 방지)

짧은 문자열에서의 언어 감지 오탐을 방지하기 위해 아래 **3중 필터**를 적용한다.

```typescript
const MIN_DETECT_LENGTH = 5  // 5자 미만은 감지 건너뜀 → 오류 미표시
```

```
detectIssues(rows: StringRow[]):
  행 순회:
    // ① 공용 외래어 먼저 판별 (언어 오류보다 우선)
    각 셀(col 1~9)에 대해:
      sameCount = 한국어(col 0) 제외 9개 셀 중 cellValue와 동일한 값 개수
      IF sameCount >= 6
        → issue: warning/loanword  ← 이 셀은 언어 오류 검사 건너뜀

    셀 순회 (col 0~9):
      IF 빈 문자열
        → issue: error/empty
      ELSE IF 이미 loanword 경고 셀
        → 건너뜀 (공용 표현이므로 언어 오류 아님)
      ELSE:
        // ② 최소 길이 필터
        IF cellValue.length < MIN_DETECT_LENGTH
          → 건너뜀 (너무 짧아 신뢰할 수 없음)

        // ③ tinyld 감지
        detected = tinyld.detect(cellValue)
        IF detected === undefined OR detected === null
          → 건너뜀 (감지 불가 = 오류 미표시)
        ELSE IF detected !== LANG_MAP[col].tinyld
          → issue: error/wrong-lang (detected)
```

**방어 로직 효과:**
- `"OK"`, `"Next"`, `"+"` 같은 극단적으로 짧은 UI 문자열 → 감지 생략
- `"Tutorial"`, `"Beta"` 같은 공용 외래어 → loanword로 먼저 분류, 언어 오류 제외
- tinyld가 감지 불가(`undefined`) 반환 → 오류로 처리하지 않음

---

## API 명세

### POST `/api/string-check/translate`

번역 대상 텍스트를 받아 Google Translate API를 경유해 번역 결과를 반환한다.

- **Permission**: 로그인 세션 필요 (Supabase 세션 검증)
- **Request Body**:
```json
{
  "text": "설정 저장 완료",
  "targets": ["en", "fr", "ja", "es", "de", "id", "vi", "zh-TW", "ru"]
}
```
- **Response (200)**:
```json
{
  "translations": {
    "en": "Settings saved",
    "fr": "Paramètres sauvegardés",
    "ja": "設定を保存しました",
    "es": "Configuración guardada",
    "de": "Einstellungen gespeichert",
    "id": "Pengaturan tersimpan",
    "vi": "Đã lưu cài đặt",
    "zh-TW": "設定已儲存",
    "ru": "Настройки сохранены"
  }
}
```
- **Response (400)**: `{ "error": "Invalid input" }`
- **Response (413)**: `{ "error": "Text too long", "maxChars": 500 }` (요청당 문자 수 초과)
- **Response (502)**: `{ "error": "Translation API failed" }` (Google API 오류 시)

> **Google Translate API v2 호출 방식**: v2는 `target`이 하나만 허용됨. 9개 언어를 `Promise.all`로 병렬 요청 처리. 응답 중 일부만 실패해도 성공한 언어는 셀에 채우고, 실패한 언어만 오류 표시.

---

## 번역 비용 제한 설계

### 과금 방식 확인

Google Translate API v2(Basic)는 **API 호출 시 번역한 문자 수**에 대해서만 과금된다.

| 구간 | 비용 |
|------|------|
| 월 500,000자 이하 | **무료** (영구, 만료 없음) |
| 초과 시 | $20 / 백만자 |

파일 업로드·파싱·표 렌더링·편집은 브라우저 내 처리이므로 **비용 없음**. 번역 API 버튼 클릭 시에만 과금된다.

### 500,000자/월 한도 적용 전략

**1차 방어 — GCP Console 하드 쿼터 (가장 확실)**

Google Cloud Console > APIs & Services > Translation API > Quotas 에서 월 문자 수를 500,000으로 설정. 한도 초과 시 Google이 자동으로 `429 RESOURCE_EXHAUSTED` 반환, 추가 비용 발생 없음. 코드 변경 없이 인프라 레벨에서 차단.

**2차 방어 — API Route 요청당 문자 수 제한**

단일 번역 요청이 지나치게 크지 않도록 서버에서 사전 차단.

```typescript
// /api/string-check/translate/route.ts
const MAX_CHARS_PER_REQUEST = 500  // 한 셀 텍스트 최대 500자
// (게임 UI 문자열 특성상 이 이상은 비정상 요청)

if (text.length > MAX_CHARS_PER_REQUEST) {
  return NextResponse.json(
    { error: 'Text too long', maxChars: MAX_CHARS_PER_REQUEST },
    { status: 413 }
  )
}
```

**3차 방어 — 전체 번역 전 사용자 확인 UI**

`[전체 번역]` 버튼 클릭 시, 번역 API 호출 전에 예상 문자 수를 계산해 사용자에게 표시:

```
번역 대상: 34행 × 평균 15자 × 9언어 = 약 4,590자
[확인 후 번역 시작]  [취소]
```

사용자가 직접 규모를 인지하고 진행 여부를 결정.

### 비용 시뮬레이션

| 시나리오 | 번역 문자 수 | 비용 |
|----------|------------|------|
| 소규모 파일 100행 전체 번역 (중복 없음) | 100 × 15 × 9 = 13,500자 | 무료 |
| 대규모 파일 500행 전체 번역 (중복 없음) | 500 × 15 × 9 = 67,500자 | 무료 |
| 대규모 파일 500행 (중복 30% 가정) | 67,500 × 0.7 = 47,250자 | 무료 |
| 팀원 5명이 매일 전체 번역 × 20일 (중복 없음) | 67,500 × 5 × 20 = 6,750,000자 | 약 $125 |

→ 내부 재사용으로 실제 API 호출 문자 수 감소. GCP 하드 쿼터로 초과 차단.

---

## Risk & Rollback

| 리스크 | 발생 조건 | 대응 |
|--------|----------|------|
| **언어 감지 오탐** | 짧은 UI 문자열(5자 미만)이나 공용 외래어에서 오탐 | **3중 필터** 적용: ① 공용 외래어 우선 분류 후 언어 오류 제외 ② 5자 미만 건너뜀 ③ 감지 불가(`undefined`) 시 오류 미표시 |
| **ESM 빌드 오류** | ~~franc-min ESM 충돌~~ | **tinyld로 교체하여 리스크 제거** — tinyld는 CJS+ESM 모두 지원 |
| **번역 비용 초과** | 팀원 전원이 대규모 파일을 매일 반복 번역 | **3중 방어**: ① GCP Console 월 500,000자 하드 쿼터 ② API Route 요청당 500자 제한 ③ 전체 번역 전 예상 문자 수 사용자 확인 UI |
| **xlsx 파일 구조 불일치** | 헤더가 4행 이외 위치이거나 컬럼 순서가 다른 파일 | 파싱 전 row[3] 존재·11컬럼 이상 여부 검증 + 명확한 오류 메시지 표시 |
| **대용량 파일 성능** | 1000행 초과 xlsx 업로드 시 감지 지연 | PRD 기준(1000행 3초)만 보장. 초과 시 경고 메시지 표시 |

**롤백 절차**: 독립 라우트(`/string-check`)와 새 API 라우트만 추가, 기존 코드와 완전 분리. 문제 발생 시 해당 파일 삭제로 즉시 롤백 가능. DB 변경 없음.

**관찰 포인트**:
- Vercel 함수 로그에서 `/api/string-check/translate` 413·502 오류율 모니터링
- Google Cloud Console Translation API 대시보드에서 월별 문자 수 사용량 확인
