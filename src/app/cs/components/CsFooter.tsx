'use client'

import { useState } from 'react'
import Link from 'next/link'
import LanguageModal from './LanguageModal'
import CookieModal from './CookieModal'
import AccessibilityDrawer from './AccessibilityDrawer'

export default function CsFooter() {
  const [langOpen, setLangOpen] = useState(false)
  const [cookieOpen, setCookieOpen] = useState(false)
  const [a11yOpen, setA11yOpen] = useState(false)

  return (
    <>
      <footer className="bg-[#1e293b] text-slate-400 py-8 px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <button
              onClick={() => setLangOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              🌐 Language
            </button>
            <button
              onClick={() => setCookieOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              🍪 Cookie Settings
            </button>
            <button
              onClick={() => setA11yOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              ♿ Accessibility
            </button>
            <Link
              href="/cs/refund-guides"
              className="hover:text-slate-200 transition-colors"
            >
              📄 Refund Guides
            </Link>
          </div>
          <span className="text-xs">© 2026 MergeProject. All rights reserved.</span>
        </div>
      </footer>

      <LanguageModal open={langOpen} onClose={() => setLangOpen(false)} />
      <CookieModal open={cookieOpen} onClose={() => setCookieOpen(false)} />
      <AccessibilityDrawer open={a11yOpen} onClose={() => setA11yOpen(false)} />
    </>
  )
}
