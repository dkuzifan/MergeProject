import { type StringRow, type CellIssue } from '../types'

// 공용 외래어 판정 임계값: 9개 비한국어 언어 중 이 수 이상이 동일 값이면 외래어로 간주
const LOANWORD_THRESHOLD = 4

/**
 * 행 목록을 순회하며 각 셀의 이슈(빈 셀·공용 외래어)를 감지하여 반환한다.
 * 언어 오류 검사는 Gemini API(/api/string-check/lang-check)가 담당한다.
 * 원본 rows를 변경하지 않고 새 배열로 반환한다.
 */
export function detectIssues(rows: StringRow[]): StringRow[] {
  return rows.map((row) => {
    const issues: Record<number, CellIssue> = {}

    // ① 공용 외래어 먼저 판별 (col 1~9, 한국어 제외)
    const nonKorean = row.cells.slice(1) // 9개: cells[1]~cells[9]
    for (let col = 1; col <= 9; col++) {
      const val = row.cells[col]?.trim()
      if (!val) continue
      const sameCount = nonKorean.filter((c) => c?.trim() === val).length
      if (sameCount >= LOANWORD_THRESHOLD) {
        issues[col] = { type: 'warning', reason: 'loanword', matchCount: sameCount }
      }
    }

    // ② 빈 셀 검사 (col 0~9 전체)
    for (let col = 0; col <= 9; col++) {
      const val = row.cells[col]?.replace(/[\r\n]+/g, ' ').trim()
      if (!val) {
        issues[col] = { type: 'error', reason: 'empty' }
      }
    }

    return { ...row, issues }
  })
}
