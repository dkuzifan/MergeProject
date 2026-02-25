'use client'

import { useState } from 'react'
import { LANG_MAP, type SheetData } from './types'
import UploadScreen from './components/UploadScreen'
import SummaryPanel from './components/SummaryPanel'
import StringTable from './components/StringTable'

const BATCH_SIZE = 40

export default function StringCheckPage() {
  const [phase, setPhase] = useState<'upload' | 'table'>('upload')
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheetName, setActiveSheetName] = useState<string>('')
  const [fileName, setFileName] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 })
  const [checkError, setCheckError] = useState('')

  const activeRows = sheets.find((s) => s.name === activeSheetName)?.rows ?? []

  function handleUpload(uploadedSheets: SheetData[], uploadedFileName: string) {
    setSheets(uploadedSheets)
    setActiveSheetName(uploadedSheets[0]?.name ?? '')
    setFileName(uploadedFileName)
    setPhase('table')
    runLangCheck(uploadedSheets)
  }

  async function runLangCheck(uploadedSheets: SheetData[]) {
    const totalRows = uploadedSheets.reduce((sum, s) => sum + s.rows.length, 0)
    setIsChecking(true)
    setCheckProgress({ done: 0, total: totalRows })
    setCheckError('')

    let doneRows = 0

    for (const sheet of uploadedSheets) {
      const rows = sheet.rows

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchRows = rows.slice(i, i + BATCH_SIZE)

        // 빈 셀·외래어 제외한 셀만 전송
        const requestRows = batchRows
          .map((row) => {
            const cells: Array<{ colIdx: number; text: string; lang: string; langName: string }> = []
            for (let colIdx = 0; colIdx <= 9; colIdx++) {
              const issue = row.issues[colIdx]
              if (issue?.reason === 'empty' || issue?.reason === 'loanword') continue
              const text = row.cells[colIdx]?.replace(/[\r\n]+/g, ' ').trim()
              if (!text) continue
              cells.push({
                colIdx,
                text,
                lang: LANG_MAP[colIdx].google,
                langName: LANG_MAP[colIdx].name,
              })
            }
            return { index: row.index, cells }
          })
          .filter((r) => r.cells.length > 0)

        if (requestRows.length === 0) {
          doneRows += batchRows.length
          setCheckProgress({ done: doneRows, total: totalRows })
          continue
        }

        try {
          const res = await fetch('/api/string-check/lang-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: requestRows }),
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({})) as { error?: string }
            throw new Error(errData.error ?? `HTTP ${res.status}`)
          }

          const { issues } = await res.json() as {
            issues: Array<{ rowIndex: string; colIdx: number; detected: string }>
          }

          if (issues.length > 0) {
            setSheets((prev) =>
              prev.map((s) => {
                if (s.name !== sheet.name) return s
                return {
                  ...s,
                  rows: s.rows.map((r) => {
                    const rowIssues = issues.filter((iss) => iss.rowIndex === r.index)
                    if (rowIssues.length === 0) return r
                    const newIssues = { ...r.issues }
                    for (const iss of rowIssues) {
                      // loanword 경고 셀은 wrong-lang으로 덮어쓰지 않음
                      if (newIssues[iss.colIdx]?.reason === 'loanword') continue
                      newIssues[iss.colIdx] = { type: 'error', reason: 'wrong-lang', detected: iss.detected }
                    }
                    return { ...r, issues: newIssues }
                  }),
                }
              }),
            )
          }

          doneRows += batchRows.length
          setCheckProgress({ done: doneRows, total: totalRows })
        } catch (err) {
          const message = err instanceof Error ? err.message : '알 수 없는 오류'
          setCheckError(message)
          setIsChecking(false)
          return
        }
      }
    }

    setIsChecking(false)
  }

  function handleScrollToRow(index: string) {
    document.getElementById(`str-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (phase === 'upload') {
    return <UploadScreen onUpload={handleUpload} />
  }

  const totalRows = sheets.reduce((sum, s) => sum + s.rows.length, 0)

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-xs">
            {fileName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ({sheets.length}개 시트 · 총 {totalRows}행)
          </span>
        </div>
        <button
          onClick={() => {
            setSheets([])
            setActiveSheetName('')
            setFileName('')
            setPhase('upload')
          }}
          className="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          다시 업로드
        </button>
      </div>

      {/* 시트 탭 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 px-6">
        {sheets.map((sheet) => {
          const isActive = sheet.name === activeSheetName
          const errorCount = sheet.rows.reduce(
            (sum, r) =>
              sum + Object.values(r.issues).filter((i) => i.type === 'error').length,
            0,
          )
          return (
            <button
              key={sheet.name}
              onClick={() => setActiveSheetName(sheet.name)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {sheet.name}
              <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                ({sheet.rows.length})
              </span>
              {errorCount > 0 && (
                <span className="ml-1 text-[10px] bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded-full font-semibold">
                  {errorCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* AI 언어 검사 진행 배너 */}
      {isChecking && (
        <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm flex-shrink-0">
          <svg
            className="animate-spin w-4 h-4 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          AI 언어 검사 중... ({checkProgress.done}/{checkProgress.total}행)
        </div>
      )}
      {checkError && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex-shrink-0">
          언어 검사 실패: {checkError} — 빈 셀·외래어 검사만 표시됩니다.
        </div>
      )}

      {/* 요약 패널 */}
      <SummaryPanel rows={activeRows} onScrollToRow={handleScrollToRow} />

      {/* 문자열 테이블 */}
      <StringTable key={activeSheetName} rows={activeRows} />
    </div>
  )
}
