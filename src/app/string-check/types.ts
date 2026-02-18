export type CellIssue =
  | { type: 'error'; reason: 'empty' }
  | { type: 'error'; reason: 'wrong-lang'; detected: string }
  | { type: 'warning'; reason: 'loanword'; matchCount: number }

export interface StringRow {
  index: string
  cells: string[]                          // B~K 10개, cells[0]=한국어 … cells[9]=러시아어
  issues: Record<number, CellIssue>        // colIdx(0~9) → 이슈
  translateFailed: Record<number, boolean> // colIdx → 번역 실패 여부
}

export const LANG_MAP = [
  { col: 'B', name: '한국어',       tinyld: 'ko', google: 'ko'    },
  { col: 'C', name: '영어',         tinyld: 'en', google: 'en'    },
  { col: 'D', name: '프랑스어',     tinyld: 'fr', google: 'fr'    },
  { col: 'E', name: '일본어',       tinyld: 'ja', google: 'ja'    },
  { col: 'F', name: '스페인어',     tinyld: 'es', google: 'es'    },
  { col: 'G', name: '독일어',       tinyld: 'de', google: 'de'    },
  { col: 'H', name: '인도네시아어', tinyld: 'id', google: 'id'    },
  { col: 'I', name: '베트남어',     tinyld: 'vi', google: 'vi'    },
  { col: 'J', name: '중국어(번체)', tinyld: 'zh', google: 'zh-TW' },
  { col: 'K', name: '러시아어',     tinyld: 'ru', google: 'ru'    },
] as const

export type LangEntry = (typeof LANG_MAP)[number]

export interface SheetData {
  name: string
  rows: StringRow[]
}
