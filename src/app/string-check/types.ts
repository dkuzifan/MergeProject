export type CellIssue =
  | { type: 'error'; reason: 'empty' }
  | { type: 'error'; reason: 'wrong-lang'; detected: string }
  | { type: 'warning'; reason: 'loanword'; matchCount: number }

export interface StringRow {
  index: string
  cells: string[]                   // B~K 10개, cells[0]=한국어 … cells[9]=러시아어
  issues: Record<number, CellIssue> // colIdx(0~9) → 이슈
}

export const LANG_MAP = [
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

export type LangEntry = (typeof LANG_MAP)[number]

export interface SheetData {
  name: string
  rows: StringRow[]
}
