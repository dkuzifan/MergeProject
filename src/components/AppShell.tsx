'use client'

// 로그인 페이지(/login)에서는 Navbar/Footer를 숨기고
// 나머지 모든 페이지에서는 Navbar/Footer를 표시하는 레이아웃 쉘입니다
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        {children}
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main className="p-4">{children}</main>
      <footer className="p-4 bg-gray-100 dark:bg-gray-900 text-center text-xs text-gray-500 mt-10">
        © 2025 My First Next.js App
      </footer>
    </>
  )
}
