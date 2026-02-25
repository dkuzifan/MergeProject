'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function CookieModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-80 max-w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
            🍪 쿠키 설정
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 mb-5">
          <CookieRow
            label="필수 쿠키"
            description="서비스 운영에 반드시 필요"
            enabled
            locked
          />
          <CookieRow
            label="분석 쿠키"
            description="서비스 개선을 위한 이용 통계"
            enabled={analytics}
            onChange={setAnalytics}
          />
          <CookieRow
            label="마케팅 쿠키"
            description="맞춤형 광고 및 콘텐츠 제공"
            enabled={marketing}
            onChange={setMarketing}
          />
        </div>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
        >
          저장 후 닫기
        </button>
      </div>
    </div>
  )
}

function CookieRow({
  label,
  description,
  enabled,
  locked,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  locked?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        disabled={locked}
        onClick={() => onChange?.(!enabled)}
        className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
          enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            enabled ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}
