'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const OPTIONS = [
  { id: 'contrast', label: '고대비 모드', defaultOn: false },
  { id: 'largeText', label: '큰 텍스트', defaultOn: false },
  { id: 'reduceMotion', label: '애니메이션 줄이기', defaultOn: true },
  { id: 'screenReader', label: '화면 읽기 최적화', defaultOn: false },
]

export default function AccessibilityDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(OPTIONS.map((o) => [o.id, o.defaultOn]))
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                ♿ 접근성 설정
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-1">
              {OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {opt.label}
                  </span>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, [opt.id]: !prev[opt.id] }))
                    }
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                      settings[opt.id]
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        settings[opt.id] ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onClose}
                className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
