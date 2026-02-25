import Link from 'next/link'
import type { CategoryMeta } from '../types'

export default function TopicCard({ category }: { category: CategoryMeta }) {
  return (
    <Link
      href={`/cs/${category.slug}`}
      className="group flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
    >
      <span className="text-3xl mb-3">{category.icon}</span>
      <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {category.label}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {category.description}
      </p>
    </Link>
  )
}
