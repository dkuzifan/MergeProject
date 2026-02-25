'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  function handleSearch() {
    if (!query.trim()) return
    router.push(`/cs/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-xl mx-auto px-4 py-2 gap-2">
      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <input
        type="text"
        className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
        placeholder="검색어를 입력하세요..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button
        onClick={handleSearch}
        disabled={!query.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
      >
        검색
      </button>
    </div>
  )
}
