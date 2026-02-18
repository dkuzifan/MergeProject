'use client'

import { useRef, useState } from 'react'
import { LANG_MAP, type StringRow } from '../types'

interface Props {
  rows: StringRow[]
  translatingRows: Set<string>
  onTranslateRow: (index: string) => void
  onTranslateAll: () => void
  onTranslateSelected: (rowIndices: string[]) => void
  onCellEdit: (rowIndex: string, colIdx: number, value: string) => void
}

function issueTooltip(issue: StringRow['issues'][number] | undefined): string {
  if (!issue) return ''
  if (issue.reason === 'empty') return '빈 셀'
  if (issue.reason === 'wrong-lang') return `언어 오류 (감지: ${issue.detected})`
  return `공용 외래어 추정 (${issue.matchCount}/9개 언어 동일)`
}

export default function StringTable({
  rows,
  translatingRows,
  onTranslateRow,
  onTranslateAll,
  onTranslateSelected,
  onCellEdit,
}: Props) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: string; colIdx: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const isAnyTranslating = translatingRows.size > 0

  // 번역 가능한 행 (현재 번역 중이 아닌 행만)
  const translatableRows = rows.filter(
    (r) => !translatingRows.has(r.index) && !!r.cells[0]?.trim() && r.cells.slice(1).some((c) => !c?.trim()),
  )
  const translatableCount = rows.filter(
    (r) => r.cells[0]?.trim() && r.cells.slice(1).some((c) => !c?.trim()),
  ).length

  // 선택 상태 계산
  const selectedCount = translatableRows.filter((r) => selectedRows.has(r.index)).length
  const allSelected = translatableRows.length > 0 && translatableRows.every((r) => selectedRows.has(r.index))
  const someSelected = selectedCount > 0 && !allSelected

  function handleSelectRow(index: string, checked: boolean) {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      checked ? next.add(index) : next.delete(index)
      return next
    })
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedRows(new Set(translatableRows.map((r) => r.index)))
    } else {
      setSelectedRows(new Set())
    }
  }

  function handleTranslateSelected() {
    const toTranslate = translatableRows.filter((r) => selectedRows.has(r.index)).map((r) => r.index)
    if (toTranslate.length === 0) return
    setSelectedRows(new Set())
    onTranslateSelected(toTranslate)
  }

  function startEdit(rowIndex: string, colIdx: number, currentValue: string) {
    setEditingCell({ rowIndex, colIdx })
    setEditValue(currentValue)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    if (!editingCell) return
    onCellEdit(editingCell.rowIndex, editingCell.colIdx, editValue)
    setEditingCell(null)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* toolbar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          번역 대상{' '}
          <span className="font-bold text-blue-600 dark:text-blue-400">{translatableCount}행</span>
          {selectedCount > 0 && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              · {selectedCount}개 선택됨
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <button
              onClick={handleTranslateSelected}
              disabled={isAnyTranslating}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              선택 번역 ({selectedCount}행)
            </button>
          )}
          <button
            onClick={onTranslateAll}
            disabled={translatableCount === 0 || isAnyTranslating}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isAnyTranslating ? '번역 중...' : `전체 번역${translatableCount > 0 ? ` (${translatableCount}행)` : ''}`}
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse" style={{ minWidth: '1400px' }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <th className="sticky left-0 z-30 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold border-b-2 border-r-2 border-gray-200 dark:border-gray-600 w-24 min-w-[96px]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={translatableRows.length === 0 || isAnyTranslating}
                    className="w-3.5 h-3.5 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                    title="번역 대상 전체 선택/해제"
                  />
                  INDEX
                </div>
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
            {rows.map((row) => {
              const isTranslating = translatingRows.has(row.index)
              const isTranslatable =
                !isTranslating &&
                !!row.cells[0]?.trim() &&
                row.cells.slice(1).some((c) => !c?.trim())
              const isSelected = selectedRows.has(row.index)

              return (
                <tr
                  key={row.index}
                  id={`str-${row.index}`}
                  className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 group ${isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}
                >
                  {/* index + checkbox + translate button */}
                  <td className={`sticky left-0 z-10 border-r-2 border-gray-200 dark:border-gray-600 px-2 py-1.5 font-mono align-top transition-colors ${isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-white dark:bg-gray-900 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-950/10'}`}>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5">
                        {isTranslatable ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => { e.stopPropagation(); handleSelectRow(row.index, e.target.checked) }}
                            className="w-3.5 h-3.5 cursor-pointer accent-emerald-600 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-3.5 flex-shrink-0" />
                        )}
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">
                          {row.index}
                        </span>
                      </div>
                      {isTranslating ? (
                        <span className="text-[9px] text-blue-500 animate-pulse font-semibold pl-5">
                          번역 중...
                        </span>
                      ) : isTranslatable ? (
                        <button
                          onClick={() => onTranslateRow(row.index)}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap transition-colors ml-5"
                        >
                          번역
                        </button>
                      ) : null}
                    </div>
                  </td>

                  {/* language cells */}
                  {row.cells.map((cellValue, colIdx) => {
                    const issue = row.issues[colIdx]
                    const isFailed = !!row.translateFailed[colIdx]
                    const isCellTranslating = isTranslating && colIdx > 0
                    const isEditing =
                      editingCell?.rowIndex === row.index && editingCell?.colIdx === colIdx
                    const tooltip = issueTooltip(issue)

                    let bgClass = ''
                    if (isCellTranslating) bgClass = 'bg-blue-50 dark:bg-blue-950/40'
                    else if (isFailed && !cellValue) bgClass = 'bg-orange-50 dark:bg-orange-950/40'
                    else if (issue?.type === 'error') bgClass = 'bg-red-50 dark:bg-red-950/40'
                    else if (issue?.type === 'warning') bgClass = 'bg-yellow-50 dark:bg-yellow-950/40'

                    return (
                      <td
                        key={colIdx}
                        className={`border-r border-gray-100 dark:border-gray-700 p-0 ${bgClass}`}
                        title={tooltip || undefined}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none ring-2 ring-blue-400 ring-inset"
                          />
                        ) : isFailed && !cellValue ? (
                          <div
                            className="px-2 py-1.5 min-h-[32px] text-orange-500 dark:text-orange-400 text-[11px] italic cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                            onClick={() => onTranslateRow(row.index)}
                            title="클릭하여 번역 재시도"
                          >
                            번역 실패 — 재시도
                          </div>
                        ) : (
                          <div
                            className="px-2 py-1.5 min-h-[32px] text-gray-800 dark:text-gray-200 leading-relaxed cursor-text"
                            onClick={() => startEdit(row.index, colIdx, cellValue)}
                          >
                            {cellValue || (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
