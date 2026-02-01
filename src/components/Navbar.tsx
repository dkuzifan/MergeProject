// src/components/Navbar.tsx
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="relative z-50 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-black dark:text-white flex justify-between items-center transition-all duration-300">
      
      {/* [좌측 그룹] 로고 + 메뉴 */}
      <div className="flex items-center space-x-32">
        
        {/* 1. 원형 로고 */}
        <Link href="/" className="flex-shrink-0 group">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:bg-blue-500 group-hover:scale-105 transition-all duration-300">
            <span className="text-white font-bold text-sm tracking-widest">
              MERGE
            </span>
          </div>
        </Link>
        
        {/* 2. 좌측 메뉴 (드롭다운) */}
        <div className="flex items-center space-x-40">
          
          {/* === P32 드롭다운 메뉴 === */}
          <div className="relative group py-4">
            <Link href="/p32" className="relative z-10 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-bold text-xl transition duration-300">
              P32
            </Link>
            
            {/* 드롭다운 패널 */}
            {/* [수정 포인트] mt-2(마진)를 삭제하고 pt-4(패딩)를 추가했습니다. */}
            {/* 이제 텍스트와 박스 사이의 빈 공간도 '클릭 가능한 영역'으로 인식됩니다. */}
            <div className="absolute top-full left-0 pt-4 w-48 hidden group-hover:block animation-fade-in">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5">
                <div className="p-2 space-y-1">
                  <Link href="/p32/suika" className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-blue-600 transition duration-200">
                    🍉 수박 게임
                  </Link>
                  <Link href="/p32/cardpack" className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-blue-600 transition duration-200">
                    🃏 카드팩
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* === P40 드롭다운 메뉴 === */}
          <div className="relative group py-4">
            <Link href="/p40" className="relative z-10 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-bold text-xl transition duration-300">
              P40
            </Link>

            {/* 드롭다운 패널 */}
            {/* [수정 포인트] 여기도 mt-2 -> pt-4 로 변경 */}
            <div className="absolute top-full left-0 pt-4 w-48 hidden group-hover:block animation-fade-in">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5">
                 <div className="p-2">
                  <div className="block px-4 py-3 text-sm text-gray-400 text-center italic cursor-default rounded-xl hover:bg-white/20">
                    🚧 Coming Soon
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* [우측 그룹] 다크모드 토글 */}
      <div>
        <ThemeToggle />
      </div>
      
    </nav>
  );
}