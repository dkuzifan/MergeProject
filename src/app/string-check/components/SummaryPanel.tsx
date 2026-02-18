'use client'

import { useState } from 'react'
import { LANG_MAP, type StringRow } from '../types'

interface RowGroup {
  index: string
  errors: { colIdx: number; label: string }[]
  warnings: { colIdx: number; label: string }[]
}

interface Props {
  rows: StringRow[]
  onScrollToRow: (index: string) => void
}

export default function SummaryPanel({ rows, onScrollToRow }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // rows에서 이슈 그룹 계산
  const errorGroups: RowGroup[] = []
  const warningGroups: RowGroup[] = []
  let totalErrors = 0
  let totalWarnings = 0

  for (const row of rows) {
    const errors: RowGroup['errors'] = []
    const warnings: RowGroup['warnings'] = []
    for (const [colStr, issue] of Object.entries(row.issues)) {
      const col = Number(colStr)
      const label = LANG_MAP[col].name
      if (issue.type === 'error') errors.push({ colIdx: col, label })
      else warnings.push({ colIdx: col, label })
    }
    if (errors.length > 0) {
      errorGroups.push({ index: row.index, errors, warnings: [] })
      totalErrors += errors.length
    }
    if (warnings.length > 0) {
      warningGroups.push({ index: row.index, errors: [], warnings })
      totalWarnings += warnings.length
    }
  }

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderGroup(group: RowGroup, type: 'error' | 'warning', idPrefix: string) {
    const id = `${idPrefix}-${group.index}`
    const isExpanded = expandedGroups.has(id)
    const items = type === 'error' ? group.errors : group.warnings
    const tagClass = type === 'error'
      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
    const dotClass = type === 'error' ? 'bg-red-500' : 'bg-yellow-400'

    return (
      <li key={id} className="rounded-md overflow-hidden">
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => toggleGroup(id)}
        >
          <button
            className="text-xs font-bold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onScrollToRow(group.index) }}
            title="해당 행으로 이동"
          >
            {group.index}
          </button>
          <div className="flex flex-wrap gap-1 flex-1">
            {items.map((item) => (
              <span key={item.colIdx} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagClass}`}>
                {item.label}
              </span>
            ))}
          </div>
          <span className={`text-[10px] text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
        {isExpanded && (
          <div className="flex flex-col gap-0.5 pb-1.5 pl-7">
            {items.map((item) => (
              <div key={item.colIdx} className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="text-gray-300">└</span>
                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                <span>{item.label} — {
                  (() => {
                    const issue = rows.find(r => r.index === group.index)?.issues[item.colIdx]
                    if (!issue) return ''
                    if (issue.reason === 'empty') return '빈 셀'
                    if (issue.reason === 'wrong-lang') return `언어 오류 (감지: ${issue.detected})`
                    if (issue.reason === 'loanword') return `공용 외래어 추정 (${issue.matchCount}/9개 언어 동일)`
                  })()
                }</span>
              </div>
            ))}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="flex gap-3 flex-wrap px-6 py-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700">
      {/* 🔴 수정 필요 */}
      <div className="flex-1 min-w-[200px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-800 dark:text-white">
          🔴 수정 필요
          <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-full px-2 py-0.5 text-xs font-bold">
            {errorGroups.length}행 · {totalErrors}건
          </span>
        </div>
        {errorGroups.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">수정 필요 항목 없음</p>
        ) : (
          <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {errorGroups.map((g) => renderGroup(g, 'error', 'err'))}
          </ul>
        )}
      </div>

      {/* 🟡 경고 */}
      <div className="flex-1 min-w-[200px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-800 dark:text-white">
          🟡 경고
          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 rounded-full px-2 py-0.5 text-xs font-bold">
            {warningGroups.length}행 · {totalWarnings}건
          </span>
        </div>
        {warningGroups.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">경고 항목 없음</p>
        ) : (
          <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {warningGroups.map((g) => renderGroup(g, 'warning', 'warn'))}
          </ul>
        )}
      </div>

      {/* 📊 현황 */}
      <div className="w-44 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="mb-2 font-semibold text-sm text-gray-800 dark:text-white">📊 현황</div>
        <div className="flex flex-col gap-2 text-xs">
          {[
            { label: '전체 행', value: rows.length, color: 'text-gray-700 dark:text-gray-300' },
            { label: '번역 대상', value: rows.filter(r => r.cells[0] && r.cells.slice(1).some(c => !c?.trim())).length, color: 'text-blue-600 dark:text-blue-400' },
            { label: '오류', value: totalErrors, color: 'text-red-600 dark:text-red-400' },
            { label: '경고', value: totalWarnings, color: 'text-yellow-600 dark:text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className={`font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
