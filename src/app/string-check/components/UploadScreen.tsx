'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'
import { detectIssues } from '../lib/detectIssues'
import type { StringRow } from '../types'

interface Props {
  onUpload: (rows: StringRow[], workbook: WorkBook, fileName: string) => void
}

export default function UploadScreen({ onUpload }: Props) {
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    setError('')
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('xlsx 파일만 지원합니다.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const ws = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
          header: 1,
          defval: '',
        })

        // 4행(index 3)부터 데이터, 최소 11컬럼 검증
        if (rawRows.length < 4 || (rawRows[3] as unknown[]).length < 11) {
          setError('파일 구조가 올바르지 않습니다. 4행~부터 데이터가 있는 xlsx 파일을 업로드해주세요.')
          return
        }

        const dataRows: StringRow[] = (rawRows.slice(3) as (string | number | null)[][])
          .filter((row) => row[0] !== '' && row[0] != null)
          .map((row) => ({
            index: String(row[0] ?? ''),
            cells: Array.from({ length: 10 }, (_, i) => String(row[i + 1] ?? '')),
            issues: {},
            translateFailed: {},
          }))

        if (dataRows.length === 0) {
          setError('데이터 행이 없습니다.')
          return
        }

        const detected = detectIssues(dataRows)
        onUpload(detected, workbook, file.name)
      } catch {
        setError('파일을 읽는 중 오류가 발생했습니다.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center p-8">
      <div
        className={`w-full max-w-md rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all
          ${dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
          }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <svg className="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <p className="mb-2 text-lg font-bold text-gray-800 dark:text-white">
          string.xlsx 파일을 업로드하세요
        </p>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          드래그&드롭하거나 클릭하여 파일을 선택하세요
        </p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          파일 선택
        </button>
        <p className="mt-4 text-xs text-gray-400">.xlsx 파일만 지원 · 브라우저 내 처리 (서버 미저장)</p>
      </div>

      {error && (
        <div className="mt-4 w-full max-w-md rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />
    </div>
  )
}
