'use client'

import { useState } from 'react'
import { LANG_MAP, type StringRow } from '../types'

interface Props {
  rows: StringRow[]
  onScrollToRow: (index: string) => void
}

type GroupItem = { colIdx: number; label: string }
type RowGroup = { index: string; items: GroupItem[] }

export default function SummaryPanel({ rows, onScrollToRow }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // 이슈 그룹 계산
  const errorGroups: RowGroup[] = []
  const warningGroups: RowGroup[] = []
  const translateGroups: RowGroup[] = []
  let totalErrors = 0
  let totalWarnings = 0

  for (const row of rows) {
    const errors: GroupItem[] = []
    const warnings: GroupItem[] = []

    for (const [colStr, issue] of Object.entries(row.issues)) {
      const col = Number(colStr)
      const label = LANG_MAP[col].name
      if (issue.type === 'error') errors.push({ colIdx: col, label })
      else warnings.push({ colIdx: col, label })
    }

    if (errors.length > 0) {
      errorGroups.push({ index: row.index, items: errors })
      totalErrors += errors.length
    }
    if (warnings.length > 0) {
      warningGroups.push({ index: row.index, items: warnings })
      totalWarnings += warnings.length
    }

    // 번역 대상: 한국어 있고 다른 언어 중 하나라도 비어있는 행
    if (row.cells[0]?.trim()) {
      const missingCols = row.cells
        .slice(1)
        .map((c, i) => ({ colIdx: i + 1, label: LANG_MAP[i + 1].name, empty: !c?.trim() }))
        .filter(({ empty }) => empty)
        .map(({ colIdx, label }) => ({ colIdx, label }))

      if (missingCols.length > 0) {
        translateGroups.push({ index: row.index, items: missingCols })
      }
    }
  }

  function renderGroupList(
    groups: RowGroup[],
    prefix: string,
    tagClass: string,
    dotClass: string,
    getDetail: (rowIndex: string, colIdx: number) => string,
  ) {
    return groups.map((group) => {
      const id = `${prefix}-${group.index}`
      const isExpanded = expandedGroups.has(id)
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
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {group.items.map((item) => (
                <span key={item.colIdx} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagClass}`}>
                  {item.label}
                </span>
              ))}
            </div>
            <span className={`text-[10px] text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
          </div>
          {isExpanded && (
            <div className="flex flex-col gap-0.5 pb-1.5 pl-7">
              {group.items.map((item) => (
                <div key={item.colIdx} className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="text-gray-300">└</span>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                  <span>{item.label} — {getDetail(group.index, item.colIdx)}</span>
                </div>
              ))}
            </div>
          )}
        </li>
      )
    })
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-6 py-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      {/* 🔴 수정 필요 */}
      <div className="min-w-[220px] flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
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
            {renderGroupList(
              errorGroups,
              'err',
              'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700',
              'bg-red-500',
              (rowIndex, colIdx) => {
                const issue = rows.find(r => r.index === rowIndex)?.issues[colIdx]
                if (!issue) return ''
                if (issue.reason === 'empty') return '빈 셀'
                if (issue.reason === 'wrong-lang') return `언어 오류 (감지: ${issue.detected})`
                return ''
              },
            )}
          </ul>
        )}
      </div>

      {/* 🟡 경고 */}
      <div className="min-w-[220px] flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
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
            {renderGroupList(
              warningGroups,
              'warn',
              'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
              'bg-yellow-400',
              (rowIndex, colIdx) => {
                const issue = rows.find(r => r.index === rowIndex)?.issues[colIdx]
                if (!issue) return ''
                if (issue.reason === 'loanword') return `공용 외래어 추정 (${issue.matchCount}/9개 언어 동일)`
                return ''
              },
            )}
          </ul>
        )}
      </div>

      {/* 🔵 번역 대상 */}
      <div className="min-w-[220px] flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-800 dark:text-white">
          🔵 번역 대상
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2 py-0.5 text-xs font-bold">
            {translateGroups.length}행
          </span>
        </div>
        {translateGroups.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">번역 대상 없음</p>
        ) : (
          <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {renderGroupList(
              translateGroups,
              'trans',
              'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
              'bg-blue-500',
              () => '번역 필요',
            )}
          </ul>
        )}
      </div>

      {/* 📊 현황 */}
      <div className="w-44 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="mb-2 font-semibold text-sm text-gray-800 dark:text-white">📊 현황</div>
        <div className="flex flex-col gap-2 text-xs">
          {[
            { label: '전체 행', value: rows.length, color: 'text-gray-700 dark:text-gray-300' },
            { label: '번역 대상', value: translateGroups.length, color: 'text-blue-600 dark:text-blue-400' },
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
