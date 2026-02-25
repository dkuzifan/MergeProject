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
        <div className="flex justify-center mb-10">
          <Link
            href="/cs/contact"
            className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-10 py-5 rounded-2xl text-lg font-extrabold shadow-lg hover:shadow-xl transition-all"
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
