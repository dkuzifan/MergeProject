// src/app/p32/suika/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// --- 1. 기획서 기반 데이터 정의 (20단계) ---
type FruitConfig = {
  level: number;
  name: string;
  radius: number;
  color: string;
};

const INITIAL_FRUITS: FruitConfig[] = [
  { level: 1, name: "블루베리", radius: 12, color: "#4F46E5" }, // 보라색
  { level: 2, name: "크랜베리", radius: 16, color: "#DC2626" }, // 붉은색
  { level: 3, name: "체리", radius: 21, color: "#EF4444" }, // 밝은 빨강
  { level: 4, name: "포도", radius: 26, color: "#7C3AED" }, // 보라
  { level: 5, name: "산딸기", radius: 31, color: "#EC4899" }, // 핑크
  { level: 6, name: "딸기", radius: 37, color: "#F43F5E" }, // 레드핑크
  { level: 7, name: "방울토마토", radius: 43, color: "#EF4444" },
  { level: 8, name: "금귤", radius: 49, color: "#F59E0B" }, // 오렌지옐로우
  { level: 9, name: "살구", radius: 55, color: "#FB923C" }, // 주황
  { level: 10, name: "자두", radius: 62, color: "#7E22CE" }, // 진보라
  { level: 11, name: "라임", radius: 69, color: "#84CC16" }, // 라임색
  { level: 12, name: "레몬", radius: 76, color: "#FACC15" }, // 노랑
  { level: 13, name: "키위", radius: 83, color: "#65A30D" }, // 녹갈색
  { level: 14, name: "복숭아", radius: 91, color: "#FDBA74" }, // 살구색
  { level: 15, name: "사과", radius: 99, color: "#DC2626" }, // 빨강
  { level: 16, name: "배", radius: 107, color: "#EAB308" }, // 황금색
  { level: 17, name: "오렌지", radius: 115, color: "#EA580C" }, // 진한 주황
  { level: 18, name: "석류", radius: 124, color: "#9F1239" }, // 진홍색
  { level: 19, name: "멜론", radius: 133, color: "#86EFAC" }, // 연두색
  { level: 20, name: "수박", radius: 145, color: "#10B981" }, // 초록색
];

export default function SuikaPage() {
  // --- State 관리 ---
  // activeConfig: 실제 게임에 적용된 설정
  const [activeConfig, setActiveConfig] = useState<FruitConfig[]>(INITIAL_FRUITS);
  
  // editConfig: 입력 폼에서 수정 중인 설정 (적용 전)
  const [editConfig, setEditConfig] = useState<FruitConfig[]>(INITIAL_FRUITS);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [nextFruits, setNextFruits] = useState<FruitConfig[]>([]);

  // Canvas 참조 (추후 Matter.js 연결용)
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- 이벤트 핸들러 ---

  // 1. 설정값 변경 핸들러
  const handleConfigChange = (index: number, field: keyof FruitConfig, value: string | number) => {
    const newConfig = [...editConfig];
    newConfig[index] = { ...newConfig[index], [field]: value };
    setEditConfig(newConfig);
  };

  // 2. 적용 버튼: 수정된 내용을 실제 게임 설정으로 저장
  const applyConfig = () => {
    setActiveConfig(editConfig);
    alert("✅ 설정이 저장되었습니다. 다음 게임부터 적용됩니다.");
  };

  // 3. 게임 시작 버튼
  const startGame = () => {
    // 적용하지 않은 수정사항이 있다면 리셋
    if (JSON.stringify(activeConfig) !== JSON.stringify(editConfig)) {
      if (confirm("저장되지 않은 설정이 있습니다. 초기화하고 시작하시겠습니까?")) {
        setEditConfig(activeConfig);
      } else {
        return;
      }
    }

    setIsPlaying(true);
    generateNextFruits(); // 테스트용 '다음 과일' 생성
    console.log("Game Started with config:", activeConfig);
  };

  // 4. 테스트용 다음 과일 목록 생성 (랜덤)
  const generateNextFruits = () => {
    // 1~5단계 과일 중 랜덤으로 10개 생성
    const nextList = Array.from({ length: 10 }, () => {
      const randomIndex = Math.floor(Math.random() * 5); // 0~4
      return activeConfig[randomIndex];
    });
    setNextFruits(nextList);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      
      {/* 1. 기획 제목 & 2. 소개 */}
      <header className="mb-8 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-blue-600 dark:text-blue-400">
          🍎 Global Fruit Merge 20
        </h1>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="mb-2 text-lg">
            이 페이지는 <strong>20단계 과일 머지 게임</strong>의 물리 엔진 및 밸런스 테스트를 위한 프로토타입 공간입니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mb-4">
            <li>작은 과일을 합쳐 거대한 수박(20단계)을 만드는 것이 목표입니다.</li>
            <li>우측 패널에서 각 과일의 크기와 이름을 실시간으로 수정하여 테스트할 수 있습니다.</li>
          </ul>
          
          {/* 3. 기획서 링크 */}
          <Link 
            href="#" 
            target="_blank" 
            className="text-blue-500 hover:text-blue-700 underline text-sm"
          >
            📄 [참고] 과일 머지 게임 기획서 보기 (새 탭)
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- 좌측: 게임 영역 & 다음 과일 --- */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex gap-4 items-start">
            {/* 4. 테스트 플레이 영역 (Canvas) */}
            <div className="relative bg-amber-50 dark:bg-gray-800 border-4 border-amber-200 dark:border-gray-600 rounded-lg overflow-hidden shadow-lg w-[400px] h-[600px] flex-shrink-0">
              
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={600}
                className="w-full h-full block"
              />

              {/* 시작 버튼 오버레이 */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                  <button 
                    onClick={startGame}
                    className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-4 px-10 rounded-full shadow-xl transform transition hover:scale-105 active:scale-95"
                  >
                    GAME START
                  </button>
                </div>
              )}

              {/* 게임 플레이 중 표시될 임시 안내 */}
              {isPlaying && (
                <div className="absolute top-4 left-0 w-full text-center pointer-events-none opacity-50">
                  <span className="text-gray-500 font-bold">PHYSICS ENGINE AREA</span>
                </div>
              )}
            </div>

            {/* 5. 다음에 나올 과일 리스트 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-center mb-2 bg-gray-200 dark:bg-gray-700 py-1 rounded">Next</h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 h-[600px] overflow-y-auto w-24">
                {nextFruits.length > 0 ? (
                  <div className="flex flex-col gap-3 items-center">
                    {nextFruits.map((fruit, idx) => (
                      <div key={idx} className="flex flex-col items-center animate-fade-in-down">
                         <div 
                          className="rounded-full shadow-md border border-black/10"
                          style={{ 
                            width: Math.min(fruit.radius, 50) + 'px', // UI상 너무 크지 않게 제한
                            height: Math.min(fruit.radius, 50) + 'px',
                            backgroundColor: fruit.color
                          }}
                        />
                        <span className="text-xs text-gray-500 mt-1">{fruit.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center mt-10">대기 중...</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- 우측: 설정 패널 --- */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-[700px]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-bold">⚙️ 과일 밸런스 설정</h2>
              <p className="text-xs text-gray-500">수정 후 '적용하기'를 꼭 눌러주세요.</p>
            </div>
            <button 
              onClick={applyConfig}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg shadow transition"
            >
              적용하기
            </button>
          </div>

          {/* 6. 과일 속성 입력란 (스크롤 가능) */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {editConfig.map((fruit, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                
                {/* 단계 표시 */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full font-bold text-sm">
                  {fruit.level}
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2">
                  {/* 이름 입력 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">이름</label>
                    <input 
                      type="text" 
                      value={fruit.name}
                      onChange={(e) => handleConfigChange(index, "name", e.target.value)}
                      className="w-full text-sm p-1 border rounded dark:bg-gray-600 dark:border-gray-500"
                    />
                  </div>
                  
                  {/* 반지름 입력 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">반지름(px)</label>
                    <input 
                      type="number" 
                      value={fruit.radius}
                      onChange={(e) => handleConfigChange(index, "radius", Number(e.target.value))}
                      className="w-full text-sm p-1 border rounded dark:bg-gray-600 dark:border-gray-500"
                    />
                  </div>

                  {/* 색상 선택 */}
                  <div className="col-span-2 flex items-center gap-2">
                    <label className="text-xs text-gray-400">색상:</label>
                    <input 
                      type="color" 
                      value={fruit.color}
                      onChange={(e) => handleConfigChange(index, "color", e.target.value)}
                      className="h-6 w-12 cursor-pointer border-none bg-transparent"
                    />
                    <span className="text-xs text-gray-400">{fruit.color}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}