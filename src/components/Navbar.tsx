// src/components/Navbar.tsx
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-900 text-black dark:text-white">
      
      <div className="font-bold text-xl">내 웹사이트</div>
      
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-blue-500 hover:text-blue-700">
          홈
        </Link>
        <Link href="/about" className="text-blue-500 hover:text-blue-700">
          소개
        </Link>
        
        {/* ▼▼▼ 여기 추가했습니다! ▼▼▼ */}
        <Link href="/guestbook" className="text-blue-500 hover:text-blue-700 font-bold">
          방명록
        </Link>
        {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

        {/* 다크모드 스위치 */}
        <ThemeToggle />
      </div>
    </nav>
  );
}