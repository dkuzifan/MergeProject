'use client'

import { LANG_MAP, type StringRow } from '../types'

interface Props {
  rows: StringRow[]
}

function issueTooltip(issue: StringRow['issues'][number] | undefined): string {
  if (!issue) return ''
  if (issue.reason === 'empty') return '빈 셀'
  if (issue.reason === 'wrong-lang') return `언어 오류 (감지: ${issue.detected})`
  return `공용 외래어 추정 (${issue.matchCount}/9개 언어 동일)`
}

export default function StringTable({ rows }: Props) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-xs border-collapse" style={{ minWidth: '1400px' }}>
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <th className="sticky left-0 z-30 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold border-b-2 border-r-2 border-gray-200 dark:border-gray-600 w-20 min-w-[80px]">
              INDEX
            </th>
            {LANG_MAP.map((lang) => (
              <th
                key={lang.col}
                className="px-3 py-2 text-left font-semibold border-b-2 border-r border-gray-200 dark:border-gray-600 min-w-[140px]"
              >
                <span className="text-gray-400 dark:text-gray-500 font-mono text-[10px] mr-1">
                  {lang.col}
                </span>
                {lang.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.index}
              id={`str-${row.index}`}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
            >
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-r-2 border-gray-200 dark:border-gray-600 px-3 py-1.5 font-mono font-semibold text-[11px] text-gray-600 dark:text-gray-400 align-top">
                {row.index}
              </td>
              {row.cells.map((cellValue, colIdx) => {
                const issue = row.issues[colIdx]
                const tooltip = issueTooltip(issue)

                let bgClass = ''
                if (issue?.type === 'error' && issue.reason === 'empty')
                  bgClass = 'bg-white dark:bg-gray-900 ring-1 ring-inset ring-red-300 dark:ring-red-700'
                else if (issue?.type === 'error')
                  bgClass = 'bg-red-50 dark:bg-red-950/40'
                else if (issue?.type === 'warning')
                  bgClass = 'bg-yellow-50 dark:bg-yellow-950/40'

                return (
                  <td
                    key={colIdx}
                    className={`border-r border-gray-100 dark:border-gray-700 p-0 ${bgClass}`}
                    title={tooltip || undefined}
                  >
                    <div className="px-2 py-1.5 min-h-[32px] text-gray-800 dark:text-gray-200 leading-relaxed">
                      {cellValue || (
                        <span className={issue?.reason === 'empty' ? 'text-red-400 dark:text-red-500' : 'text-gray-300 dark:text-gray-600'}>
                          —
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
