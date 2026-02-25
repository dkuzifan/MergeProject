---
title: 확률 공지 페이지 - Tech Spec
date: 2026-02-26
prd: docs/prd/260226-gacha-prob.md
status: approved
---

## ⚠️ 프로젝트 호환성 체크

| 항목 | 프로젝트 현황 | 호환 여부 | 비고 |
|------|-------------|----------|------|
| 아키텍처 | Next.js App Router (`src/app/`) | ✅ | `/cs/gacha-prob/page.tsx` 동일 구조 |
| 상태 관리 | `useState` / 라이브러리 없음 | ✅ | 선택 항목 1개 상태만 필요 |
| 스타일링 | Tailwind CSS v3, `darkMode: "class"` | ✅ | `dark:` 클래스 그대로 사용 |
| DB/Auth | Supabase SSR | ✅ (무관) | 이 페이지는 DB 연동 없음 |
| 테스트 | 없음 | N/A | 수동 검증으로 대체 |
| CS 레이아웃 | `src/app/cs/layout.tsx` 존재 | ✅ | 파일 위치만으로 CsFooter 자동 적용 |
| 패키지 추가 | — | ✅ 없음 | 기존 의존성만으로 구현 가능 |

---

## 의존성 분석 및 기술 설계

### API
- **변경 없음.** 이 페이지는 서버 요청이 전혀 없는 순수 클라이언트 컴포넌트.
- 확률 데이터는 코드 내 상수(`CONFIGS` 배열)로 관리. 네트워크 요청 발생하지 않음.

### DB
- **변경 없음.** 신규 테이블 생성 없음, 기존 테이블 쿼리 없음.
- 제약사항: 데이터 수정 시 개발자가 직접 `page.tsx` 파일의 `CONFIGS` 배열을 편집해야 함.

### Domain
- **신규** `src/app/cs/gacha-prob/page.tsx` (단일 파일 구현)
  - 타입 4개(`PackConfig`, `RankGroup`, `CardEntry`, `BundleItem`)를 파일 내부에 로컬 선언
  - CS 공통 타입(`src/app/cs/types.ts`)에 추가하지 않음 — 가챠 전용 타입이며 다른 CS 모듈에서 공유하지 않음
  - `CONFIGS: PackConfig[]` 상수가 유일한 데이터 소스
  - 파생 상수 3개(`CARD_PACKS`, `XL_PACKS`, `BUNDLES`)로 네비 그룹 분류
- **기존 파일 변경 없음.** `types.ts`, `layout.tsx`, 공통 컴포넌트 모두 무변경.

### UI
- **신규 컴포넌트** (모두 `page.tsx` 내 정의, 별도 파일 분리 없음):
  - `GachaProbPage` — 루트. `useState(selectedId)` 보유.
  - `NavItem` — 네비 버튼 1개. `isSelected` prop으로 강조 스타일 분기.
  - `DescriptionContent` — 설명 타입 렌더러.
  - `CardTable` — 카드팩 3컬럼 rowspan 테이블.
  - `BundleTable` — 꾸러미 2컬럼 테이블.
- **사용 패키지**: 추가 설치 없음. 기존 Tailwind만 사용.
- **CS 레이아웃** (`src/app/cs/layout.tsx`): 경로 위치만으로 CsFooter 자동 적용. 수정 불필요.

### Release Strategy
- `/cs/gacha-prob` 경로는 CS 하위 신규 경로 — 기존 모든 페이지에 영향 없음.
- DB 변경 없음 — 롤백 리스크 없음.
- 데이터가 정적이므로 즉시 배포 가능. 피처 플래그 불필요.
- 배포 후 Navbar 또는 CS 메인 페이지에 링크 추가 필요 (현재 직접 URL 접속만 가능).

---

## Plan (Implementation Checklist)

> 모든 작업이 단일 파일(`page.tsx`)로 완결됨. 순서 의존성 없음.

**Phase A: 타입 및 데이터 정의**
- [x] `PackConfig`, `RankGroup`, `CardEntry`, `BundleItem` 타입 로컬 선언
- [x] `CONFIGS: PackConfig[]` 더미 데이터 15개 작성 (설명 1 + 카드팩 6 + XL 6 + 꾸러미 2)
- [x] `CARD_PACKS`, `XL_PACKS`, `BUNDLES` 파생 상수로 그룹 분류

**Phase B: 네비게이션 컴포넌트**
- [x] `NavItem` 컴포넌트: 이모지 아이콘 + 이름, `isSelected` 강조, 호버 스타일
- [x] `GachaProbPage`에 4개 그룹 + 3개 `<hr>` 구분선 구조 조립
- [x] `useState`로 `selectedId` 관리, 클릭 시 상태 변경

**Phase C: 콘텐츠 렌더러**
- [x] `DescriptionContent`: 설명 텍스트 + notes 박스 (`\n` → 개별 `<p>`)
- [x] `CardTable`: 3컬럼 테이블, `group.cards.map`에서 `i === 0`일 때만 `rowSpan` 셀 렌더링
- [x] `BundleTable`: 2컬럼 테이블, `items.map`으로 단순 렌더링
- [x] `selected.type` switch로 세 렌더러 분기

**Phase D: 스타일 및 반응형**
- [x] 다크모드: 모든 요소에 `dark:` variant 적용
- [x] 반응형: 네비 `width: 22%`, 테이블 `overflow-x-auto`
- [x] 색상 매핑: 좌측 nav `bg-slate-50`, 호버 `hover:bg-emerald-100`, 선택 `bg-blue-100`

---

## 테스트 계획

- **목표**: CS 기존 기능이 영향받지 않았는지 확인 + 확률 공지 페이지 각 기능이 기획 의도대로 동작하는지 수동 검증.
- **방식**: 브라우저에서 직접 클릭·확인 (자동화 테스트 없음)

**0. 빌드 확인**
- [ ] `next build` 실행 → 오류·경고 없이 완료

**1. 기존 기능 이상 없음 확인 (Regression)**
- [ ] `/cs` 메인 페이지 접속 → 히어로·카테고리·뉴스 정상 표시
- [ ] `/cs/contact` 문의 폼 → 폼 입력·제출 정상 동작
- [ ] CS 하단바(CsFooter) 버튼 3개 → 모달·드로어 정상 열림

**2. 확률 공지 페이지 기본 동작**
- [ ] `/cs/gacha-prob` 접속 → 좌측 네비 15개 항목 + 그룹 구분선 3개 표시
- [ ] 첫 진입 시 "설명" 항목이 파란색으로 선택된 상태
- [ ] CsFooter가 페이지 하단에 정상 노출

**3. 네비게이션 인터랙션**
- [ ] 네비 항목 클릭 → 페이지 이동 없이 우측 콘텐츠만 교체
- [ ] 선택된 항목 파란색 강조, 나머지 항목 호버 시 에메랄드색 피드백
- [ ] 카드팩 그룹(🃏), XL 카드팩 그룹(✨), 꾸러미 그룹(🎁) 이모지 아이콘 정상 표시

**4. 콘텐츠 렌더링**
- [ ] 설명 탭: 설명 텍스트 + 주의사항 3줄이 회색 박스 안에 표시
- [ ] 카드팩 1 탭: 희귀도·카드·확률 3컬럼 테이블, 동일 희귀도 셀 rowspan 병합
- [ ] 희귀도 셀 황금색 텍스트(`★★★★★` 등) 표시
- [ ] 카드팩 1 하단에 notes 문구 표시 ("※ 카드팩 1은 기본 카드팩입니다.")
- [ ] XL 카드팩 1 탭: 3컬럼 테이블 정상 렌더링 + XL notes 문구 표시
- [ ] 꾸러미 아이템 1 탭: 아이템명·확률 2컬럼 테이블 정상 렌더링

**5. 반응형 및 다크모드**
- [ ] 브라우저 너비 450px 이하로 줄여 → 네비·콘텐츠 비율 유지, 레이아웃 깨짐 없음
- [ ] 테이블이 좁은 화면에서 가로 스크롤로 처리됨
- [ ] 다크모드 전환 → 네비 배경·테이블 테두리·텍스트 색상 정상 표시

---

## 데이터 흐름 및 명세

### 1. 탭 선택 흐름 (유일한 동적 흐름)

> 모든 처리가 브라우저 내부에서만 일어납니다. 서버 요청 없음.

```
[좌측 NavItem 버튼 클릭]
  └─ onClick → setSelectedId(item.id)
       └─ React 리렌더링
            ├─ 네비: 선택 항목 파란색 강조 업데이트
            └─ 콘텐츠: selected.type에 따라 렌더러 분기
                 ├─ 'description' → <DescriptionContent>
                 ├─ 'card'        → <CardTable>
                 └─ 'bundle'      → <BundleTable>
```

### 2. 데이터 구조 명세

> DB 테이블 없음. 아래 타입이 코드 내 유일한 데이터 계약.

| 타입 | 역할 | 위치 |
|------|------|------|
| `PackConfig` | 네비 항목 + 콘텐츠 설정 전체 | `page.tsx` 로컬 |
| `RankGroup` | 희귀도 그룹 (label + cards + 합산확률) | `page.tsx` 로컬 |
| `CardEntry` | 개별 카드 (이름 + 확률) | `page.tsx` 로컬 |
| `BundleItem` | 꾸러미 아이템 (이름 + 확률) | `page.tsx` 로컬 |

**`PackConfig` 필드 상세**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` | ✅ | 네비 선택 상태 키 (`'pack-1'`, `'xl-pack-1'`, `'bundle-1'` 등) |
| `name` | `string` | ✅ | 네비 표시 이름 |
| `icon` | `string` | ✅ | 이모지 아이콘 (`'🃏'`, `'✨'`, `'🎁'`, `'📋'`) |
| `type` | `'description' \| 'card' \| 'bundle'` | ✅ | 우측 콘텐츠 렌더러 결정 |
| `groups` | `RankGroup[]` | card 타입 필수 | 희귀도 그룹 배열 |
| `items` | `BundleItem[]` | bundle 타입 필수 | 꾸러미 아이템 배열 |
| `description` | `string` | 선택 | description 타입 본문 텍스트 |
| `notes` | `string` | 선택 | 페이지 하단 주의사항. `\n`으로 줄 구분 |

### 3. 데이터 수정 방법 (운영 가이드)

> 현재는 코드 직접 수정 방식. Supabase 연동 전까지의 임시 운영 절차.

```
1. src/app/cs/gacha-prob/page.tsx 열기
2. CONFIGS 배열에서 해당 id의 객체를 찾아 수정
   - 카드 추가: groups[].cards 배열에 { name, prob } 추가
   - 확률 수정: cards[].prob 또는 groups[].rankProb 값 변경
   - 항목 추가: CONFIGS 배열 끝에 새 PackConfig 객체 추가
     + CARD_PACKS / XL_PACKS / BUNDLES 파생 상수 필터 조건 확인
3. 저장 후 배포
```

---

## API 명세

해당 없음. 이 페이지는 서버 API 호출이 없습니다.

---

## Risk & Rollback

**[R1] 데이터 수정 시 렌더링 깨짐**
- **어떤 상황**: `CONFIGS` 배열 수동 수정 중 `groups` 누락, 잘못된 `type` 값 등 입력 오류 시 런타임 에러 또는 빈 화면 발생 가능
- **가능성**: 중간 — 수동 편집이므로 오타·구조 실수 가능
- **복구 방법**: `git revert` 또는 `git checkout HEAD -- src/app/cs/gacha-prob/page.tsx` 로 단일 파일 즉시 복구. 다른 파일 변경 없으므로 영향 범위 명확
- **배포 후 확인**: 수정 후 로컬에서 해당 카드팩 탭 클릭 → 테이블 정상 렌더링 확인

**[R2] 확률 합계 불일치**
- **어떤 상황**: `groups[].rankProb` 합계가 100%가 되지 않거나, `cards[].prob` 합계가 `rankProb`와 다를 경우 — 화면은 정상이지만 데이터 오류
- **가능성**: 낮음 — 현재 더미 데이터는 수작업으로 검증됨. 실제 게임 데이터 입력 시 위험
- **복구 방법**: 코드에서 해당 수치 직접 수정 후 재배포
- **배포 후 확인**: 데이터 수정 시 각 카드팩의 `rankProb` 합산이 100%인지, 각 그룹 내 `cards[].prob` 합산이 `rankProb`와 일치하는지 수동 검산
- **예방책**: 추후 실제 데이터 연동 시 합계 검증 로직(경고) 추가 고려

**[R3] 네비 항목 증가 시 모바일 레이아웃**
- **어떤 상황**: 항목명이 길거나 항목 수가 늘어날 경우, 고정 22% 네비 너비에서 텍스트 잘림 또는 레이아웃 불균형 발생 가능
- **가능성**: 낮음 — 현재 15개 항목, 짧은 이름으로 안정적
- **복구 방법**: `page.tsx`에서 nav `width` 값 또는 폰트 크기 조정 (단순 스타일 수정)
- **배포 후 확인**: 항목 추가 시마다 모바일 450px 환경에서 레이아웃 확인
