'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import { LANG_MAP, type StringRow } from './types'
import { detectIssues } from './lib/detectIssues'
import { findExistingTranslations } from './lib/findExistingTranslations'
import UploadScreen from './components/UploadScreen'
import SummaryPanel from './components/SummaryPanel'
import StringTable from './components/StringTable'

export default function StringCheckPage() {
  const [phase, setPhase] = useState<'upload' | 'table'>('upload')
  const [rows, setRows] = useState<StringRow[]>([])
  const [originalWorkbook, setOriginalWorkbook] = useState<WorkBook | null>(null)
  const [fileName, setFileName] = useState('')
  const [translatingRows, setTranslatingRows] = useState<Set<string>>(new Set())

  // ref: async 핸들러에서 항상 최신 rows를 참조하기 위해 사용
  const rowsRef = useRef<StringRow[]>([])

  function updateRows(newRows: StringRow[]) {
    rowsRef.current = newRows
    setRows(newRows)
  }

  function handleUpload(uploadedRows: StringRow[], workbook: WorkBook, uploadedFileName: string) {
    rowsRef.current = uploadedRows
    setRows(uploadedRows)
    setOriginalWorkbook(workbook)
    setFileName(uploadedFileName)
    setTranslatingRows(new Set())
    setPhase('table')
  }

  function handleScrollToRow(index: string) {
    document.getElementById(`str-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleCellEdit(rowIndex: string, colIdx: number, value: string) {
    const newRows = rowsRef.current.map((row) => {
      if (row.index !== rowIndex) return row
      const newCells = [...row.cells]
      newCells[colIdx] = value
      const newFailed = { ...row.translateFailed }
      delete newFailed[colIdx]
      return { ...row, cells: newCells, translateFailed: newFailed }
    })
    updateRows(detectIssues(newRows))
  }

  async function translateRow(rowIndex: string) {
    const row = rowsRef.current.find((r) => r.index === rowIndex)
    if (!row || !row.cells[0]?.trim()) return

    const korText = row.cells[0]

    if (korText.length > 2000) {
      alert(`한국어 텍스트가 2,000자를 초과합니다 (${korText.length}자). 번역을 진행할 수 없습니다.`)
      return
    }

    // 번역이 필요한 컬럼: 빈 셀 + 이전에 실패한 셀
    const targetCols = new Set<number>()
    for (let i = 1; i <= 9; i++) {
      if (!row.cells[i]?.trim() || row.translateFailed[i]) targetCols.add(i)
    }
    if (targetCols.size === 0) return

    const targetColIndices = [...targetCols]

    // 파일 내 동일 원문 재사용 탐지
    const reused = findExistingTranslations(rowsRef.current, korText, rowIndex, targetColIndices)
    const needApiCols = targetColIndices.filter((col) => !(col in reused))

    // 재사용 번역 즉시 적용
    if (Object.keys(reused).length > 0) {
      const withReused = rowsRef.current.map((r) => {
        if (r.index !== rowIndex) return r
        const newCells = [...r.cells]
        const newFailed = { ...r.translateFailed }
        for (const [col, val] of Object.entries(reused)) {
          newCells[Number(col)] = val
          delete newFailed[Number(col)]
        }
        return { ...r, cells: newCells, translateFailed: newFailed }
      })
      updateRows(detectIssues(withReused))
    }

    if (needApiCols.length === 0) return

    // 번역 중 상태
    setTranslatingRows((prev) => new Set([...prev, rowIndex]))

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
        const withFailed = rowsRef.current.map((r) => {
          if (r.index !== rowIndex) return r
          const newFailed = { ...r.translateFailed }
          for (const col of needApiCols) newFailed[col] = true
          return { ...r, translateFailed: newFailed }
        })
        updateRows(withFailed)
        return
      }

      const translations = data.translations ?? {}
      const withTranslated = rowsRef.current.map((r) => {
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
      updateRows(detectIssues(withTranslated))
    } catch {
      const withFailed = rowsRef.current.map((r) => {
        if (r.index !== rowIndex) return r
        const newFailed = { ...r.translateFailed }
        for (const col of needApiCols) newFailed[col] = true
        return { ...r, translateFailed: newFailed }
      })
      updateRows(withFailed)
    } finally {
      setTranslatingRows((prev) => {
        const next = new Set(prev)
        next.delete(rowIndex)
        return next
      })
    }
  }

  async function translateAll() {
    const translatableRows = rowsRef.current.filter(
      (r) => r.cells[0]?.trim() && r.cells.slice(1).some((c) => !c?.trim()),
    )
    if (translatableRows.length === 0) return

    const totalChars = translatableRows.reduce((sum, r) => sum + (r.cells[0]?.length ?? 0), 0)
    const confirmed = window.confirm(
      `${translatableRows.length}개 행을 번역합니다.\n예상 소비 글자 수: 약 ${totalChars.toLocaleString()}자\n\n계속하시겠습니까?`,
    )
    if (!confirmed) return

    for (const row of translatableRows) {
      // rowsRef가 최신 상태를 반영하므로 각 행 번역 시 파일 내 재사용 탐지가 누적 적용됨
      await translateRow(row.index)
    }
  }

  function handleDownload() {
    if (!originalWorkbook || rows.length === 0) return

    // roundtrip 클론으로 원본 workbook 변경 방지
    const wbData = XLSX.write(originalWorkbook, { bookType: 'xlsx', type: 'array' })
    const wb = XLSX.read(wbData, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]

    // 열 A 값으로 xlsx 행 번호 매핑 (4행부터 스캔)
    const wsRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    const indexToXlsxRow = new Map<string, number>()
    for (let r = 3; r <= wsRange.e.r; r++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c: 0 })
      const cell = ws[cellAddr]
      if (cell?.v != null) indexToXlsxRow.set(String(cell.v), r)
    }

    // 편집된 데이터로 셀 업데이트 (B~K 컬럼)
    for (const row of rows) {
      const r = indexToXlsxRow.get(row.index)
      if (r === undefined) continue
      for (let colIdx = 0; colIdx < 10; colIdx++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c: colIdx + 1 })
        ws[cellAddr] = { v: row.cells[colIdx] ?? '', t: 's' }
      }
    }

    // 파일 다운로드
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

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-xs">
            {fileName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({rows.length}행)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              updateRows([])
              setOriginalWorkbook(null)
              setFileName('')
              setTranslatingRows(new Set())
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
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            xlsx 다운로드
          </button>
        </div>
      </div>

      {/* 요약 패널 */}
      <SummaryPanel rows={rows} onScrollToRow={handleScrollToRow} />

      {/* 문자열 테이블 */}
      <StringTable
        rows={rows}
        translatingRows={translatingRows}
        onTranslateRow={translateRow}
        onTranslateAll={translateAll}
        onCellEdit={handleCellEdit}
      />
    </div>
  )
}
