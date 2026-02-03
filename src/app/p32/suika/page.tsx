"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
// Matter.js 동적 임포트 사용

// ----------------------------------------------------------------------
// 1. 마스터 데이터 및 타입 정의
// ----------------------------------------------------------------------
const SCALE_RATIO = 0.8; // 기본 스케일

type FruitDef = {
  id: number;
  name: string;
  radius: number;      
  color: string;       
  probability: number; 
  img?: string;
  originalWidth?: number;
  originalHeight?: number;
};

const INITIAL_FRUITS: FruitDef[] = [
  { id: 1, name: "라즈베리", radius: (48/2)*SCALE_RATIO, color: "#E63E85", probability: 20, img: "/images/suika/fruit_00_raspberry.svg", originalWidth: 48, originalHeight: 48 },
  { id: 2, name: "블루베리", radius: (68/2)*SCALE_RATIO, color: "#5B43D8", probability: 20, img: "/images/suika/fruit_01_blueberry.svg", originalWidth: 68, originalHeight: 68 },
  { id: 3, name: "라임", radius: (95/2)*SCALE_RATIO, color: "#8AC249", probability: 15, img: "/images/suika/fruit_02_lime.svg", originalWidth: 95, originalHeight: 95 },
  { id: 4, name: "망고스틴", radius: (124/2)*SCALE_RATIO, color: "#6D214F", probability: 15, img: "/images/suika/fruit_03_mangosteen.svg", originalWidth: 124, originalHeight: 124 },
  { id: 5, name: "용과", radius: (152/2)*SCALE_RATIO, color: "#E63E85", probability: 15, img: "/images/suika/fruit_04_dragonfruit.svg", originalWidth: 152, originalHeight: 168 },
  { id: 6, name: "파파야", radius: (180/2)*SCALE_RATIO, color: "#FF9F1C", probability: 10, img: "/images/suika/fruit_05_papaya.svg", originalWidth: 180, originalHeight: 190 },
  { id: 7, name: "망고", radius: (208/2)*SCALE_RATIO, color: "#FF6B00", probability: 5, img: "/images/suika/fruit_06_mango.svg", originalWidth: 208, originalHeight: 196 },
  { id: 8, name: "파인애플", radius: (222/2)*SCALE_RATIO, color: "#FFB300", probability: 0, img: "/images/suika/fruit_07_pineapple.svg", originalWidth: 222, originalHeight: 282 },
  { id: 9, name: "두리안", radius: (295/2)*SCALE_RATIO, color: "#FCEBB6", probability: 0, img: "/images/suika/fruit_08_durian.svg", originalWidth: 295, originalHeight: 295 },
  { id: 10, name: "코코넛", radius: (358/2)*SCALE_RATIO, color: "#F0EFE7", probability: 0, img: "/images/suika/fruit_09_coconut.svg", originalWidth: 358, originalHeight: 358 },
  { id: 11, name: "수박", radius: (460/2)*SCALE_RATIO, color: "#4CAF50", probability: 0, img: "/images/suika/fruit_10_watermelon.svg", originalWidth: 460, originalHeight: 460 },
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: 12 + i, name: `과일 ${12 + i}`, radius: 120 + i * 5, color: "#94a3b8", probability: 0
  }))
];

type GameState = "READY" | "PLAYING" | "GAMEOVER";

// [수정 1] 캔버스 너비 조정 (450 -> 420)
const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 700;
const WALL_THICKNESS = 10;

export default function SuikaPage() {
  const sceneRef = useRef<HTMLDivElement>(null);
  
  // 상태 관리
  const [gameState, setGameState] = useState<GameState>("READY");
  const [fruits, setFruits] = useState<FruitDef[]>(INITIAL_FRUITS); 
  const [tempFruits, setTempFruits] = useState<FruitDef[]>(INITIAL_FRUITS); 

  // 게임 설정
  const [maxLevel, setMaxLevel] = useState(11);
  const [spawnMaxLevel, setSpawnMaxLevel] = useState(5);
  const [totalShots, setTotalShots] = useState(50); 
  const [currentShots, setCurrentShots] = useState(50);
  const [watermelonScore, setWatermelonScore] = useState(100);

  // 점수 및 기록
  const [score, setScore] = useState(0);
  const [totalPlay, setTotalPlay] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [watermelonsCount, setWatermelonsCount] = useState(0);
  const [isDanger, setIsDanger] = useState(false); 

  // 큐
  const [nextQueue, setNextQueue] = useState<number[]>([]);

  // Refs 동기화
  const engineRef = useRef<any>(null);
  const renderRef = useRef<any>(null);
  const fruitsRef = useRef(fruits); 
  const queueRef = useRef<number[]>([]);
  const gameStateRef = useRef<GameState>("READY");
  const shotsRef = useRef(currentShots);
  const watermelonScoreRef = useRef(watermelonScore);

  useEffect(() => { fruitsRef.current = fruits; }, [fruits]);
  useEffect(() => { queueRef.current = nextQueue; }, [nextQueue]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { shotsRef.current = currentShots; }, [currentShots]);
  useEffect(() => { watermelonScoreRef.current = watermelonScore; }, [watermelonScore]);

  // 확률 기반 랜덤 선택
  const pickNextFruitId = () => {
    const candidates = fruitsRef.current.filter(f => f.id <= spawnMaxLevel);
    const totalProb = candidates.reduce((sum, f) => sum + f.probability, 0);
    if (totalProb === 0) return 1;

    let random = Math.random() * totalProb;
    for (const f of candidates) {
      if (random < f.probability) return f.id;
      random -= f.probability;
    }
    return candidates[candidates.length - 1].id;
  };

  const fillQueue = () => {
    setNextQueue(prev => {
      const newQueue = [...prev];
      while (newQueue.length < 10) {
        newQueue.push(pickNextFruitId());
      }
      return newQueue;
    });
  };

  const startGame = () => {
    setGameState("PLAYING");
    setScore(0);
    setWatermelonsCount(0);
    setCurrentShots(totalShots);
    setNextQueue([]);
    setIsDanger(false);
    setTimeout(fillQueue, 0);
    setTotalPlay(prev => prev + 1);

    if (engineRef.current) {
      const Matter = require("matter-js");
      const Composite = Matter.Composite;
      const allBodies = Composite.allBodies(engineRef.current.world);
      // 벽, 센서(static) 제외하고 제거
      const fruitsToRemove = allBodies.filter((b: any) => !b.isStatic);
      Composite.remove(engineRef.current.world, fruitsToRemove);
    }
  };

  // Matter.js 초기화
  useEffect(() => {
    if (!sceneRef.current) return;

    let Engine: any, Render: any, Runner: any, World: any, Bodies: any, Body: any, Events: any, Composite: any;

    const init = async () => {
      const MatterModule = await import("matter-js");
      const Matter = MatterModule.default || MatterModule;
      Engine = Matter.Engine;
      Render = Matter.Render;
      Runner = Matter.Runner;
      World = Matter.World;
      Bodies = Matter.Bodies;
      Body = Matter.Body;
      Events = Matter.Events;
      Composite = Matter.Composite;

      const engine = Engine.create();
      engineRef.current = engine;

      const render = Render.create({
        element: sceneRef.current,
        engine: engine,
        options: {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          wireframes: false,
          background: "#F7F4EB",
        },
      });
      renderRef.current = render;

      // 벽 생성 (너비 상수에 맞춰 조정)
      const ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 20, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      const leftWall = Bodies.rectangle(WALL_THICKNESS / 2, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      const rightWall = Bodies.rectangle(CANVAS_WIDTH - WALL_THICKNESS / 2, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      
      const deadLineY = 210;
      const deadLineSensor = Bodies.rectangle(CANVAS_WIDTH / 2, deadLineY, CANVAS_WIDTH, 2, { 
        isStatic: true, 
        isSensor: true, 
        label: "deadLine",
        render: { fillStyle: "transparent" }
      });

      World.add(engine.world, [ground, leftWall, rightWall, deadLineSensor]);

      const createFruit = (x: number, y: number, id: number, isDynamic = true) => {
        const def = fruitsRef.current.find(f => f.id === id);
        if (!def) return null;

        const radius = def.radius;
        // 좌표 강제 보정 (벽 두께 + 반지름만큼 여유)
        const safeX = Math.max(WALL_THICKNESS + radius, Math.min(CANVAS_WIDTH - WALL_THICKNESS - radius, x));

        const physicsRadius = radius; 

        let scaleY = 1;
        if (def.img && def.originalWidth && def.originalHeight) {
          scaleY = def.originalHeight / def.originalWidth;
        }

        const body = Bodies.circle(safeX, y, physicsRadius, {
          label: `fruit_${def.id}`,
          restitution: 0.2,
          isStatic: !isDynamic,
          // [수정 2] 새로 생성되는 과일임을 식별하기 위한 플래그
          isNewSpawn: true, 
          render: {
            fillStyle: def.img ? "transparent" : def.color,
            sprite: def.img ? {
              texture: def.img,
              xScale: (radius * 2) / (def.originalWidth || radius * 2),
              yScale: (radius * 2 * scaleY) / (def.originalHeight || radius * 2),
            } : undefined
          }
        });

        // 생성 후 일정 시간 뒤에는 "새 과일 아님"으로 처리 (충돌 로직용)
        setTimeout(() => {
            if (body) body.isNewSpawn = false;
        }, 1000);

        if (scaleY !== 1) {
          Body.scale(body, 1, scaleY);
        }

        return body;
      };

      // 입력 핸들러
      const handleInput = (e: MouseEvent | TouchEvent) => {
        if (gameStateRef.current !== "PLAYING") return;
        if (shotsRef.current <= 0) return;

        const rect = render.canvas.getBoundingClientRect();
        let clientX = 0;
        if ('touches' in e) clientX = (e as TouchEvent).touches[0].clientX;
        else clientX = (e as MouseEvent).clientX;
        
        // 생성 위치 결정 (새 너비 기준)
        const nextId = queueRef.current[0];
        const nextDef = fruitsRef.current.find(f => f.id === nextId);
        const r = nextDef ? nextDef.radius : 20;

        const minX = WALL_THICKNESS + r; 
        const maxX = CANVAS_WIDTH - WALL_THICKNESS - r; 
        
        const x = Math.max(minX, Math.min(maxX, clientX - rect.left));

        const currentQueue = [...queueRef.current];
        if (currentQueue.length === 0) return;
        
        const spawnId = currentQueue.shift();
        setNextQueue(currentQueue);
        setTimeout(fillQueue, 0);

        setCurrentShots(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setTimeout(() => {
               setGameState("GAMEOVER");
               setTotalScore(s => s + score); 
            }, 2000);
          }
          return next;
        });

        if (spawnId) {
          const body = createFruit(x, 50, spawnId);
          if (body) World.add(engine.world, body);
        }
      };

      render.canvas.addEventListener("mousedown", handleInput);
      render.canvas.addEventListener("touchstart", handleInput, { passive: false });

      // [수정 2] 데드라인 감지 로직 개선
      Events.on(engine, "collisionActive", (event: any) => {
        const pairs = event.pairs;
        let dangerDetected = false;

        pairs.forEach((pair: any) => {
          const { bodyA, bodyB } = pair;
          
          // 센서인지 확인
          const sensor = bodyA.label === "deadLine" ? bodyA : (bodyB.label === "deadLine" ? bodyB : null);
          const fruit = sensor === bodyA ? bodyB : (sensor === bodyB ? bodyA : null);

          if (sensor && fruit) {
             // 아직 떨어지고 있는 중인 과일(isNewSpawn)은 무시
             // 속도가 거의 0이거나(안정화됨), 이미 다른 과일 위에 쌓여있는 경우만 체크
             if (!fruit.isNewSpawn && fruit.speed < 0.5) {
                dangerDetected = true;
             }
          }
        });

        if (dangerDetected) setIsDanger(true);
        else setIsDanger(false);
      });

      Events.on(engine, "collisionStart", (event: any) => {
        const pairs = event.pairs;
        pairs.forEach((pair: any) => {
          const { bodyA, bodyB } = pair;
          if (bodyA.label.startsWith("fruit_") && bodyB.label.startsWith("fruit_")) {
            const idA = parseInt(bodyA.label.split("_")[1]);
            const idB = parseInt(bodyB.label.split("_")[1]);

            if (idA === idB) {
              if (!Composite.get(engine.world, bodyA.id, "body") || !Composite.get(engine.world, bodyB.id, "body")) return;

              const nextId = idA + 1;
              const nextDef = fruitsRef.current.find(f => f.id === nextId);

              if (nextDef) {
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;
                
                World.remove(engine.world, [bodyA, bodyB]);
                
                if (nextId === 11) {
                    setScore(prev => prev + watermelonScoreRef.current);
                    setWatermelonsCount(p => p + 1);
                }

                // 합쳐져서 나온 새 과일은 isNewSpawn=false로 처리 (바로 감지 대상 되도록)
                const newBody = createFruit(midX, midY, nextId, true);
                if (newBody) {
                    newBody.isNewSpawn = false; 
                    World.add(engine.world, newBody);
                }
              }
            }
          }
        });
      });

      const runner = Runner.create();
      Runner.run(runner, engine);
      Render.run(render);
    };

    init();

    return () => {
      if (renderRef.current && renderRef.current.canvas) renderRef.current.canvas.remove();
    };
  }, []);

  const handleTempChange = (index: number, key: string, value: any) => {
    setTempFruits(prev => {
      const next = [...prev];
      (next[index] as any)[key] = value;
      return next;
    });
  };

  const applySettings = () => {
    setFruits(tempFruits);
    alert("설정이 적용되었습니다!");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 font-sans select-none touch-none">
      
      {/* 상단 정보창 */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">🍉 수박게임 시뮬레이터</h1>
        <div className="flex gap-6 text-sm text-gray-700"> 
           <div>Total Plays: <span className="font-bold text-gray-900">{totalPlay}</span></div>
           <div>Total Score: <span className="font-bold text-gray-900">{totalScore}</span></div>
           <button onClick={() => { setTotalPlay(0); setTotalScore(0); }} className="text-red-500 underline font-semibold">기록 초기화</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- 왼쪽: 시뮬레이션 영역 --- */}
        <div className="col-span-1 lg:col-span-2 flex flex-col items-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg w-fit relative">
            
            {/* 오버레이 UI */}
            {gameState === "READY" && (
              <div className="absolute inset-0 z-40 bg-black/50 rounded-xl flex flex-col items-center justify-center text-white">
                <h2 className="text-3xl font-bold mb-4">READY</h2>
                <button onClick={startGame} className="px-8 py-3 bg-indigo-600 rounded-full font-bold hover:bg-indigo-500 transition">
                  START GAME
                </button>
              </div>
            )}
            {gameState === "GAMEOVER" && (
              <div className="absolute inset-0 z-40 bg-black/80 rounded-xl flex flex-col items-center justify-center text-white">
                <h2 className="text-3xl font-bold mb-2 text-red-400">GAME OVER</h2>
                <div className="text-center mb-6">
                  <p className="text-xl font-bold text-amber-500">획득 점수: {score}</p>
                  <p className="text-lg">🍉 Count: {watermelonsCount}</p>
                </div>
                <button onClick={startGame} className="px-8 py-3 bg-green-600 rounded-full font-bold hover:bg-green-500 transition">
                  다시 하기
                </button>
              </div>
            )}

            {/* 인게임 정보바 (너비 수정: w-[420px]) */}
            <div className="flex justify-between items-center mb-2 px-2" style={{ width: `${CANVAS_WIDTH}px` }}>
              <div className="text-xl font-black text-amber-500">획득 점수: {score}</div>
              <div className="flex items-center gap-4">
                 <div className="text-sm font-mono bg-gray-200 px-3 py-1 rounded text-gray-800 font-bold border border-gray-300">
                   Shots: <span className={currentShots < 10 ? "text-red-600" : "text-gray-900"}>{currentShots}</span>
                 </div>
                 <button onClick={() => setGameState("READY")} className="text-xs text-red-500 font-bold hover:text-red-700">중도 포기</button>
              </div>
            </div>

            {/* 메인 캔버스 + Next 큐 */}
            <div className="flex gap-2">
              {/* 캔버스 (너비 420px로 수정) */}
              <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 bg-[#F7F4EB]" style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}>
                
                {/* 데드라인 선 (z-30) */}
                <div 
                  className={`absolute left-0 w-full h-[2px] z-30 pointer-events-none transition-colors duration-200 ${isDanger ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-gray-300"}`} 
                  style={{ top: '210px' }} 
                />

                {gameState === "PLAYING" && nextQueue.length > 0 && (
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10 pointer-events-none">
                    <span className="text-[10px] text-gray-400 mb-1">NEXT</span>
                    {(() => {
                      const f = fruits.find(i => i.id === nextQueue[0]);
                      if (!f) return null;
                      return (
                        <div className="w-10 h-10 flex items-center justify-center bg-white/50 rounded-full shadow-sm">
                           {f.img ? <img src={f.img} className="w-8 h-8 object-contain"/> : <div className="w-4 h-4 rounded-full" style={{backgroundColor: f.color}}/>}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div ref={sceneRef} className="cursor-pointer w-full h-full relative z-10" />
              </div>

              {/* Next UI (Flex-shrink 방지) */}
              <div className="w-16 flex-shrink-0 flex flex-col gap-1 py-2 bg-gray-50 rounded-lg items-center overflow-hidden border">
                <span className="text-[10px] font-bold text-gray-400 mb-1">WAITING</span>
                {nextQueue.slice(1, 11).map((nid, idx) => {
                  const f = fruits.find(i => i.id === nid);
                  if (!f) return null;
                  return (
                    <div key={idx} className="w-10 h-10 flex-shrink-0 bg-white rounded-full flex items-center justify-center border shadow-sm relative">
                      {f.img ? <img src={f.img} className="w-8 h-8 object-contain"/> : <div className="w-4 h-4 rounded-full" style={{backgroundColor: f.color}}/>}
                      <span className="absolute -bottom-1 -right-1 text-[8px] bg-gray-800 text-white px-1 rounded-full">{f.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* --- 오른쪽: 룰 & 설정 --- */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg h-full max-h-[850px] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold text-gray-800">⚙️ 룰 & 서열</h2>
              <div className="flex gap-2">
                <button className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded font-bold hover:bg-gray-300 border border-gray-300">
                  CSV 추출
                </button>
                <button onClick={applySettings} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 font-bold">적용하기</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
              <div>
                <label className="block text-gray-500 mb-1">총 단계</label>
                <input type="number" value={maxLevel} onChange={(e) => setMaxLevel(Number(e.target.value))} className="w-full border p-1 rounded" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">최대 등장 단계</label>
                <input type="number" value={spawnMaxLevel} onChange={(e) => setSpawnMaxLevel(Number(e.target.value))} className="w-full border p-1 rounded font-bold text-indigo-600" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">발사 횟수</label>
                <input type="number" value={totalShots} onChange={(e) => setTotalShots(Number(e.target.value))} className="w-full border p-1 rounded" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">👑 수박 점수</label>
                <input type="number" value={watermelonScore} onChange={(e) => setWatermelonScore(Number(e.target.value))} className="w-full border p-1 rounded" />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center mb-4 bg-gray-50 p-2 rounded">
              * 적용하기를 누르면 확률이 유지된 채 과일 크기순 정렬됩니다.
            </p>

            {/* 과일 데이터 그리드 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-500 font-bold text-center mb-2">
                <div className="col-span-1">Lv</div>
                <div className="col-span-2">Image</div>
                <div className="col-span-3">Name</div> 
                <div className="col-span-2">Radius</div>
                <div className="col-span-2">Color</div>
                <div className="col-span-2">Prob</div>
              </div>

              {tempFruits.map((fruit, index) => {
                const isSpawnable = fruit.id <= spawnMaxLevel;

                return (
                  <div key={fruit.id} className={`grid grid-cols-12 gap-1 items-center p-1 rounded border ${isSpawnable ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                    <div className="col-span-1 text-center font-bold text-xs text-gray-600">{fruit.id}</div>
                    
                    <div className="col-span-2 flex justify-center">
                       {fruit.img ? <img src={fruit.img} className="w-6 h-6 object-contain" /> : <div className="w-4 h-4 rounded-full" style={{backgroundColor: fruit.color}}/>}
                    </div>

                    <div className="col-span-3 text-center text-[10px] text-gray-700 truncate px-1">
                      {fruit.name}
                    </div>

                    <div className="col-span-2">
                       <input 
                         type="number" 
                         value={Math.round(fruit.radius)} 
                         onChange={(e) => handleTempChange(index, 'radius', Number(e.target.value))}
                         className="w-full text-center text-xs border rounded p-1"
                       />
                    </div>

                    <div className="col-span-2">
                       <input 
                         type="color" 
                         value={fruit.color} 
                         onChange={(e) => handleTempChange(index, 'color', e.target.value)}
                         className="w-full h-6 border rounded overflow-hidden p-0"
                       />
                    </div>

                    <div className="col-span-2 relative">
                       <input 
                         type="number" 
                         value={fruit.probability} 
                         onChange={(e) => handleTempChange(index, 'probability', Number(e.target.value))}
                         disabled={!isSpawnable}
                         className={`w-full text-center text-xs border rounded p-1 ${isSpawnable ? 'text-indigo-600 font-bold' : 'text-gray-300'}`}
                       />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}