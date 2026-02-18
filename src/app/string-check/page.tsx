'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import { LANG_MAP, type SheetData, type StringRow } from './types'
import { detectIssues } from './lib/detectIssues'
import { findExistingTranslations } from './lib/findExistingTranslations'
import UploadScreen from './components/UploadScreen'
import SummaryPanel from './components/SummaryPanel'
import StringTable from './components/StringTable'

export default function StringCheckPage() {
  const [phase, setPhase] = useState<'upload' | 'table'>('upload')
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheetName, setActiveSheetName] = useState<string>('')
  const [originalWorkbook, setOriginalWorkbook] = useState<WorkBook | null>(null)
  const [fileName, setFileName] = useState('')
  // 시트별 번역 중인 rowIndex Set
  const [translatingRows, setTranslatingRows] = useState<Record<string, Set<string>>>({})

  // ref: async 핸들러에서 항상 최신 sheets를 참조
  const sheetsRef = useRef<SheetData[]>([])

  const activeRows = sheets.find((s) => s.name === activeSheetName)?.rows ?? []

  function getSheetRows(sheetName: string): StringRow[] {
    return sheetsRef.current.find((s) => s.name === sheetName)?.rows ?? []
  }

  function updateSheetRows(sheetName: string, newRows: StringRow[]) {
    const newSheets = sheetsRef.current.map((s) =>
      s.name === sheetName ? { ...s, rows: newRows } : s,
    )
    sheetsRef.current = newSheets
    setSheets(newSheets)
  }

  function handleUpload(uploadedSheets: SheetData[], workbook: WorkBook, uploadedFileName: string) {
    sheetsRef.current = uploadedSheets
    setSheets(uploadedSheets)
    setActiveSheetName(uploadedSheets[0]?.name ?? '')
    setOriginalWorkbook(workbook)
    setFileName(uploadedFileName)
    setTranslatingRows({})
    setPhase('table')
  }

  function handleScrollToRow(index: string) {
    document.getElementById(`str-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleCellEdit(rowIndex: string, colIdx: number, value: string) {
    const newRows = getSheetRows(activeSheetName).map((row) => {
      if (row.index !== rowIndex) return row
      const newCells = [...row.cells]
      newCells[colIdx] = value
      const newFailed = { ...row.translateFailed }
      delete newFailed[colIdx]
      return { ...row, cells: newCells, translateFailed: newFailed }
    })
    updateSheetRows(activeSheetName, detectIssues(newRows))
  }

  async function translateRow(sheetName: string, rowIndex: string) {
    const row = getSheetRows(sheetName).find((r) => r.index === rowIndex)
    if (!row || !row.cells[0]?.trim()) return

    const korText = row.cells[0]

    if (korText.length > 2000) {
      alert(`한국어 텍스트가 2,000자를 초과합니다 (${korText.length}자). 번역을 진행할 수 없습니다.`)
      return
    }

    const targetCols = new Set<number>()
    for (let i = 1; i <= 9; i++) {
      if (!row.cells[i]?.trim() || row.translateFailed[i]) targetCols.add(i)
    }
    if (targetCols.size === 0) return

    const targetColIndices = [...targetCols]

    // 동일 시트 내 원문 재사용 탐지
    const reused = findExistingTranslations(
      getSheetRows(sheetName),
      korText,
      rowIndex,
      targetColIndices,
    )
    const needApiCols = targetColIndices.filter((col) => !(col in reused))

    if (Object.keys(reused).length > 0) {
      const withReused = getSheetRows(sheetName).map((r) => {
        if (r.index !== rowIndex) return r
        const newCells = [...r.cells]
        const newFailed = { ...r.translateFailed }
        for (const [col, val] of Object.entries(reused)) {
          newCells[Number(col)] = val
          delete newFailed[Number(col)]
        }
        return { ...r, cells: newCells, translateFailed: newFailed }
      })
      updateSheetRows(sheetName, detectIssues(withReused))
    }

    if (needApiCols.length === 0) return

    setTranslatingRows((prev) => ({
      ...prev,
      [sheetName]: new Set([...(prev[sheetName] ?? []), rowIndex]),
    }))

    try {
      const targets = needApiCols.map((col) => LANG_MAP[col].google)
      const res = await fetch('/api/string-check/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: korText, targets }),
      })

      const data: { translations?: Record<string, string>; error?: string } =
        await res.json().catch(() => ({}))

      if (!res.ok) {
        const withFailed = getSheetRows(sheetName).map((r) => {
          if (r.index !== rowIndex) return r
          const newFailed = { ...r.translateFailed }
          for (const col of needApiCols) newFailed[col] = true
          return { ...r, translateFailed: newFailed }
        })
        updateSheetRows(sheetName, withFailed)
        return
      }

      const translations = data.translations ?? {}
      const withTranslated = getSheetRows(sheetName).map((r) => {
        if (r.index !== rowIndex) return r
        const newCells = [...r.cells]
        const newFailed = { ...r.translateFailed }
        for (const col of needApiCols) {
          const lang = LANG_MAP[col].google
          if (translations[lang]) {
            newCells[col] = translations[lang]
            delete newFailed[col]
          } else {
            newFailed[col] = true
          }
        }
        return { ...r, cells: newCells, translateFailed: newFailed }
      })
      updateSheetRows(sheetName, detectIssues(withTranslated))
    } catch {
      const withFailed = getSheetRows(sheetName).map((r) => {
        if (r.index !== rowIndex) return r
        const newFailed = { ...r.translateFailed }
        for (const col of needApiCols) newFailed[col] = true
        return { ...r, translateFailed: newFailed }
      })
      updateSheetRows(sheetName, withFailed)
    } finally {
      setTranslatingRows((prev) => {
        const next = new Set(prev[sheetName] ?? [])
        next.delete(rowIndex)
        return { ...prev, [sheetName]: next }
      })
    }
  }

  async function translateSelected(rowIndices: string[]) {
    for (const rowIndex of rowIndices) {
      await translateRow(activeSheetName, rowIndex)
    }
  }

  async function translateAll() {
    const sheetRows = getSheetRows(activeSheetName)
    const translatableRows = sheetRows.filter(
      (r) => r.cells[0]?.trim() && r.cells.slice(1).some((c) => !c?.trim()),
    )
    if (translatableRows.length === 0) return

    const totalChars = translatableRows.reduce((sum, r) => sum + (r.cells[0]?.length ?? 0), 0)
    const confirmed = window.confirm(
      `[${activeSheetName}] ${translatableRows.length}개 행을 번역합니다.\n예상 소비 글자 수: 약 ${totalChars.toLocaleString()}자\n\n계속하시겠습니까?`,
    )
    if (!confirmed) return

    for (const row of translatableRows) {
      await translateRow(activeSheetName, row.index)
    }
  }

  function handleDownload() {
    if (!originalWorkbook || sheets.length === 0) return

    const wbData = XLSX.write(originalWorkbook, { bookType: 'xlsx', type: 'array' })
    const wb = XLSX.read(wbData, { type: 'array' })

    // 모든 시트 업데이트
    for (const sheet of sheetsRef.current) {
      const ws = wb.Sheets[sheet.name]
      if (!ws) continue

      const wsRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      const indexToXlsxRow = new Map<string, number>()
      for (let r = 3; r <= wsRange.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })]
        if (cell?.v != null) indexToXlsxRow.set(String(cell.v), r)
      }

      for (const row of sheet.rows) {
        const r = indexToXlsxRow.get(row.index)
        if (r === undefined) continue
        for (let colIdx = 0; colIdx < 10; colIdx++) {
          ws[XLSX.utils.encode_cell({ r, c: colIdx + 1 })] = {
            v: row.cells[colIdx] ?? '',
            t: 's',
          }
        }
      }
    }

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (phase === 'upload') {
    return <UploadScreen onUpload={handleUpload} />
  }

  const totalRows = sheets.reduce((sum, s) => sum + s.rows.length, 0)
  const activeTranslatingRows = translatingRows[activeSheetName] ?? new Set<string>()

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sheetsRef.current = []
              setSheets([])
              setActiveSheetName('')
              setOriginalWorkbook(null)
              setFileName('')
              setTranslatingRows({})
              setPhase('upload')
            }}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            다시 업로드
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 font-semibold transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            xlsx 다운로드
          </button>
        </div>
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

      {/* 요약 패널 */}
      <SummaryPanel rows={activeRows} onScrollToRow={handleScrollToRow} />

      {/* 문자열 테이블 */}
      <StringTable
        key={activeSheetName}
        rows={activeRows}
        translatingRows={activeTranslatingRows}
        onTranslateRow={(index) => translateRow(activeSheetName, index)}
        onTranslateAll={translateAll}
        onTranslateSelected={translateSelected}
        onCellEdit={handleCellEdit}
      />
    </div>
  )
}
