'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SearchBar from '../components/SearchBar'
import { searchArticles } from '../lib/articles'
import { CATEGORY_SLUG_MAP } from '../lib/categories'
import type { CsCategory } from '../types'

const MATCH_BADGE: Record<'title' | 'body' | 'tag', { label: string; className: string }> = {
  title: { label: 'Title', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  body: { label: 'Body', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  tag: { label: 'Tag', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
}

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const results = searchArticles(q)

  return (
    <div>
      <div className="bg-[#1e3a5f] py-8 px-6">
        <h2 className="text-lg font-bold text-white mb-4">Search Results</h2>
        <SearchBar initialQuery={q} />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {results.length > 0 ? (
          <>
            <p className="text-xs text-gray-400 mb-5">
              &ldquo;{q}&rdquo; 검색 결과 {results.length}건
            </p>
            <div className="flex flex-col gap-3">
              {results.map(({ article, matchType }) => {
                const badge = MATCH_BADGE[matchType]
                const catMeta = CATEGORY_SLUG_MAP[article.category as CsCategory]
                return (
                  <div
                    key={article.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-default flex gap-4 items-start"
                  >
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 flex-shrink-0 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">
                        {article.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {article.excerpt}
                      </p>
                      <Link
                        href={`/cs/${article.category}`}
                        className="text-xs text-blue-500 hover:underline mt-2 inline-block"
                      >
                        {catMeta.icon} {catMeta.label}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200 mb-2">
              No results for &ldquo;{q}&rdquo;
            </h3>
            <p className="text-sm text-gray-400">
              다른 검색어를 시도하거나 카테고리를 탐색해보세요.
            </p>
            <Link
              href="/cs"
              className="inline-block mt-6 text-sm text-blue-500 hover:underline"
            >
              ← CS 홈으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
