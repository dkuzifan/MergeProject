---
title: {기능 제목} - Tech Spec
date: {YYYY-MM-DD}
prd: docs/prd/{YYMMDD}-{featureName}.md
status: draft | in-review | approved
---

## 의존성 분석 및 기술 설계 (Dependency Analysis & Technical Design)

- **API**: [API 변경점 명시]
- **DB**: [DB 변경점 명시]
- **Domain**: [도메인 로직 변경점 명시]
- **UI**: [UI 변경점 명시]
- **Release Strategy**: [릴리즈 전략 제안]

## Plan (Implementation Checklist)

**Phase 1: [첫 번째 단계 설명]**
- [ ] [작업 항목 1]
- [ ] [작업 항목 2]

**Phase 2: [두 번째 단계 설명]**
- [ ] [작업 항목 3]
- [ ] [작업 항목 4]

## 테스트 계획 (Test Plan)

- **목표**: 기존 핵심 기능이 깨지지 않고, 새로운 기능이 기획 의도대로 동작하는 것을 보증합니다.
- **테스트 시나리오**:
  - **1. 핵심 기본 플로우 검증 (Regression)**
    - [ ] 실패해서는 안 되는 핵심 플로우
  - **2. 신규 피처 플로우 검증**
    - [ ] PRD User Flow 1 검증
    - [ ] PRD User Flow 2 검증

## 데이터 흐름 및 테이블 명세 (Data Flow & Table Specification)

### 1. [주요 로직 1]
- **[테이블 이름]** (Read/Write)
  - **Read**: [읽기 필드]
  - **Write**: [쓰기 필드]

## API 명세 (필요시 작성)

### [HTTP Method] `[Endpoint URL]`
- **Description**: [설명]
- **Permission**: [권한]
- **Request Body**: `{...}`
- **Response**: `{...}`

## Risk & Rollback

- **리스크**: [예상되는 주요 리스크]
- **발생 조건**: [리스크 발생 조건]
- **롤백 절차**: [구체적인 롤백 절차]
- **관찰 포인트**: [릴리즈 후 모니터링할 핵심 지표]
