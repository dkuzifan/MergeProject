import { notFound } from 'next/navigation'
import Link from 'next/link'
import { VALID_CATEGORY_SLUGS, CATEGORY_SLUG_MAP } from '../lib/categories'
import { ARTICLES } from '../lib/articles'
import type { CsCategory } from '../types'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  if (!VALID_CATEGORY_SLUGS.has(category as CsCategory)) {
    notFound()
  }

  const slug = category as CsCategory
  const meta = CATEGORY_SLUG_MAP[slug]
  const articles = ARTICLES.filter((a) => a.category === slug)

  return (
    <div>
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#1d4ed8] py-10 px-6">
        <p className="text-xs text-white/60 mb-3">
          <Link href="/cs" className="hover:text-white transition-colors">
            CS 홈
          </Link>{' '}
          &rsaquo; {meta.label}
        </p>
        <h1 className="text-2xl font-extrabold text-white mb-1">
          {meta.icon} {meta.label}
        </h1>
        <p className="text-white/70 text-sm">{meta.description}</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-xs text-gray-400 mb-5">{articles.length}개 아티클</p>
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-default"
            >
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">
                {article.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {article.excerpt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
