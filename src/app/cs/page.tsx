import Link from 'next/link'
import CsHeader from './components/CsHeader'
import SearchBar from './components/SearchBar'
import TopicGrid from './components/TopicGrid'
import WhatsNewSection from './components/WhatsNewSection'

export default function CsPage() {
  return (
    <>
      <CsHeader />
      <div className="py-6 px-6">
        <SearchBar />
      </div>
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="flex justify-end mb-8">
          <Link
            href="/cs/contact"
            className="inline-flex items-center gap-2 border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          >
            📬 문의 메일 보내기
          </Link>
        </div>

        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
          Topics
        </h2>
        <TopicGrid />

        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-12 mb-4">
          What&apos;s New?
        </h2>
        <WhatsNewSection />
      </div>
    </>
  )
}
