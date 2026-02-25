import Link from 'next/link'
import ContactForm from '../components/ContactForm'

export default function ContactPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] py-10 px-6">
        <p className="text-xs text-white/60 mb-3">
          <Link href="/cs" className="hover:text-white transition-colors">
            CS 홈
          </Link>{' '}
          &rsaquo; Contact Us
        </p>
        <h1 className="text-2xl font-extrabold text-white mb-1">Contact Us</h1>
        <p className="text-white/70 text-sm">
          문의 내용을 작성해 주세요. 빠르게 도와드리겠습니다.
        </p>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <ContactForm />
      </div>
    </div>
  )
}
