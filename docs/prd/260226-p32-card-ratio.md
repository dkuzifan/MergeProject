---
title: P32 카드 팩 시뮬레이터 — ratio 가중치 선택
date: 2026-02-26
owner: @team
status: implemented
---

## Context

- P32 가챠 시뮬레이터에서 rank가 결정된 후, 같은 rank 내 카드 선택은 균일 확률(uniform random)로 이루어졌다.
- 카드마다 뽑힐 확률을 다르게 설정하고 싶은 요구가 생겼다 (예: 특정 카드가 2배 확률).
- `default_cards` 테이블에 `ratio` 컬럼을 추가하여, 같은 rank 내에서 ratio를 가중치로 활용한다.
- `DEFAULT 1` 설정으로 기존 카드는 ratio = 1이 되어 기존 동작(균일 확률)이 그대로 유지된다.
- CSV Import/Export에도 ratio 컬럼을 반영하여, 스프레드시트에서 ratio를 일괄 편집할 수 있다.

---

## Goals / Non-Goals

**Goals (목표):**
- `default_cards` 테이블에 `ratio numeric NOT NULL DEFAULT 1` 컬럼 추가
- 가챠 뽑기 시 같은 rank pool 내에서 ratio 가중치 기반으로 카드 선택
- CSV Export 헤더에 `ratio` 컬럼 추가
- CSV Import 시 6번째 컬럼(index 5)에서 ratio 파싱 (없으면 1 fallback)
- 기존 localStorage·Supabase 저장 데이터에 ratio 없는 경우 1로 fallback

**Non-Goals (비목표):**
- 팩(pack) 단위의 ratio 설정 — 이번 범위 아님
- rank 결정 확률(prob_rN, prob_gN) 변경 — 기존 로직 그대로 유지
- UI에서 ratio 값을 직접 편집하는 기능 — CSV로만 관리
- ratio 소수점 단위의 미세 확률 보장 — 부동소수점 오차는 fallback으로 처리

---

## Success Definition

**정량적:**
- `default_cards` 테이블에 `ratio` 컬럼 존재 확인
- ratio가 다른 카드들로 대량 개봉 시 실제 획득 분포가 ratio 비율에 근접
- CSV Export 파일에 `ratio` 컬럼 포함 확인
- ratio 컬럼 포함 CSV Import → 정상 파싱 확인

**정성적:**
- 기존 ratio 없는 저장 데이터 로드 시 오류 없이 ratio=1로 동작
- ratio=1 카드들만 있을 때 기존 균일 확률과 동일하게 동작 (하위 호환)

---

## Requirements

**Must-have (필수):**

**[DB]**
- [x] `default_cards` 테이블에 `ratio numeric NOT NULL DEFAULT 1` 컬럼 추가 (수동 SQL 실행)

**[타입]**
- [x] `Card` 타입에 `ratio: number` 필드 추가

**[데이터 로딩]**
- [x] `fetchSystemDefaults`: DB에서 `ratio` 컬럼 매핑 (`c.ratio ?? 1`)
- [x] `loadUserData`: 기존 저장 데이터에 ratio 없는 경우 `ratio ?? 1` fallback 처리

**[가챠 로직]**
- [x] `drawOneCard`: pool 내 카드 선택을 uniform → ratio 가중치 선택으로 교체
  - ratio 합산(totalWeight) → `Math.random() * totalWeight` → 순차 감산
  - 부동소수점 오차 시 `pool[pool.length - 1]` fallback

**[CSV]**
- [x] Export: 헤더 `id,name,image,rank,is_gold,ratio` + 각 행에 `c.ratio??1` 출력
- [x] Import: `cols[5]`에서 ratio 파싱, 없거나 0이면 1 fallback

---

## Algorithm

1. 기존 rank 결정 로직 유지 (pack의 `prob_rN`, `prob_gN` 기반)
2. rank 결정 후 pool 필터링 유지 (`isGold` fallback 포함)
3. pool에서 카드 선택 시만 ratio 가중치 적용

```
카드 A: ratio=1, 카드 B: ratio=2, 카드 C: ratio=1
→ totalWeight = 4
→ A: 25%, B: 50%, C: 25%
```

---

## Verification

1. Supabase 대시보드 → `default_cards` 테이블에 `ratio` 컬럼 존재 확인
2. `/p32/card` 접속 → RESET 버튼으로 최신 DB 데이터 로드
3. ratio가 다른 카드 설정 후 대량 개봉으로 실제 분포 확인
4. CSV Export → `ratio` 컬럼 포함 여부 확인
5. ratio 컬럼 포함 CSV Import → 정상 파싱 확인
