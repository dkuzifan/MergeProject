"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Matter from "matter-js";

// --- 1. 마스터 데이터 (가로 450px 기준 2.3개 핏) ---
type FruitDef = {
  id: number;
  name: string;
  defaultRadius: number;
  defaultColor: string;
};

const FRUIT_POOL: FruitDef[] = [
  { id: 1, name: "블루베리", defaultRadius: 20, defaultColor: "#4F46E5" },
  { id: 2, name: "크랜베리", defaultRadius: 24, defaultColor: "#DC2626" },
  { id: 3, name: "체리", defaultRadius: 28, defaultColor: "#EF4444" },
  { id: 4, name: "포도", defaultRadius: 32, defaultColor: "#7C3AED" },
  { id: 5, name: "산딸기", defaultRadius: 36, defaultColor: "#EC4899" },
  { id: 6, name: "딸기", defaultRadius: 41, defaultColor: "#F43F5E" },
  { id: 7, name: "방울토마토", defaultRadius: 46, defaultColor: "#EF4444" },
  { id: 8, name: "금귤", defaultRadius: 51, defaultColor: "#F59E0B" },
  { id: 9, name: "살구", defaultRadius: 56, defaultColor: "#FB923C" },
  { id: 10, name: "자두", defaultRadius: 61, defaultColor: "#7E22CE" },
  { id: 11, name: "라임", defaultRadius: 66, defaultColor: "#84CC16" },
  { id: 12, name: "레몬", defaultRadius: 71, defaultColor: "#FACC15" },
  { id: 13, name: "키위", defaultRadius: 76, defaultColor: "#65A30D" },
  { id: 14, name: "복숭아", defaultRadius: 81, defaultColor: "#FDBA74" },
  { id: 15, name: "사과", defaultRadius: 85, defaultColor: "#DC2626" },
  { id: 16, name: "배", defaultRadius: 89, defaultColor: "#EAB308" },
  { id: 17, name: "오렌지", defaultRadius: 92, defaultColor: "#EA580C" },
  { id: 18, name: "석류", defaultRadius: 94, defaultColor: "#9F1239" },
  { id: 19, name: "멜론", defaultRadius: 96, defaultColor: "#86EFAC" },
  { id: 20, name: "수박", defaultRadius: 98, defaultColor: "#10B981" },
];

type GameFruitConfig = {
  stage: number;
  poolId: number;
  name: string;
  radius: number;
  color: string;
  probability: number;
};

type GameStats = {
  totalPlays: number;
  totalScore: number;
};

export default function SuikaPage() {
  const DEFAULT_LEVELS = 11;
  const CANVAS_WIDTH = 450; 
  const CANVAS_HEIGHT = 640;

  // --- [State] ---
  const [activeConfig, setActiveConfig] = useState<GameFruitConfig[]>([]);
  const [editConfig, setEditConfig] = useState<GameFruitConfig[]>([]);
  
  const [levelCount, setLevelCount] = useState(DEFAULT_LEVELS);
  const [maxShots, setMaxShots] = useState(50);
  const [watermelonScore, setWatermelonScore] = useState(100);
  const [spawnLevel, setSpawnLevel] = useState(5);

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [shotsLeft, setShotsLeft] = useState(50);
  const [currentScore, setCurrentScore] = useState(0);
  const [watermelonCount, setWatermelonCount] = useState(0);
  const [nextFruits, setNextFruits] = useState<GameFruitConfig[]>([]);
  const [stats, setStats] = useState<GameStats>({ totalPlays: 0, totalScore: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // --- [Helper] 확률 자동 분배 ---
  const distributeProbabilities = (configs: GameFruitConfig[], maxSpawnCount: number): GameFruitConfig[] => {
    const targetCount = Math.min(configs.length, maxSpawnCount);
    if (targetCount <= 0) return configs;

    const baseProb = Math.floor(1000 / targetCount);
    const remainder = 1000 % targetCount;

    return configs.map((item, idx) => {
      let prob = 0;
      if (idx < targetCount) {
        prob = baseProb + (idx < remainder ? 1 : 0);
      }
      return { ...item, probability: prob };
    });
  };

  // --- [초기화] ---
  useEffect(() => {
    let initialConfig = createInitialConfig(DEFAULT_LEVELS);
    initialConfig = distributeProbabilities(initialConfig, 5);
    setActiveConfig(initialConfig);
    setEditConfig(initialConfig);

    const savedStats = localStorage.getItem("suika_stats");
    if (savedStats) setStats(JSON.parse(savedStats));
  }, []);

  const createInitialConfig = (count: number): GameFruitConfig[] => {
    return Array.from({ length: count }, (_, i) => {
      let fruitData = FRUIT_POOL[i % FRUIT_POOL.length];
      if (i === count - 1) {
        fruitData = FRUIT_POOL.find(f => f.id === 20)!;
      }
      return {
        stage: i,
        poolId: fruitData.id,
        name: fruitData.name,
        radius: fruitData.defaultRadius,
        color: fruitData.defaultColor,
        probability: 0,
      };
    });
  };

  // --- [CSV Export 기능] ---
  const exportToCSV = () => {
    // 1. 헤더 생성
    const headers = [
      "Stage(단계)", 
      "Name(이름)", 
      "Radius(크기)", 
      "Color(색상)", 
      "Probability(확률‰)", 
      "GLOBAL_TotalLevel", 
      "GLOBAL_SpawnLevel", 
      "GLOBAL_MaxShots", 
      "GLOBAL_WatermelonScore"
    ];

    // 2. 데이터 행 생성
    const rows = editConfig.map((fruit, index) => {
      // 글로벌 설정은 첫 번째 줄에만 기록 (나머지는 빈칸)
      const globalTotalLevel = index === 0 ? levelCount : "";
      const globalSpawnLevel = index === 0 ? spawnLevel : "";
      const globalMaxShots = index === 0 ? maxShots : "";
      const globalWatermelonScore = index === 0 ? watermelonScore : "";

      return [
        fruit.stage + 1,
        fruit.name,
        fruit.radius,
        fruit.color,
        fruit.probability || 0,
        globalTotalLevel,
        globalSpawnLevel,
        globalMaxShots,
        globalWatermelonScore
      ].join(",");
    });

    // 3. BOM 추가 (한글 깨짐 방지) 및 CSV 문자열 조합
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");

    // 4. 다운로드 링크 생성 및 클릭
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // 파일명: suika_config_날짜_시간.csv
    const date = new Date();
    const fileName = `suika_config_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}.csv`;
    
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- [설정 핸들러] ---
  const handleLevelCountChange = (newCount: number) => {
    if (newCount < 2) newCount = 2;
    if (newCount > 20) newCount = 20;
    setLevelCount(newCount);

    let newSpawnLevel = spawnLevel;
    if (spawnLevel >= newCount) {
      newSpawnLevel = newCount - 1;
      setSpawnLevel(newSpawnLevel);
    }

    let newConfig = [...editConfig];
    
    if (newCount > newConfig.length) {
      for (let i = newConfig.length; i < newCount; i++) {
        const poolFruit = FRUIT_POOL[i % FRUIT_POOL.length];
        newConfig.push({
          stage: i,
          poolId: poolFruit.id,
          name: poolFruit.name,
          radius: poolFruit.defaultRadius,
          color: poolFruit.defaultColor,
          probability: 0,
        });
      }
    } else {
      newConfig.splice(newCount);
    }

    const lastIdx = newConfig.length - 1;
    const watermelon = FRUIT_POOL.find(f => f.id === 20)!;
    newConfig[lastIdx] = {
      ...newConfig[lastIdx],
      poolId: watermelon.id,
      name: watermelon.name,
      radius: watermelon.defaultRadius,
      color: watermelon.defaultColor,
      probability: 0
    };

    newConfig = distributeProbabilities(newConfig, newSpawnLevel);
    setEditConfig(newConfig);
  };

  const handleSpawnLevelChange = (newLevel: number) => {
    setSpawnLevel(newLevel);
    const newConfig = distributeProbabilities(editConfig, newLevel);
    setEditConfig(newConfig);
  };

  const handleProbabilityChange = (index: number, val: number) => {
    const newConfig = [...editConfig];
    newConfig[index] = { ...newConfig[index], probability: val };
    setEditConfig(newConfig);
  };

  const handleBaseFruitChange = (index: number, newPoolId: number) => {
    if (index === editConfig.length - 1) return;
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
    if (index === editConfig.length - 1) return;
    const newConfig = [...editConfig];
    newConfig[index] = { ...newConfig[index], [field]: value };
    setEditConfig(newConfig);
  };

  const applyConfig = () => {
    let newConfig = [...editConfig];
    const lastIndex = newConfig.length - 1;

    const watermelon = FRUIT_POOL.find(f => f.id === 20)!;
    newConfig[lastIndex] = {
      ...newConfig[lastIndex],
      poolId: watermelon.id,
      name: watermelon.name,
      radius: watermelon.defaultRadius,
      color: watermelon.defaultColor,
      probability: 0
    };

    const normalFruits = newConfig.slice(0, lastIndex);
    normalFruits.sort((a, b) => a.radius - b.radius);

    newConfig = [...normalFruits, newConfig[lastIndex]].map((item, idx) => ({
      ...item,
      stage: idx
    }));

    setEditConfig(newConfig);
    setActiveConfig(newConfig);
    
    const validFruits = newConfig.slice(0, spawnLevel);
    const totalProb = validFruits.reduce((sum, f) => sum + (f.probability || 0), 0);

    alert(`✅ 설정 적용 완료!\n- 등장 범위: 1 ~ ${spawnLevel}단계\n- 설정된 확률 총합: ${totalProb}‰`);
  };

  const resetStats = () => {
    if (confirm("누적 기록을 정말 초기화하시겠습니까?")) {
      const resetData = { totalPlays: 0, totalScore: 0 };
      setStats(resetData);
      localStorage.setItem("suika_stats", JSON.stringify(resetData));
    }
  };

  const stopGame = () => {
    setGameState('ready');
  };

  // --- [게임 로직] ---
  const startGame = () => {
    if (JSON.stringify(activeConfig) !== JSON.stringify(editConfig)) {
      if (confirm("설정이 변경되었습니다. 적용 후 시작하시겠습니까?")) {
        applyConfig();
        return; 
      } else {
        setEditConfig(activeConfig);
        setLevelCount(activeConfig.length);
      }
    }
    setGameState('playing');
    setShotsLeft(maxShots);
    setCurrentScore(0);
    setWatermelonCount(0);
    const initialNext = Array.from({ length: 5 }, () => getRandomFruit(activeConfig));
    setNextFruits(initialNext);
  };

  const endGame = () => {
    setGameState('gameover');
    const newStats = {
      totalPlays: stats.totalPlays + 1,
      totalScore: stats.totalScore + currentScore,
    };
    setStats(newStats);
    localStorage.setItem("suika_stats", JSON.stringify(newStats));
  };

  const getRandomFruit = (config: GameFruitConfig[]) => {
    const validFruits = config.slice(0, spawnLevel);
    const totalWeight = validFruits.reduce((sum, f) => sum + (f.probability || 0), 0);
    
    if (totalWeight <= 0) return config[0];

    let randomValue = Math.random() * totalWeight;
    for (const fruit of validFruits) {
      if (randomValue < (fruit.probability || 0)) {
        return fruit;
      }
      randomValue -= (fruit.probability || 0);
    }
    return validFruits[validFruits.length - 1];
  };

  // --- [물리 엔진] ---
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const engine = Matter.Engine.create();
    const world = engine.world;
    engineRef.current = engine;

    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: false,
        background: "transparent",
      },
    });
    renderRef.current = render;

    const wallOptions = { isStatic: true, render: { fillStyle: "#374151" } };
    const ground = Matter.Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT, CANVAS_WIDTH, 60, wallOptions);
    const leftWall = Matter.Bodies.rectangle(-30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT * 2, wallOptions);
    const rightWall = Matter.Bodies.rectangle(CANVAS_WIDTH + 30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT * 2, wallOptions);
    Matter.World.add(world, [ground, leftWall, rightWall]);

    Matter.Events.on(engine, "collisionStart", (event) => {
      const pairs = event.pairs;
      pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith("fruit_") && bodyA.label === bodyB.label) {
          if ((bodyA as any).isMerging || (bodyB as any).isMerging) return;
          (bodyA as any).isMerging = true;
          (bodyB as any).isMerging = true;

          const currentStage = parseInt(bodyA.label.split("_")[1]);
          const maxStage = activeConfig.length - 1;

          Matter.World.remove(world, [bodyA, bodyB]);

          if (currentStage < maxStage) {
            const nextStage = currentStage + 1;
            const nextFruit = activeConfig[nextStage];
            const midX = (bodyA.position.x + bodyB.position.x) / 2;
            const midY = (bodyA.position.y + bodyB.position.y) / 2;

            const newBody = Matter.Bodies.circle(midX, midY, nextFruit.radius, {
              restitution: 0.3,
              render: { fillStyle: nextFruit.color },
              label: `fruit_${nextStage}`,
            });
            Matter.World.add(world, newBody);

            if (nextStage === maxStage) {
              setWatermelonCount(prev => prev + 1);
              setCurrentScore(prev => prev + watermelonScore);
            }
          }
        }
      });
    });

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [gameState, activeConfig, watermelonScore]);

  useEffect(() => {
    if (gameState !== 'playing' || !engineRef.current) return;
    const checkInterval = setInterval(() => {
      if (shotsLeft > 0) return;
      const bodies = Matter.Composite.allBodies(engineRef.current!.world);
      const fruits = bodies.filter(b => b.label.startsWith("fruit_"));
      if (fruits.length === 0) { endGame(); return; }
      const isAllSleeping = fruits.every(b => b.speed < 0.15 && b.angularSpeed < 0.15);
      if (isAllSleeping) endGame();
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [gameState, shotsLeft]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !engineRef.current || nextFruits.length === 0 || shotsLeft <= 0) return;

    setShotsLeft(prev => prev - 1);
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
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-sans flex flex-col items-center">
      
      <div className="w-full max-w-[1000px] mb-8 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Plays</p>
            <p className="text-2xl font-black text-blue-600">{stats.totalPlays}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Score</p>
            <p className="text-2xl font-black text-green-600">{stats.totalScore.toLocaleString()}</p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-700 dark:text-gray-200 hidden md:block">🍉 수박게임 시뮬레이터</h1>
        <button onClick={resetStats} className="text-xs text-red-400 hover:text-red-600 underline">
          기록 초기화
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-[1400px]">
        
        {/* === 좌측: 게임 플레이 === */}
        <div className="flex gap-4 items-start">
          <div 
            className="relative bg-gray-900 rounded-[2.5rem] p-4 shadow-2xl border-4 border-gray-800 select-none"
            style={{ width: CANVAS_WIDTH + 32, height: CANVAS_HEIGHT + 32 }} 
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-20"></div>
            <div className="relative bg-amber-50 dark:bg-gray-800 rounded-[2rem] overflow-hidden cursor-crosshair h-full w-full" onClick={handleCanvasClick}>
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block w-full h-full" />
              
              {gameState === 'playing' && (
                <button
                  onClick={(e) => { e.stopPropagation(); stopGame(); }}
                  className="absolute top-8 right-1/2 translate-x-1/2 bg-red-500/80 hover:bg-red-600 text-white font-bold py-1 px-4 rounded-full shadow-md z-30 text-xs backdrop-blur-md transition"
                >
                  ⏹ End Game
                </button>
              )}

              {gameState === 'playing' && (
                <>
                  <div className="absolute top-8 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1 rounded-full shadow border border-gray-200 dark:border-gray-700 z-10 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">SHOT</span>
                    <span className={`text-lg font-black ${shotsLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>{shotsLeft}</span>
                  </div>
                  <div className="absolute top-8 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1 rounded-full shadow border border-gray-200 dark:border-gray-700 z-10 text-right">
                    <p className="text-[10px] font-bold text-gray-400 leading-none">SCORE</p>
                    <p className="text-xl font-black text-green-600 leading-none mt-0.5">{currentScore}</p>
                  </div>
                </>
              )}

              {gameState === 'ready' && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                  <div className="text-center mb-8">
                    <h2 className="text-white text-5xl font-black drop-shadow-xl mb-2">READY</h2>
                    <p className="text-white/80 text-sm">화면을 클릭해서 과일을 떨어뜨리세요</p>
                  </div>
                  <button onClick={startGame} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95">START GAME</button>
                </div>
              )}

              {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-40 animate-fade-in">
                  <h2 className="text-red-500 text-4xl font-black mb-2 tracking-tighter">GAME OVER</h2>
                  <p className="text-gray-400 text-sm mb-8">모든 기회를 소진했습니다</p>
                  <div className="bg-white/10 p-6 rounded-2xl text-center mb-8 backdrop-blur-lg border border-white/10 w-64">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Final Score</p>
                    <p className="text-4xl font-black text-white mb-2">{currentScore}</p>
                    <div className="h-px bg-white/20 my-3"></div>
                    <p className="text-xs text-gray-300">🍉 수박 {watermelonCount}개 완성</p>
                  </div>
                  <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-105">다시 하기</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-0 h-full pt-8">
            <div className="bg-gray-800 text-white text-[10px] font-bold text-center py-2 rounded-t-lg shadow-md w-[80px] tracking-widest">NEXT</div>
            <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-b-lg border border-gray-300 dark:border-gray-700 overflow-y-auto w-[80px] shadow-inner scrollbar-hide" style={{ height: CANVAS_HEIGHT - 40 }}>
              {gameState === 'playing' ? (
                <div className="flex flex-col gap-4 items-center py-2">
                  {nextFruits.map((fruit, idx) => (
                    <div key={idx} className={`flex flex-col items-center transition-all ${idx === 0 ? 'scale-110 opacity-100' : 'opacity-40 scale-75 blur-[1px]'}`}>
                      {idx === 0 && <span className="text-[10px] text-red-500 font-bold mb-1 animate-bounce">▼</span>}
                      <div className="rounded-full shadow-lg border border-black/10" style={{ width: Math.min(fruit.radius, 40) + 'px', height: Math.min(fruit.radius, 40) + 'px', backgroundColor: fruit.color }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-[10px] text-center gap-1 opacity-50"><span>Press</span><span>Start</span></div>
              )}
            </div>
          </div>
        </div>

        {/* === 우측: 설정 패널 === */}
        <div className="w-full lg:w-[450px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col overflow-hidden" style={{ height: CANVAS_HEIGHT + 32 }}>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur z-10 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">⚙️ 룰 & 서열</h2>
              <div className="flex gap-2">
                {/* [버튼] CSV 저장 */}
                <button onClick={exportToCSV} className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow transition transform active:scale-95">
                  📥 CSV 저장
                </button>
                <button onClick={applyConfig} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-blue-500/30 transition transform active:scale-95">
                  적용하기
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">총 단계</label>
                <input type="number" min={2} max={20} value={levelCount} onChange={(e) => handleLevelCountChange(Number(e.target.value))} className="w-full bg-transparent text-center font-black text-xl text-gray-700 dark:text-gray-200 outline-none" />
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">최대 등장 단계</label>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs text-gray-400">~ Lv.</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={levelCount - 1} 
                    value={spawnLevel} 
                    onChange={(e) => handleSpawnLevelChange(Number(e.target.value))} 
                    className="w-12 bg-transparent text-center font-black text-xl text-blue-600 outline-none" 
                  />
                </div>
              </div>

              <div className="col-span-2 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">발사 횟수</label>
                <input type="number" value={maxShots} onChange={(e) => setMaxShots(Number(e.target.value))} className="w-20 bg-transparent text-right font-black text-xl text-gray-700 dark:text-gray-200 outline-none" />
              </div>

              <div className="col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center justify-between px-4">
                <span className="text-xs font-bold text-green-700 dark:text-green-400">👑 수박 점수</span>
                <input type="number" value={watermelonScore} onChange={(e) => setWatermelonScore(Number(e.target.value))} className="w-20 bg-transparent text-right font-black text-lg text-green-600 outline-none" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-center">* 적용하기를 누르면 확률이 유지된 채 과일 크기순 정렬됩니다.</p>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {editConfig.map((fruit, index) => {
              const isLast = index === editConfig.length - 1;
              const isSpawnable = index < spawnLevel;

              return (
                <div key={index} className="relative group">
                  {index > 0 && (
                    <div className="flex justify-center -my-2 relative z-0 opacity-30"><span className="text-gray-400 text-lg">↓</span></div>
                  )}

                  <div className={`relative z-10 flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 ${isLast ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 shadow-md scale-[1.02]' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-gray-600'} ${isSpawnable ? 'ring-1 ring-blue-100 dark:ring-blue-900/30' : ''}`}>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1 min-w-[32px]">
                        <div className={`w-6 h-6 flex items-center justify-center text-white text-[9px] font-bold rounded-full shadow ${isLast ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                          {isLast ? 'MAX' : index + 1}
                        </div>
                        <div className="rounded-full border border-black/5 shadow-sm" style={{ width: '24px', height: '24px', backgroundColor: fruit.color }} />
                      </div>

                      <div className="flex-1">
                         <select 
                          value={fruit.poolId}
                          onChange={(e) => handleBaseFruitChange(index, Number(e.target.value))}
                          disabled={isLast}
                          className={`w-full text-sm p-1 border-none rounded bg-transparent font-bold focus:ring-0 ${isLast ? 'text-green-700 dark:text-green-400 cursor-not-allowed appearance-none' : 'text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                          {FRUIT_POOL.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (Std: {p.defaultRadius}px)</option>
                          ))}
                        </select>
                      </div>
                      
                      {isSpawnable && !isLast && (
                        <div className="flex items-center bg-blue-50 dark:bg-blue-900/40 rounded px-1.5 py-0.5 border border-blue-100 dark:border-blue-800">
                          <span className="text-[9px] text-blue-600 dark:text-blue-300 font-bold mr-1">prob</span>
                          <input 
                            type="number"
                            value={fruit.probability || 0} 
                            onChange={(e) => handleProbabilityChange(index, Number(e.target.value))}
                            className="w-8 bg-transparent text-[10px] font-bold text-blue-700 dark:text-blue-200 text-right outline-none"
                          />
                          <span className="text-[8px] text-blue-400 ml-0.5">‰</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 pl-10">
                      <div className="col-span-2">
                        <input 
                           type="text" 
                           value={fruit.name}
                           onChange={(e) => handlePropertyChange(index, 'name', e.target.value)}
                           disabled={isLast}
                           className="w-full text-[11px] p-1 border rounded bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-center"
                           placeholder="이름"
                        />
                      </div>
                      <div className="col-span-1 relative">
                        <input 
                           type="number" 
                           value={fruit.radius}
                           onChange={(e) => handlePropertyChange(index, 'radius', Number(e.target.value))}
                           disabled={isLast}
                           className="w-full text-[11px] p-1 border rounded bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-center pr-4"
                        />
                        <span className="absolute right-1 top-1.5 text-[8px] text-gray-400">px</span>
                      </div>
                      <div className="col-span-1">
                        <input 
                           type="color" 
                           value={fruit.color}
                           onChange={(e) => handlePropertyChange(index, 'color', e.target.value)}
                           disabled={isLast}
                           className="w-full h-full p-0 border rounded overflow-hidden cursor-pointer"
                        />
                      </div>
                    </div>

                    {isLast && <div className="text-[9px] text-green-600 dark:text-green-400 font-bold text-center mt-1">🔒 최종 목표는 수박으로 고정됩니다</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}