"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useCallback } from "react";

// ----------------------------------------------------------------------
// 1. 마스터 데이터 및 타입 정의
// ----------------------------------------------------------------------

// 캔버스 크기 (가로 358, 세로 475 - 1:1.3 비율)
const CANVAS_WIDTH = 358;
const CANVAS_HEIGHT = 475;

// 과일 크기 비율 (너비 358 기준: 358 / 720 = 0.4972)
const SCALE_RATIO = 0.4972;

const WALL_THICKNESS = 10;
// [수정] 경고선과 겹치지 않게 생성 위치 상향 조정 (50 -> 30)
const SPAWN_Y = 30;

// [타입 정의] Matter.js Body
interface IMatterBody {
  id: number;
  label: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  speed: number;
  isStatic?: boolean;
  isSensor?: boolean;
  isNewSpawn?: boolean;
  render?: {
    fillStyle?: string;
    sprite?: {
      texture: string;
      xScale: number;
      yScale: number;
    };
  };
}

// [타입 정의] 충돌 이벤트
interface ICollisionEvent {
  pairs: {
    bodyA: IMatterBody;
    bodyB: IMatterBody;
  }[];
}

// 과일 데이터 타입
type FruitDef = {
  id: number;
  name: string;
  radius: number;
  color: string;
  probability: number;
  img?: string;
  originalWidth?: number;
  originalHeight?: number;
  // 물리 속성
  restitution: number;
  friction: number;
  density: number;
};

const INITIAL_FRUITS: FruitDef[] = [
  // [설정] 작은 과일은 잘 튀고(0.5), 큰 과일은 묵직하게(0.1)
  { id: 1, name: "라즈베리", radius: (48 / 2) * SCALE_RATIO, color: "#E63E85", probability: 20, img: "/images/suika/fruit_00_raspberry.svg", originalWidth: 48, originalHeight: 48, restitution: 0.5, friction: 0.01, density: 0.001 },
  { id: 2, name: "블루베리", radius: (68 / 2) * SCALE_RATIO, color: "#5B43D8", probability: 20, img: "/images/suika/fruit_01_blueberry.svg", originalWidth: 68, originalHeight: 68, restitution: 0.5, friction: 0.01, density: 0.001 },
  { id: 3, name: "라임", radius: (95 / 2) * SCALE_RATIO, color: "#8AC249", probability: 15, img: "/images/suika/fruit_02_lime.svg", originalWidth: 95, originalHeight: 95, restitution: 0.45, friction: 0.01, density: 0.001 },
  { id: 4, name: "망고스틴", radius: (124 / 2) * SCALE_RATIO, color: "#6D214F", probability: 15, img: "/images/suika/fruit_03_mangosteen.svg", originalWidth: 124, originalHeight: 124, restitution: 0.4, friction: 0.01, density: 0.001 },
  { id: 5, name: "용과", radius: (152 / 2) * SCALE_RATIO, color: "#E63E85", probability: 15, img: "/images/suika/fruit_04_dragonfruit.svg", originalWidth: 152, originalHeight: 168, restitution: 0.35, friction: 0.02, density: 0.0015 },
  { id: 6, name: "파파야", radius: (180 / 2) * SCALE_RATIO, color: "#FF9F1C", probability: 10, img: "/images/suika/fruit_05_papaya.svg", originalWidth: 180, originalHeight: 190, restitution: 0.3, friction: 0.02, density: 0.0015 },
  { id: 7, name: "망고", radius: (208 / 2) * SCALE_RATIO, color: "#FF6B00", probability: 5, img: "/images/suika/fruit_06_mango.svg", originalWidth: 208, originalHeight: 196, restitution: 0.25, friction: 0.03, density: 0.002 },
  { id: 8, name: "파인애플", radius: (222 / 2) * SCALE_RATIO, color: "#FFB300", probability: 0, img: "/images/suika/fruit_07_pineapple.svg", originalWidth: 222, originalHeight: 282, restitution: 0.2, friction: 0.03, density: 0.002 },
  { id: 9, name: "두리안", radius: (295 / 2) * SCALE_RATIO, color: "#FCEBB6", probability: 0, img: "/images/suika/fruit_08_durian.svg", originalWidth: 295, originalHeight: 295, restitution: 0.2, friction: 0.05, density: 0.0025 },
  { id: 10, name: "코코넛", radius: (358 / 2) * SCALE_RATIO, color: "#F0EFE7", probability: 0, img: "/images/suika/fruit_09_coconut.svg", originalWidth: 358, originalHeight: 358, restitution: 0.1, friction: 0.1, density: 0.003 },
  { id: 11, name: "수박", radius: (460 / 2) * SCALE_RATIO, color: "#4CAF50", probability: 0, img: "/images/suika/fruit_10_watermelon.svg", originalWidth: 460, originalHeight: 460, restitution: 0.1, friction: 0.1, density: 0.003 },
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: 12 + i, name: `과일 ${12 + i}`, radius: 120 + i * 5, color: "#94a3b8", probability: 0, restitution: 0.2, friction: 0.1, density: 0.001
  }))
];

type GameState = "READY" | "PLAYING" | "GAMEOVER";
type EndReason = "DEADLINE" | "NO_SHOT" | "CLEAR" | null;

export default function SuikaPage() {
  const sceneRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [gameState, setGameState] = useState<GameState>("READY");
  const [endReason, setEndReason] = useState<EndReason>(null);

  const [fruits, setFruits] = useState<FruitDef[]>(INITIAL_FRUITS);
  const [tempFruits, setTempFruits] = useState<FruitDef[]>(INITIAL_FRUITS);

  // Settings
  const [maxLevel, setMaxLevel] = useState(11);
  const [spawnMaxLevel, setSpawnMaxLevel] = useState(5);
  const [totalShots, setTotalShots] = useState(50);
  const [currentShots, setCurrentShots] = useState(50);
  const [watermelonScore, setWatermelonScore] = useState(100);
  const [deadLinePercent, setDeadLinePercent] = useState(20);

  // Score & Records
  const [score, setScore] = useState(0);
  const [totalPlay, setTotalPlay] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [watermelonsCount, setWatermelonsCount] = useState(0);
  const [isDanger, setIsDanger] = useState(false);

  const [nextQueue, setNextQueue] = useState<number[]>([]);

  // 조준 상태
  const [aimX, setAimX] = useState(CANVAS_WIDTH / 2);
  const [isAiming, setIsAiming] = useState(false);

  // --- Refs ---
  const engineRef = useRef<unknown>(null);
  const renderRef = useRef<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matterLibRef = useRef<any>(null);

  const fruitsRef = useRef(fruits);
  const queueRef = useRef<number[]>([]);
  const gameStateRef = useRef<GameState>("READY");
  const shotsRef = useRef(currentShots);
  const watermelonScoreRef = useRef(watermelonScore);
  const deadLinePercentRef = useRef(deadLinePercent);
  const scoreRef = useRef(score);
  const isDangerRef = useRef(isDanger);

  // Sync Refs
  useEffect(() => { fruitsRef.current = fruits; }, [fruits]);
  useEffect(() => { queueRef.current = nextQueue; }, [nextQueue]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { shotsRef.current = currentShots; }, [currentShots]);
  useEffect(() => { watermelonScoreRef.current = watermelonScore; }, [watermelonScore]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { isDangerRef.current = isDanger; }, [isDanger]);

  // 데드라인 업데이트
  useEffect(() => {
    deadLinePercentRef.current = deadLinePercent;
    if (engineRef.current && matterLibRef.current) {
      const Matter = matterLibRef.current;
      const Composite = Matter.Composite;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const world = (engineRef.current as any).world;      
      const bodies = Composite.allBodies(world);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sensor = bodies.find((b: any) => b.label === "deadLine");

      if (sensor) {
        const newY = CANVAS_HEIGHT * (deadLinePercent / 100);
        Matter.Body.setPosition(sensor, { x: CANVAS_WIDTH / 2, y: newY });
      }
    }
  }, [deadLinePercent]);

  // --- Logic ---
  const pickNextFruitId = useCallback(() => {
    const candidates = fruitsRef.current.filter(f => f.id <= spawnMaxLevel);
    const totalProb = candidates.reduce((sum, f) => sum + f.probability, 0);
    if (totalProb === 0) return 1;

    let random = Math.random() * totalProb;
    for (const f of candidates) {
      if (random < f.probability) return f.id;
      random -= f.probability;
    }
    return candidates[candidates.length - 1].id;
  }, [spawnMaxLevel]);

  const fillQueue = useCallback(() => {
    setNextQueue(prev => {
      const newQueue = [...prev];
      while (newQueue.length < 10) {
        newQueue.push(pickNextFruitId());
      }
      return newQueue;
    });
  }, [pickNextFruitId]);

  const gameOver = useCallback((reason: EndReason) => {
    setGameState("GAMEOVER");
    setEndReason(reason);
    setTotalScore(s => s + scoreRef.current);
  }, []);

  const startGame = () => {
    setGameState("PLAYING");
    setEndReason(null);
    setScore(0);
    setWatermelonsCount(0);
    setCurrentShots(totalShots);
    setNextQueue([]);
    setIsDanger(false);
    setAimX(CANVAS_WIDTH / 2);
    setTimeout(fillQueue, 0);
    setTotalPlay(prev => prev + 1);

    if (engineRef.current && matterLibRef.current) {
      const Composite = matterLibRef.current.Composite;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const world = (engineRef.current as any).world;      
      const allBodies = Composite.allBodies(world);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fruitsToRemove = allBodies.filter((b: any) => !b.isStatic);
      Composite.remove(world, fruitsToRemove);
    }
  };

  // --- Game Engine Setup ---
  useEffect(() => {
    if (!sceneRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Engine: any, Render: any, Runner: any, World: any, Bodies: any, Body: any, Events: any, Composite: any;

    const init = async () => {
      const MatterModule = await import("matter-js");
      const Matter = MatterModule.default || MatterModule;
      matterLibRef.current = Matter;

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

      // 벽 생성
      const ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 50, CANVAS_WIDTH + 200, 100, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      const leftWall = Bodies.rectangle(-10, CANVAS_HEIGHT / 2, 40, CANVAS_HEIGHT * 2, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      const rightWall = Bodies.rectangle(CANVAS_WIDTH + 10, CANVAS_HEIGHT / 2, 40, CANVAS_HEIGHT * 2, { isStatic: true, render: { fillStyle: "#E6DCC8" } });

      const deadLineY = CANVAS_HEIGHT * (deadLinePercentRef.current / 100);
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
        const safeX = Math.max(WALL_THICKNESS + radius, Math.min(CANVAS_WIDTH - WALL_THICKNESS - radius, x));
        const physicsRadius = radius;

        let scaleY = 1;
        if (def.img && def.originalWidth && def.originalHeight) {
          scaleY = def.originalHeight / def.originalWidth;
        }

        const body = Bodies.circle(safeX, y, physicsRadius, {
          label: `fruit_${def.id}`,
          restitution: def.restitution,
          friction: def.friction,
          density: def.density,

          isStatic: !isDynamic,
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

        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (body) (body as any).isNewSpawn = false;
        }, 1000);

        if (scaleY !== 1) {
          Body.scale(body, 1, scaleY);
        }

        return body;
      };

      // Matter.js 관련 Ref 노출
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sceneRef.current as any).createFruit = createFruit;

      // 충돌 이벤트
      Events.on(engine, "collisionActive", (event: ICollisionEvent) => {
        if (gameStateRef.current === "GAMEOVER") return;

        const pairs = event.pairs;
        let dangerDetected = false;
        let shouldGameOver = false;

        pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          const sensor = bodyA.label === "deadLine" ? bodyA : (bodyB.label === "deadLine" ? bodyB : null);
          const fruit = sensor === bodyA ? bodyB : (sensor === bodyB ? bodyA : null);

          if (sensor && fruit) {
             if (!fruit.isNewSpawn && (fruit.speed || 0) < 0.1) {
                if (fruit.position.y < sensor.position.y) {
                    dangerDetected = true;
                    shouldGameOver = true;
                }
             }
          }
        });

        if (dangerDetected !== isDangerRef.current) {
            setIsDanger(dangerDetected);
        }

        if (shouldGameOver && isDangerRef.current) {
           if(gameStateRef.current === "PLAYING") {
               setGameState("GAMEOVER");
               setEndReason("DEADLINE");
               setTotalScore(s => s + scoreRef.current);
           }
        }
      });

      Events.on(engine, "collisionStart", (event: ICollisionEvent) => {
        const pairs = event.pairs;
        pairs.forEach((pair) => {
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
                    
                    setGameState("GAMEOVER");
                    setEndReason("CLEAR");
                    setTotalScore(s => s + scoreRef.current + watermelonScoreRef.current);
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newBody = createFruit(midX, midY, nextId, true) as any;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (renderRef.current && (renderRef.current as any).canvas) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderRef.current as any).canvas.remove();
      }
    };
  }, [fillQueue, gameOver]);

  // [React 핸들러]
  const updateAim = (clientX: number, rect: DOMRect) => {
    const nextId = queueRef.current[0];
    const nextDef = fruits.find(f => f.id === nextId);
    const r = nextDef ? nextDef.radius : 20;

    const minX = WALL_THICKNESS + r;
    const maxX = CANVAS_WIDTH - WALL_THICKNESS - r;
    const x = Math.max(minX, Math.min(maxX, clientX - rect.left));
    setAimX(x);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (gameState !== "PLAYING" || shotsRef.current <= 0) return;
    setIsAiming(true);
    const rect = e.currentTarget.getBoundingClientRect();
    updateAim(e.clientX, rect);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isAiming) return;
    const rect = e.currentTarget.getBoundingClientRect();
    updateAim(e.clientX, rect);
  };

  const onPointerUp = () => {
    if (!isAiming) return;
    setIsAiming(false);
    dropFruit();
  };

  const dropFruit = () => {
    if (shotsRef.current <= 0) return;

    const spawnId = queueRef.current[0];
    const currentQueue = [...queueRef.current];
    currentQueue.shift();
    setNextQueue(currentQueue);
    setTimeout(fillQueue, 0);

    const nextShots = shotsRef.current - 1;
    setCurrentShots(nextShots);

    if (nextShots <= 0) {
        setTimeout(() => {
            if (gameStateRef.current === "PLAYING") {
                gameOver("NO_SHOT");
            }
        }, 3000);
    }

    if (sceneRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createFn = (sceneRef.current as any).createFruit;
        if (createFn) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body = createFn(aimX, SPAWN_Y, spawnId) as any;
            if (body && engineRef.current) {
                 const Matter = (matterLibRef.current);
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 Matter.World.add((engineRef.current as any).world, body);
            }
        }
    }
  };

  const handleTempChange = (index: number, key: keyof FruitDef, value: string | number) => {
    setTempFruits(prev => {
      const next = [...prev];
      (next[index] as Record<string, string | number | undefined>)[key] = value;
      return next;
    });
  };

  const normalizeProbabilities = () => {
    const candidates = tempFruits.filter(f => f.id <= spawnMaxLevel);
    const currentSum = candidates.reduce((sum, f) => sum + f.probability, 0);
    
    if (currentSum === 0) return; 

    const newFruits = [...tempFruits];
    let newSum = 0;

    candidates.forEach((f, idx) => {
       const realIndex = newFruits.findIndex(item => item.id === f.id);
       if (realIndex === -1) return;

       let newProb = Math.round((f.probability / currentSum) * 1000) / 10;
       
       if (idx === candidates.length - 1) {
           newProb = Number((100 - newSum).toFixed(1));
       } else {
           newSum += newProb;
       }
       
       newFruits[realIndex].probability = newProb;
    });

    setTempFruits(newFruits);
  };

  const applySettings = () => {
    setFruits(tempFruits);
    alert("설정이 적용되었습니다!");
  };

  const currentTotalProb = tempFruits
    .filter(f => f.id <= spawnMaxLevel)
    .reduce((sum, f) => sum + f.probability, 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 font-sans select-none touch-none">

      <div className="max-w-7xl mx-auto flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">🍉 수박게임 시뮬레이터</h1>
        <div className="flex gap-6 text-sm text-gray-700">
          <div>Total Plays: <span className="font-bold text-gray-900">{totalPlay}</span></div>
          <div>Total Score: <span className="font-bold text-gray-900">{totalScore}</span></div>
          <button onClick={() => { setTotalPlay(0); setTotalScore(0); }} className="text-red-500 underline font-semibold">기록 초기화</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="col-span-1 flex flex-col items-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg w-fit relative">

            {gameState === "READY" && (
              <div className="absolute inset-0 z-50 bg-black/50 rounded-xl flex flex-col items-center justify-center text-white">
                <h2 className="text-3xl font-bold mb-4">READY</h2>
                <button onClick={startGame} className="px-8 py-3 bg-indigo-600 rounded-full font-bold hover:bg-indigo-500 transition">
                  START GAME
                </button>
              </div>
            )}
            
            {gameState === "GAMEOVER" && (
              <div className="absolute inset-0 z-50 bg-black/80 rounded-xl flex flex-col items-center justify-center text-white">
                {endReason === "CLEAR" ? (
                    <>
                        <h2 className="text-4xl font-black mb-2 text-green-400">🎉 Game Clear! 🎉</h2>
                        <p className="mb-6 text-green-200">수박을 만들었습니다!</p>
                    </>
                ) : endReason === "NO_SHOT" ? (
                    <h2 className="text-3xl font-bold mb-6 text-orange-400">No More Shot!</h2>
                ) : (
                    <h2 className="text-3xl font-bold mb-6 text-red-500">Game Over</h2>
                )}
                
                <div className="text-center mb-6">
                  <p className="text-xl font-bold text-amber-500">획득 점수: {score}</p>
                  <p className="text-lg">🍉 Count: {watermelonsCount}</p>
                </div>
                <button onClick={startGame} className="px-8 py-3 bg-gray-100 text-gray-900 rounded-full font-bold hover:bg-gray-200 transition">
                  다시 하기
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mb-2 px-2" style={{ width: `${CANVAS_WIDTH}px` }}>
              <div className="text-xl font-black text-amber-500">획득 점수: {score}</div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono bg-gray-200 px-3 py-1 rounded text-gray-800 font-bold border border-gray-300">
                  Shots: <span className={currentShots < 10 ? "text-red-600" : "text-gray-900"}>{currentShots}</span>
                </div>
                <button onClick={() => setGameState("READY")} className="text-xs text-red-500 font-bold hover:text-red-700">중도 포기</button>
              </div>
            </div>

            <div className="flex gap-2">
              <div 
                className="relative overflow-hidden rounded-lg border-2 border-gray-200 bg-[#F7F4EB] touch-none" 
                style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp} 
              >
                {(isAiming || gameState === "PLAYING") && (
                   <div className="absolute top-0 bottom-0 w-[2px] border-l-2 border-dashed border-gray-400/50 pointer-events-none z-20"
                        style={{ left: aimX }}
                   />
                )}

                {gameState === "PLAYING" && nextQueue.length > 0 && (
                   <div className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                        style={{ left: aimX, top: SPAWN_Y }}>
                        {(() => {
                           const f = fruits.find(i => i.id === nextQueue[0]);
                           if (!f) return null;
                           return (
                             <div style={{ 
                                 width: f.radius * 2, 
                                 height: f.radius * 2 * (f.originalHeight && f.originalWidth ? f.originalHeight/f.originalWidth : 1),
                                 opacity: 0.8 
                             }} className="flex items-center justify-center">
                                {f.img ? <img src={f.img} alt="" className="w-full h-full object-contain"/> : <div className="w-full h-full rounded-full" style={{backgroundColor: f.color}}/>}
                             </div>
                           );
                        })()}
                   </div>
                )}

                <div
                  className={`absolute left-0 w-full h-[2px] z-30 pointer-events-none transition-colors duration-200 ${isDanger ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-gray-300"}`}
                  style={{ top: `${(deadLinePercent / 100) * 100}%` }}
                />

                <div ref={sceneRef} className="w-full h-full relative z-10 pointer-events-none" />
              </div>

              <div className="w-16 flex-shrink-0 flex flex-col gap-1 py-2 bg-gray-50 rounded-lg items-center overflow-hidden border" style={{ maxHeight: `${CANVAS_HEIGHT}px`, overflowY: 'auto' }}>
                <span className="text-[10px] font-bold text-gray-400 mb-1">WAITING</span>
                {nextQueue.slice(1, 11).map((nid, idx) => {
                  const f = fruits.find(i => i.id === nid);
                  if (!f) return null;
                  return (
                    <div key={idx} className="w-10 h-10 flex-shrink-0 bg-white rounded-full flex items-center justify-center border shadow-sm relative">
                      {f.img ? <img src={f.img} alt={f.name} className="w-8 h-8 object-contain" /> : <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.color }} />}
                      <span className="absolute -bottom-1 -right-1 text-[8px] bg-gray-800 text-white px-1 rounded-full">{f.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

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
              <div>
                <label className="block text-gray-500 mb-1">경고 선 (%)</label>
                <input type="number" value={deadLinePercent} onChange={(e) => setDeadLinePercent(Number(e.target.value))} className="w-full border p-1 rounded text-red-500 font-bold" />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center mb-4 bg-gray-50 p-2 rounded">
              * 적용하기를 누르면 확률이 유지된 채 과일 크기순 정렬됩니다.
            </p>

            <div className="space-y-2">
              <div className="grid gap-1 text-[10px] text-gray-500 font-bold text-center mb-2" style={{ gridTemplateColumns: "1fr 2fr 2fr 2fr 2fr 2fr 2fr" }}>
                <div>단계</div>
                <div>이름</div>
                <div>크기</div>
                <div>탄성</div>
                <div>마찰</div>
                <div>밀도</div>
                <div className="flex flex-col items-center justify-center">
                    <span>확률</span>
                    <button 
                        onClick={normalizeProbabilities}
                        className="text-[8px] bg-indigo-100 text-indigo-700 px-1 rounded hover:bg-indigo-200 mt-1"
                    >
                        100% 맞춤
                    </button>
                </div>
              </div>

              {tempFruits.map((fruit, index) => {
                const isSpawnable = fruit.id <= spawnMaxLevel;

                return (
                  <div key={fruit.id} className={`grid gap-1 items-center p-1 rounded border ${isSpawnable ? 'bg-white' : 'bg-gray-100 opacity-60'}`}
                       style={{ gridTemplateColumns: "1fr 2fr 2fr 2fr 2fr 2fr 2fr" }}>
                    
                    <div className="text-center font-bold text-xs text-gray-600">{fruit.id}</div>

                    <div className="text-center text-[9px] text-gray-700 truncate px-1">
                      {fruit.name}
                    </div>

                    <div>
                      <input
                        type="number"
                        value={Math.round(fruit.radius)}
                        onChange={(e) => handleTempChange(index, 'radius', Number(e.target.value))}
                        className="w-full text-center text-[10px] border rounded p-1 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                    </div>

                    <div>
                       <input 
                         type="number" step="0.1"
                         value={fruit.restitution} 
                         onChange={(e) => handleTempChange(index, 'restitution', Number(e.target.value))}
                         className="w-full text-center text-[10px] border rounded p-1 bg-blue-50 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700"
                       />
                    </div>
                    <div>
                       <input 
                         type="number" step="0.01"
                         value={fruit.friction} 
                         onChange={(e) => handleTempChange(index, 'friction', Number(e.target.value))}
                         className="w-full text-center text-[10px] border rounded p-1 bg-green-50 dark:bg-green-900 dark:text-green-100 dark:border-green-700"
                       />
                    </div>
                    <div>
                       <input 
                         type="number" step="0.001"
                         value={fruit.density} 
                         onChange={(e) => handleTempChange(index, 'density', Number(e.target.value))}
                         className="w-full text-center text-[10px] border rounded p-1 bg-orange-50 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700"
                       />
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        value={fruit.probability}
                        onChange={(e) => handleTempChange(index, 'probability', Number(e.target.value))}
                        disabled={!isSpawnable}
                        className={`w-full text-center text-[10px] border rounded p-1 ${isSpawnable ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'text-gray-300 dark:text-gray-600'} dark:bg-gray-700 dark:border-gray-600`}
                      />
                    </div>
                  </div>
                );
              })}
              
              <div className="grid gap-1 mt-2 pt-2 border-t" style={{ gridTemplateColumns: "1fr 10fr 2fr" }}>
                  <div />
                  <div className="text-right text-xs font-bold text-gray-600 pr-2">Total Prob:</div>
                  <div className={`text-center text-xs font-bold ${Math.abs(currentTotalProb - 100) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>
                      {currentTotalProb.toFixed(1)}%
                  </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}