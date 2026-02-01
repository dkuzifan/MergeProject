// src/app/page.tsx
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
      <h1 className="text-6xl font-bold text-gray-800 dark:text-white">
        머지팀 작업실
      </h1>
      <p className="text-xl text-gray-500">
        상단 메뉴에서 프로젝트를 선택해주세요.
      </p>
    </div>
  );
}