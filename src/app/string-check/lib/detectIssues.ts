import { detect } from 'tinyld'
import { LANG_MAP, type StringRow, type CellIssue } from '../types'

const MIN_DETECT_LENGTH = 5

/**
 * 행 목록을 순회하며 각 셀의 이슈(빈 셀·언어 오류·공용 외래어)를 감지하여 반환한다.
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
      if (sameCount >= 6) {
        issues[col] = { type: 'warning', reason: 'loanword', matchCount: sameCount }
      }
    }

    // ② 빈 셀 + 언어 오류 검사 (col 0~9 전체)
    for (let col = 0; col <= 9; col++) {
      const val = row.cells[col]?.trim()

      if (!val) {
        issues[col] = { type: 'error', reason: 'empty' }
        continue
      }

      // loanword 경고 셀은 언어 오류 검사 제외
      if (issues[col]?.reason === 'loanword') continue

      // 너무 짧은 셀은 신뢰도 부족으로 건너뜀
      if (val.length < MIN_DETECT_LENGTH) continue

      const detected = detect(val)
      if (!detected) continue

      const expected = LANG_MAP[col].tinyld
      // 중국어: tinyld는 zh-TW/zh-CN 구분 없이 'zh' 반환 → 모두 정상 처리
      if (detected !== expected) {
        issues[col] = { type: 'error', reason: 'wrong-lang', detected }
      }
    }

    return { ...row, issues }
  })
}
