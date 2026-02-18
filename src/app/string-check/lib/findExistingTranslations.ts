import type { StringRow } from '../types'

/**
 * 파일 내 동일 한국어 원문을 가진 다른 행에서 이미 번역된 값을 찾아 반환한다.
 * @param rows 전체 행 목록
 * @param korText 번역할 한국어 원문 (cells[0])
 * @param currentIndex 현재 행의 index (자기 자신 제외)
 * @param targetColIndices 채워야 할 컬럼 인덱스 목록 (1~9)
 * @returns colIdx → 재사용 가능한 번역 값
 */
export function findExistingTranslations(
  rows: StringRow[],
  korText: string,
  currentIndex: string,
  targetColIndices: number[],
): Record<number, string> {
  const result: Record<number, string> = {}
  const remaining = new Set(targetColIndices)

  for (const row of rows) {
    if (row.index === currentIndex) continue
    if (row.cells[0] !== korText) continue
    if (remaining.size === 0) break

    for (const col of remaining) {
      const val = row.cells[col]?.trim()
      if (val) {
        result[col] = val
        remaining.delete(col)
      }
    }
  }

  return result
}
