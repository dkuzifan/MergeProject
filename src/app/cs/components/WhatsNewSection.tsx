const NEWS_ITEMS = [
  { id: 1, emoji: '📢', title: '봄 시즌 이벤트 안내', date: '2026.02.20' },
  { id: 2, emoji: '🎁', title: '로그인 보상 시스템 업데이트', date: '2026.02.15' },
  { id: 3, emoji: '🛠️', title: 'v2.3.1 패치 노트', date: '2026.02.10' },
  { id: 4, emoji: '💰', title: '결제 오류 임시 조치 안내', date: '2026.02.05' },
  { id: 5, emoji: '🔐', title: '계정 보안 강화 업데이트', date: '2026.01.28' },
  { id: 6, emoji: '🌍', title: '다국어 지원 지역 확대', date: '2026.01.20' },
]

export default function WhatsNewSection() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {NEWS_ITEMS.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-default"
        >
          <div className="h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center text-3xl">
            {item.emoji}
          </div>
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 leading-tight">
              {item.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
