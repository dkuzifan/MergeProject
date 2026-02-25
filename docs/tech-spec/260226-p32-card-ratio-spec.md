---
title: P32 카드 팩 시뮬레이터 ratio 가중치 선택 - Tech Spec
date: 2026-02-26
prd: docs/prd/260226-p32-card-ratio.md
status: implemented
---

## ⚠️ 프로젝트 호환성 체크

| 항목 | 프로젝트 현황 | 호환 여부 | 비고 |
|------|-------------|----------|------|
| 아키텍처 | Next.js App Router (`src/app/`) | ✅ | 단일 페이지 파일 수정 |
| 상태 관리 | `useState` / `useEffect` | ✅ | 기존 패턴 유지 |
| DB | Supabase (`default_cards` 테이블) | ✅ | 컬럼 추가만, 기존 데이터 무변경 |
| 하위 호환성 | localStorage·Supabase 저장 데이터 | ✅ | `ratio ?? 1` fallback으로 처리 |
| 테스트 | 없음 | N/A | 수동 검증으로 대체 |

---

## 의존성 분석 및 기술 설계

### DB
- **변경** `public.default_cards` — `ratio numeric NOT NULL DEFAULT 1` 컬럼 추가
  - `DEFAULT 1` → 기존 카드 ratio = 1, 균일 확률 유지 (하위 호환)
  - 기존 INSERT/UPDATE 쿼리는 ratio를 명시하지 않아도 동작 (DEFAULT 적용)
  - 수동 SQL 실행 필요: `ALTER TABLE public.default_cards ADD COLUMN ratio numeric NOT NULL DEFAULT 1;`

### Domain (타입)
- **수정** `Card` 타입에 `ratio: number` 필드 추가
  - 이전: `{ id, name, image, rank, isGold }`
  - 이후: `{ id, name, image, rank, isGold, ratio }`

### 데이터 로딩
- **수정** `fetchSystemDefaults` 매핑: `ratio: c.ratio ?? 1`
- **수정** `loadUserData`: `data.cards_data.map((c: any) => ({ ...c, ratio: c.ratio ?? 1 }))`
  - 이유: localStorage·Supabase에 저장된 기존 데이터에는 ratio 필드 없음 → fallback 필수

### 가챠 알고리즘 (`drawOneCard`)
- **변경 전**: `pool[Math.floor(Math.random() * pool.length)]` — uniform random
- **변경 후**: ratio 가중치 기반 선택

```ts
const totalWeight = pool.reduce((sum, c) => sum + (c.ratio ?? 1), 0);
let rand = Math.random() * totalWeight;
for (const card of pool) {
  rand -= (card.ratio ?? 1);
  if (rand <= 0) return card;
}
return pool[pool.length - 1]; // 부동소수점 오차 fallback
```

- rank 결정 로직 및 pool 필터링 로직은 변경 없음
- 알고리즘 복잡도: O(n) — pool 크기에 선형. 실사용 pool 크기(9개 내외)에서 성능 문제 없음

### CSV

**Export (`exportCardDataCSV`)**
- 이전 헤더: `id,name,image,rank,is_gold`
- 이후 헤더: `id,name,image,rank,is_gold,ratio`
- 각 행: `${c.ratio??1}` 추가

**Import (`handleCardCSVImport`)**
- 이전: `{ id, name, image, rank, isGold }`
- 이후: `{ id, name, image, rank, isGold, ratio: Number(cols[5]) || 1 }`
- `cols[5]`가 없거나 `0`이면 `1` fallback (|| 연산자 활용)
- 기존 5컬럼 CSV Import도 정상 동작 (cols[5] 없으면 ratio=1)

### Release Strategy
- 단일 파일 수정 (`src/app/p32/card/page.tsx`) — 다른 페이지·컴포넌트 영향 없음
- DB 변경은 컬럼 추가만 — 기존 행 데이터 무변경, 기존 쿼리 호환
- 피처 플래그 불필요 — 변경 즉시 적용

---

## Plan (Implementation Checklist)

**Phase A: DB 변경** ― 수동 실행 필요
- [x] **[수동 작업]** Supabase 대시보드 SQL Editor에서 실행:
  ```sql
  ALTER TABLE public.default_cards
  ADD COLUMN ratio numeric NOT NULL DEFAULT 1;
  ```

**Phase B: 코드 수정** (`src/app/p32/card/page.tsx`)
- [x] `Card` 타입에 `ratio: number` 추가
- [x] `fetchSystemDefaults` 매핑에 `ratio: c.ratio ?? 1` 추가
- [x] `loadUserData`에 `ratio ?? 1` fallback 추가
- [x] `drawOneCard` — uniform 선택 → ratio 가중치 선택으로 교체
- [x] `exportCardDataCSV` — 헤더·행에 `ratio` 컬럼 추가
- [x] `handleCardCSVImport` — `cols[5]`에서 ratio 파싱 추가

---

## 테스트 계획

- **방식**: 브라우저에서 직접 확인 (자동화 테스트 없음)
- **실행 시점**: Phase B 완료 후

**1. DB 확인**
- [x] Supabase 대시보드 → `default_cards` 테이블 → `ratio` 컬럼 존재 및 기본값 1 확인

**2. 기존 데이터 하위 호환**
- [x] `/p32/card` 접속 → RESET 없이 기존 localStorage 데이터 로드 → 오류 없이 정상 동작

**3. 가중치 동작 확인**
- [x] RESET으로 최신 DB 데이터 로드
- [x] Supabase에서 특정 카드 ratio를 높게 설정 후 RESET
- [x] 대량 개봉(bulk) 수행 → 해당 카드가 더 자주 등장하는지 확인

**4. CSV Export**
- [x] Export 버튼 클릭 → 다운로드된 CSV에 `ratio` 컬럼 포함 확인

**5. CSV Import**
- [x] ratio 컬럼 포함 CSV Import → 정상 파싱 확인
- [x] ratio 컬럼 없는 기존 CSV Import → ratio=1 fallback 확인

---

## 데이터 흐름

```
[fetchSystemDefaults]
  └─ default_cards 테이블 SELECT *
       └─ { id, name, image, rank, is_gold, ratio } → Card[] (ratio ?? 1)

[drawOneCard]
  └─ rank 결정 (기존 prob_rN 로직, 변경 없음)
       └─ pool 필터링 (rank + isGold 매칭, 변경 없음)
            └─ ratio 가중치 선택 (신규)
                 └─ totalWeight = Σ(c.ratio)
                      └─ rand = Math.random() * totalWeight
                           └─ 순차 감산 → 선택된 Card 반환

[CSV Export]
  └─ cardsData → "id,name,image,rank,is_gold,ratio\n..." 파일 다운로드

[CSV Import]
  └─ cols[0~5] 파싱 → { id, name, image, rank, isGold, ratio }
       └─ cardsData 업데이트 → localStorage 저장
```

---

## DB 명세

### `default_cards` 테이블 (변경 항목만)

| 컬럼명 | 타입 | 기본값 | 의미 |
|--------|------|--------|------|
| `ratio` | `numeric` | `1` | 같은 rank 내 카드 선택 가중치. 값이 클수록 더 자주 뽑힘 |

- ratio=1인 카드만 있으면 기존 균일 확률과 동일하게 동작
- ratio=0 설정 시 해당 카드는 뽑히지 않음 (totalWeight에서 0 기여)
- 소수점 가능 (예: ratio=1.5)

---

## Risk & Rollback

**[R1] 기존 저장 데이터 ratio 누락**
- **어떤 상황**: localStorage 또는 Supabase user_game_data에 저장된 cards_data에 ratio 없음
- **가능성**: 높음 (기존 모든 저장 데이터)
- **처리**: `ratio ?? 1` fallback으로 사전 처리 완료 — 오류 없음

**[R2] ratio=0 카드만 남는 경우**
- **어떤 상황**: pool 내 모든 카드의 ratio가 0이면 totalWeight=0 → `Math.random() * 0 = 0` → for문에서 첫 카드 반환
- **가능성**: 매우 낮음 (의도적으로 모든 카드를 ratio=0으로 설정하는 경우)
- **결과**: for문 조건(`rand <= 0`이 항상 true) → 첫 번째 카드 반환. 오류는 없음

**[R3] 부동소수점 오차**
- **어떤 상황**: ratio 합산 중 부동소수점 오차로 `rand`가 0보다 약간 크게 남아 for문을 빠져나올 수 있음
- **처리**: `return pool[pool.length - 1]` fallback으로 사전 처리 완료

**[R4] ratio 없는 기존 CSV Import**
- **어떤 상황**: 기존 5컬럼 CSV(`id,name,image,rank,is_gold`)를 Import
- **처리**: `Number(cols[5]) || 1` → `cols[5]`가 `undefined`이면 `Number(undefined) = NaN`, `NaN || 1 = 1` → 정상 fallback
