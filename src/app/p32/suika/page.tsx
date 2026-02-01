// src/app/p32/suika/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Matter from "matter-js";

// --- 1. 마스터 데이터 ---
type FruitDef = {
  id: number;
  name: string;
  defaultRadius: number;
  defaultColor: string;
};

const FRUIT_POOL: FruitDef[] = [
  { id: 1, name: "블루베리", defaultRadius: 12, defaultColor: "#4F46E5" },
  { id: 2, name: "크랜베리", defaultRadius: 16, defaultColor: "#DC2626" },
  { id: 3, name: "체리", defaultRadius: 21, defaultColor: "#EF4444" },
  { id: 4, name: "포도", defaultRadius: 26, defaultColor: "#7C3AED" },
  { id: 5, name: "산딸기", defaultRadius: 31, defaultColor: "#EC4899" },
  { id: 6, name: "딸기", defaultRadius: 37, defaultColor: "#F43F5E" },
  { id: 7, name: "방울토마토", defaultRadius: 43, defaultColor: "#EF4444" },
  { id: 8, name: "금귤", defaultRadius: 49, defaultColor: "#F59E0B" },
  { id: 9, name: "살구", defaultRadius: 55, defaultColor: "#FB923C" },
  { id: 10, name: "자두", defaultRadius: 62, defaultColor: "#7E22CE" },
  { id: 11, name: "라임", defaultRadius: 69, defaultColor: "#84CC16" },
  { id: 12, name: "레몬", defaultRadius: 76, defaultColor: "#FACC15" },
  { id: 13, name: "키위", defaultRadius: 83, defaultColor: "#65A30D" },
  { id: 14, name: "복숭아", defaultRadius: 91, defaultColor: "#FDBA74" },
  { id: 15, name: "사과", defaultRadius: 99, defaultColor: "#DC2626" },
  { id: 16, name: "배", defaultRadius: 107, defaultColor: "#EAB308" },
  { id: 17, name: "오렌지", defaultRadius: 115, defaultColor: "#EA580C" },
  { id: 18, name: "석류", defaultRadius: 124, defaultColor: "#9F1239" },
  { id: 19, name: "멜론", defaultRadius: 133, defaultColor: "#86EFAC" },
  { id: 20, name: "수박", defaultRadius: 145, defaultColor: "#10B981" },
];

type GameFruitConfig = {
  stage: number;
  poolId: number;
  name: string;
  radius: number;
  color: string;
};

export default function SuikaPage() {
  const DEFAULT_COUNT = 11;
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 700;

  // 초기 설정 생성
  const createInitialConfig = (count: number): GameFruitConfig[] => {
    return Array.from({ length: count }, (_, i) => {
      const poolFruit = FRUIT_POOL[i % FRUIT_POOL.length];
      return {
        stage: i + 1,
        poolId: poolFruit.id,
        name: poolFruit.name,
        radius: poolFruit.defaultRadius,
        color: poolFruit.defaultColor,
      };
    });
  };

  const [activeConfig, setActiveConfig] = useState<GameFruitConfig[]>(createInitialConfig(DEFAULT_COUNT));
  const [editConfig, setEditConfig] = useState<GameFruitConfig[]>(createInitialConfig(DEFAULT_COUNT));
  const [stageCount, setStageCount] = useState(DEFAULT_COUNT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nextFruits, setNextFruits] = useState<GameFruitConfig[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // --- UI 핸들러 ---
  const handleStageCountChange = (newCount: number) => {
    if (newCount < 2) newCount = 2;
    if (newCount > 20) newCount = 20;
    setStageCount(newCount);

    const newConfig = [...editConfig];
    if (newCount > newConfig.length) {
      for (let i = newConfig.length; i < newCount; i++) {
        const poolFruit = FRUIT_POOL[i % FRUIT_POOL.length];
        newConfig.push({
          stage: i + 1,
          poolId: poolFruit.id,
          name: poolFruit.name,
          radius: poolFruit.defaultRadius,
          color: poolFruit.defaultColor,
        });
      }
    } else {
      newConfig.splice(newCount);
    }
    setEditConfig(newConfig);
  };

  const handleBaseFruitChange = (index: number, newPoolId: number) => {
    const target = FRUIT_POOL.find(f => f.id === newPoolId);
    if (!target) return;
    const newConfig = [...editConfig];
    newConfig[index] = {
      ...newConfig[index],
      poolId: target.id,
      name: target.name,
      radius: target.defaultRadius,
      color: target.defaultColor,
    };
    setEditConfig(newConfig);
  };

  const handlePropertyChange = (index: number, field: keyof GameFruitConfig, value: string | number) => {
    const newConfig = [...editConfig];
    newConfig[index] = { ...newConfig[index], [field]: value };
    setEditConfig(newConfig);
  };

  const applyConfig = () => {
    setActiveConfig(editConfig);
    alert(`✅ 설정 저장 완료! (총 ${editConfig.length}단계)`);
  };

  const startGame = () => {
    if (JSON.stringify(activeConfig) !== JSON.stringify(editConfig)) {
      if (confirm("설정이 변경되었습니다. 초기화하고 시작하시겠습니까?")) {
        setEditConfig(activeConfig);
        setStageCount(activeConfig.length);
      } else {
        return;
      }
    }
    const initialNext = Array.from({ length: 5 }, () => getRandomFruit(activeConfig));
    setNextFruits(initialNext);
    setIsPlaying(true);
  };

  const stopGame = () => {
    setIsPlaying(false);
  };

  const getRandomFruit = (config: GameFruitConfig[]) => {
    const maxIndex = Math.max(0, Math.floor((config.length - 1) * 0.4));
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
    return config[randomIndex];
  };

  // --- 물리 엔진 로직 ---
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;

    // 1. 엔진 생성
    const engine = Matter.Engine.create();
    const world = engine.world;
    engineRef.current = engine;

    // 2. 렌더러 생성
    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: false, // false여야 색깔이 보입니다
        background: "transparent", // 투명이어야 뒤 배경색이 보입니다
      },
    });
    renderRef.current = render;

    // 3. 벽 생성 (바닥 보정 적용됨)
    const wallOptions = { isStatic: true, render: { fillStyle: "#8b5cf6" } };
    
    // 바닥 위치: 캔버스 높이(700)에 중심을 두어, 상단 30px(670~700)이 실제 바닥 역할
    const ground = Matter.Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT, CANVAS_WIDTH, 60, wallOptions);
    const leftWall = Matter.Bodies.rectangle(-30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT * 2, wallOptions);
    const rightWall = Matter.Bodies.rectangle(CANVAS_WIDTH + 30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT * 2, wallOptions);

    Matter.World.add(world, [ground, leftWall, rightWall]);

    // 4. 실행
    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    // ✅ Cleanup (뒷정리)
    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
      
      // ❌ [삭제 필] 아래 코드가 캔버스를 화면에서 지워버리는 범인이었습니다.
      // render.canvas.remove(); 
    };
  }, [isPlaying, activeConfig]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying || !engineRef.current || nextFruits.length === 0) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const currentFruit = nextFruits[0];
    const safeRadius = currentFruit.radius;
    const clampedX = Math.max(safeRadius, Math.min(x, CANVAS_WIDTH - safeRadius));

    const fruitBody = Matter.Bodies.circle(clampedX, 50, currentFruit.radius, {
      restitution: 0.3,
      render: { fillStyle: currentFruit.color },
      label: `fruit_${currentFruit.stage}`,
    });

    Matter.World.add(engineRef.current.world, fruitBody);

    const newNextList = [...nextFruits.slice(1), getRandomFruit(activeConfig)];
    setNextFruits(newNextList);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
      
      <header className="mb-6 max-w-[1400px] mx-auto flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            🍉 Custom Merge Simulator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            나만의 과일 덱을 짜서 테스트해보세요.
          </p>
        </div>
        <div className="text-right">
           <Link href="#" className="text-sm text-gray-400 hover:text-blue-500 underline">기획서 보기</Link>
        </div>
      </header>

      {/* [수정 포인트 1] 레이아웃 변경: Grid 제거하고 Flex + 중앙 정렬로 변경 */}
      <main className="flex flex-col lg:flex-row justify-center gap-8 items-start">
        
        {/* --- 좌측 그룹: 게임 플레이 (캔버스 + 넥스트) --- */}
        <div className="flex gap-4">
          
          {/* 게임 캔버스 컨테이너 */}
          <div 
            className="relative bg-amber-50 dark:bg-gray-800 border-4 border-amber-200 dark:border-gray-600 rounded-lg overflow-hidden shadow-2xl flex-shrink-0 cursor-crosshair select-none"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            onClick={handleCanvasClick}
          >
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block" />

            {!isPlaying && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <h2 className="text-white text-3xl font-bold mb-6 drop-shadow-md">Ready?</h2>
                <button 
                  onClick={startGame}
                  className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-4 px-12 rounded-full shadow-xl transition transform hover:scale-105"
                >
                  GAME START
                </button>
              </div>
            )}

            {isPlaying && (
              <button
                onClick={(e) => { e.stopPropagation(); stopGame(); }}
                className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md z-30 text-sm backdrop-blur-md transition"
              >
                ⏹ End Game
              </button>
            )}
          </div>

          {/* Next 리스트 (바로 옆에 붙임) */}
          <div className="flex flex-col gap-2 h-full">
            <div className="bg-gray-800 text-white font-bold text-center py-2 rounded-t-lg shadow-md w-[100px]">
              NEXT
            </div>
            <div 
              className="bg-gray-200 dark:bg-gray-800 p-2 rounded-b-lg border border-gray-300 dark:border-gray-700 overflow-y-auto w-[100px] shadow-inner"
              style={{ height: CANVAS_HEIGHT - 40 }} // 캔버스 높이에 맞춤
            >
              {isPlaying ? (
                <div className="flex flex-col gap-4 items-center py-2">
                  {nextFruits.map((fruit, idx) => (
                    <div key={idx} className={`flex flex-col items-center transition-all ${idx === 0 ? 'scale-110 opacity-100' : 'opacity-60 scale-90'}`}>
                      {idx === 0 && <span className="text-xs text-red-500 font-bold mb-1 animate-bounce">▼ Drop</span>}
                      <div 
                        className="rounded-full shadow-lg border border-black/10"
                        style={{ 
                          width: Math.min(fruit.radius, 45) + 'px', 
                          height: Math.min(fruit.radius, 45) + 'px',
                          backgroundColor: fruit.color
                        }}
                      />
                      <span className="text-[10px] text-gray-500 mt-1 text-center font-medium truncate w-full px-1">{fruit.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs text-center">
                  Press<br/>Start
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- 우측 그룹: 설정 패널 --- */}
        {/* w-[360px] 로 고정 너비 부여하여 늘어지지 않게 함 */}
        <div className="w-full lg:w-[360px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col h-[700px]">
          
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                ⚙️ 룰 설정
                <span className="text-xs font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">Test Mode</span>
              </h2>
              <button 
                onClick={applyConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded shadow transition"
              >
                적용하기
              </button>
            </div>
            
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700 shadow-sm">
              <label className="text-sm font-bold text-gray-600 dark:text-gray-300">총 단계 수</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min={2} 
                  max={20}
                  value={stageCount}
                  onChange={(e) => handleStageCountChange(Number(e.target.value))}
                  className="w-16 p-1 border rounded text-center font-bold dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-gray-400">/ 20</span>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/50">
            {editConfig.map((fruit, index) => (
              <div key={index} className="flex gap-2 p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition">
                
                <div className="flex flex-col items-center gap-1 w-12 pt-1">
                  <div className="w-5 h-5 flex items-center justify-center bg-gray-900 text-white text-[10px] font-bold rounded-full shadow">
                    {fruit.stage}
                  </div>
                  <div 
                    className="rounded-full border border-black/10 shadow-inner"
                    style={{ width: '24px', height: '24px', backgroundColor: fruit.color }}
                  />
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <select 
                    value={fruit.poolId}
                    onChange={(e) => handleBaseFruitChange(index, Number(e.target.value))}
                    className="w-full text-xs p-1 border border-blue-100 dark:border-gray-600 rounded bg-blue-50/30 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-600 transition"
                  >
                    {FRUIT_POOL.map((p) => (
                      <option key={p.id} value={p.id}>#{p.id} {p.name}</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={fruit.name}
                      onChange={(e) => handlePropertyChange(index, "name", e.target.value)}
                      className="w-1/2 text-[10px] p-1 border rounded dark:bg-gray-600 dark:border-gray-500 text-center"
                      placeholder="이름"
                    />
                    <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-600 rounded border dark:border-gray-500 px-1">
                       <input 
                        type="number" 
                        value={fruit.radius}
                        onChange={(e) => handlePropertyChange(index, "radius", Number(e.target.value))}
                        className="w-full text-[10px] bg-transparent outline-none text-center"
                      />
                      <span className="text-[8px] text-gray-400">px</span>
                    </div>
                    <input 
                      type="color" 
                      value={fruit.color}
                      onChange={(e) => handlePropertyChange(index, "color", e.target.value)}
                      className="w-5 h-full p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden"
                    />
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