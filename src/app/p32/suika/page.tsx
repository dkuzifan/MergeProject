"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useCallback } from "react";

// ----------------------------------------------------------------------
// 1. 마스터 데이터 및 타입 정의
// ----------------------------------------------------------------------

const CANVAS_WIDTH = 358;
const CANVAS_HEIGHT = 475;
const DEFAULT_SCALE_RATIO = 0.4972;
const WALL_THICKNESS = 10;
const SPAWN_Y = 30;

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
    sprite?: { texture: string; xScale: number; yScale: number };
  };
}

interface ICollisionEvent {
  pairs: { bodyA: IMatterBody; bodyB: IMatterBody }[];
}

type FruitDef = {
  id: number;
  name: string;
  radius: number;
  color: string;
  img?: string;
  originalWidth?: number;
  originalHeight?: number;
  restitution: number;
  friction: number;
  density: number;
  score: number;
};

type ScoreRangeEntry = {
  fruitId: number;
  probability: number;
};

type ScoreRange = {
  id: number;
  minScore: number;
  entries: ScoreRangeEntry[];
  maxRepeatCount: number;
};

const INITIAL_FRUITS: FruitDef[] = [
  { id: 1,  name: "라즈베리",  radius: (48  / 2) * DEFAULT_SCALE_RATIO, color: "#E63E85", img: "/images/suika/fruit_00_raspberry.svg",   originalWidth: 48,  originalHeight: 48,  restitution: 0.5,  friction: 0.01, density: 0.001,  score: 10   },
  { id: 2,  name: "블루베리",  radius: (68  / 2) * DEFAULT_SCALE_RATIO, color: "#5B43D8", img: "/images/suika/fruit_01_blueberry.svg",   originalWidth: 68,  originalHeight: 68,  restitution: 0.5,  friction: 0.01, density: 0.001,  score: 20   },
  { id: 3,  name: "라임",      radius: (95  / 2) * DEFAULT_SCALE_RATIO, color: "#8AC249", img: "/images/suika/fruit_02_lime.svg",         originalWidth: 95,  originalHeight: 95,  restitution: 0.45, friction: 0.01, density: 0.001,  score: 30   },
  { id: 4,  name: "망고스틴",  radius: (124 / 2) * DEFAULT_SCALE_RATIO, color: "#6D214F", img: "/images/suika/fruit_03_mangosteen.svg",  originalWidth: 124, originalHeight: 124, restitution: 0.4,  friction: 0.01, density: 0.001,  score: 40   },
  { id: 5,  name: "용과",      radius: (152 / 2) * DEFAULT_SCALE_RATIO, color: "#E63E85", img: "/images/suika/fruit_04_dragonfruit.svg", originalWidth: 152, originalHeight: 168, restitution: 0.35, friction: 0.02, density: 0.0015, score: 50   },
  { id: 6,  name: "파파야",    radius: (180 / 2) * DEFAULT_SCALE_RATIO, color: "#FF9F1C", img: "/images/suika/fruit_05_papaya.svg",       originalWidth: 180, originalHeight: 190, restitution: 0.3,  friction: 0.02, density: 0.0015, score: 60   },
  { id: 7,  name: "망고",      radius: (208 / 2) * DEFAULT_SCALE_RATIO, color: "#FF6B00", img: "/images/suika/fruit_06_mango.svg",         originalWidth: 208, originalHeight: 196, restitution: 0.25, friction: 0.03, density: 0.002,  score: 70   },
  { id: 8,  name: "파인애플",  radius: (222 / 2) * DEFAULT_SCALE_RATIO, color: "#FFB300", img: "/images/suika/fruit_07_pineapple.svg",   originalWidth: 222, originalHeight: 282, restitution: 0.2,  friction: 0.03, density: 0.002,  score: 80   },
  { id: 9,  name: "두리안",    radius: (295 / 2) * DEFAULT_SCALE_RATIO, color: "#FCEBB6", img: "/images/suika/fruit_08_durian.svg",       originalWidth: 295, originalHeight: 295, restitution: 0.2,  friction: 0.05, density: 0.0025, score: 90   },
  { id: 10, name: "코코넛",    radius: (358 / 2) * DEFAULT_SCALE_RATIO, color: "#F0EFE7", img: "/images/suika/fruit_09_coconut.svg",      originalWidth: 358, originalHeight: 358, restitution: 0.1,  friction: 0.1,  density: 0.003,  score: 100  },
  { id: 11, name: "수박",      radius: (460 / 2) * DEFAULT_SCALE_RATIO, color: "#4CAF50", img: "/images/suika/fruit_10_watermelon.svg",  originalWidth: 460, originalHeight: 460, restitution: 0.1,  friction: 0.1,  density: 0.003,  score: 1000 },
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: 12 + i, name: `과일 ${12 + i}`, radius: 120 + i * 5, color: "#94a3b8", restitution: 0.2, friction: 0.1, density: 0.001, score: 0,
  })),
];

const INITIAL_SCORE_RANGES: ScoreRange[] = [
  {
    id: 1,
    minScore: 0,
    entries: [
      { fruitId: 1, probability: 35 },
      { fruitId: 2, probability: 40 },
      { fruitId: 3, probability: 25 },
    ],
    maxRepeatCount: 3,
  },
];

type GameState = "READY" | "PLAYING" | "GAMEOVER";
type EndReason = "DEADLINE" | "NO_SHOT" | "CLEAR" | null;

let rangeIdCounter = 2;

export default function SuikaPage() {
  const sceneRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [gameState, setGameState] = useState<GameState>("READY");
  const [endReason, setEndReason] = useState<EndReason>(null);

  const [fruits, setFruits] = useState<FruitDef[]>(INITIAL_FRUITS);
  const [tempFruits, setTempFruits] = useState<FruitDef[]>(INITIAL_FRUITS);

  const [scoreRanges, setScoreRanges] = useState<ScoreRange[]>(INITIAL_SCORE_RANGES);
  const [tempScoreRanges, setTempScoreRanges] = useState<ScoreRange[]>(INITIAL_SCORE_RANGES);

  const [activeTab, setActiveTab] = useState<"fruits" | "ranges">("fruits");

  // Settings
  const [scaleRatio, setScaleRatio] = useState(DEFAULT_SCALE_RATIO);
  const [maxLevel, setMaxLevel] = useState(11);
  const [totalShots, setTotalShots] = useState(50);
  const [currentShots, setCurrentShots] = useState(50);
  const [deadLinePercent, setDeadLinePercent] = useState(20);

  // Score & Records
  const [score, setScore] = useState(0);
  const [totalPlay, setTotalPlay] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [watermelonsCount, setWatermelonsCount] = useState(0);
  const [isDanger, setIsDanger] = useState(false);

  const [nextQueue, setNextQueue] = useState<number[]>([]);

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
  const deadLinePercentRef = useRef(deadLinePercent);
  const scoreRef = useRef(score);
  const isDangerRef = useRef(isDanger);
  const scoreRangesRef = useRef(scoreRanges);

  // Sync Refs
  useEffect(() => { fruitsRef.current = fruits; }, [fruits]);
  useEffect(() => { queueRef.current = nextQueue; }, [nextQueue]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { shotsRef.current = currentShots; }, [currentShots]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { isDangerRef.current = isDanger; }, [isDanger]);
  useEffect(() => { scoreRangesRef.current = scoreRanges; }, [scoreRanges]);

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

  // 점수 기준 구간 찾기 (A안: floor — 현재 점수 이하의 구간 중 minScore가 가장 큰 것)
  const findRange = useCallback((currentScore: number): ScoreRange => {
    const ranges = scoreRangesRef.current;
    const sorted = [...ranges].sort((a, b) => b.minScore - a.minScore);
    return (
      sorted.find(r => r.minScore <= currentScore) ??
      [...ranges].sort((a, b) => a.minScore - b.minScore)[0]
    );
  }, []);

  const pickNextFruitId = useCallback((currentScore: number, lastId: number | null, consecutiveCount: number): number => {
    const range = findRange(currentScore);
    if (!range || range.entries.length === 0) return 1;

    let candidates = range.entries;
    if (lastId !== null && consecutiveCount >= range.maxRepeatCount) {
      const filtered = candidates.filter(e => e.fruitId !== lastId);
      if (filtered.length > 0) candidates = filtered;
    }

    const totalProb = candidates.reduce((sum, e) => sum + e.probability, 0);
    if (totalProb === 0) return candidates[0].fruitId;

    let random = Math.random() * totalProb;
    for (const e of candidates) {
      if (random < e.probability) return e.fruitId;
      random -= e.probability;
    }
    return candidates[candidates.length - 1].fruitId;
  }, [findRange]);

  const fillQueue = useCallback(() => {
    setNextQueue(prev => {
      const newQueue = [...prev];
      while (newQueue.length < 10) {
        const lastId = newQueue.length > 0 ? newQueue[newQueue.length - 1] : null;
        let consecutive = 0;
        if (lastId !== null) {
          for (let i = newQueue.length - 1; i >= 0; i--) {
            if (newQueue[i] === lastId) consecutive++;
            else break;
          }
        }
        newQueue.push(pickNextFruitId(scoreRef.current, lastId, consecutive));
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

      const ground    = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 50, CANVAS_WIDTH + 200, 100, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      const leftWall  = Bodies.rectangle(-10, CANVAS_HEIGHT / 2, 40, CANVAS_HEIGHT * 2, { isStatic: true, render: { fillStyle: "#E6DCC8" } });
      const rightWall = Bodies.rectangle(CANVAS_WIDTH + 10, CANVAS_HEIGHT / 2, 40, CANVAS_HEIGHT * 2, { isStatic: true, render: { fillStyle: "#E6DCC8" } });

      const deadLineY = CANVAS_HEIGHT * (deadLinePercentRef.current / 100);
      const deadLineSensor = Bodies.rectangle(CANVAS_WIDTH / 2, deadLineY, CANVAS_WIDTH, 2, {
        isStatic: true,
        isSensor: true,
        label: "deadLine",
        render: { fillStyle: "transparent" },
      });

      World.add(engine.world, [ground, leftWall, rightWall, deadLineSensor]);

      const createFruit = (x: number, y: number, id: number, isDynamic = true) => {
        const def = fruitsRef.current.find(f => f.id === id);
        if (!def) return null;

        const radius = def.radius;
        const safeX = Math.max(WALL_THICKNESS + radius, Math.min(CANVAS_WIDTH - WALL_THICKNESS - radius, x));

        let scaleY = 1;
        if (def.img && def.originalWidth && def.originalHeight) {
          scaleY = def.originalHeight / def.originalWidth;
        }

        const body = Bodies.circle(safeX, y, radius, {
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
            } : undefined,
          },
        });

        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (body) (body as any).isNewSpawn = false;
        }, 1000);

        if (scaleY !== 1) Body.scale(body, 1, scaleY);

        return body;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sceneRef.current as any).createFruit = createFruit;

      Events.on(engine, "collisionActive", (event: ICollisionEvent) => {
        if (gameStateRef.current === "GAMEOVER") return;

        const pairs = event.pairs;
        let dangerDetected = false;
        let shouldGameOver = false;

        pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          const sensor = bodyA.label === "deadLine" ? bodyA : (bodyB.label === "deadLine" ? bodyB : null);
          const fruit  = sensor === bodyA ? bodyB : (sensor === bodyB ? bodyA : null);

          if (sensor && fruit) {
            if (!fruit.isNewSpawn && (fruit.speed || 0) < 0.1) {
              if (fruit.position.y < sensor.position.y) {
                dangerDetected = true;
                shouldGameOver = true;
              }
            }
          }
        });

        if (dangerDetected !== isDangerRef.current) setIsDanger(dangerDetected);

        if (shouldGameOver && isDangerRef.current) {
          if (gameStateRef.current === "PLAYING") {
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

              const nextId  = idA + 1;
              const nextDef = fruitsRef.current.find(f => f.id === nextId);

              if (nextDef) {
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;

                World.remove(engine.world, [bodyA, bodyB]);
                setScore(prev => prev + nextDef.score);

                if (nextId === 11) {
                  setWatermelonsCount(p => p + 1);
                  setGameState("GAMEOVER");
                  setEndReason("CLEAR");
                  setTotalScore(s => s + scoreRef.current + nextDef.score);
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

  // --- React 핸들러 ---
  const updateAim = (clientX: number, rect: DOMRect) => {
    const nextId  = queueRef.current[0];
    const nextDef = fruits.find(f => f.id === nextId);
    const r = nextDef ? nextDef.radius : 20;
    const x = Math.max(WALL_THICKNESS + r, Math.min(CANVAS_WIDTH - WALL_THICKNESS - r, clientX - rect.left));
    setAimX(x);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (gameState !== "PLAYING" || shotsRef.current <= 0) return;
    setIsAiming(true);
    updateAim(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isAiming) return;
    updateAim(e.clientX, e.currentTarget.getBoundingClientRect());
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
        if (gameStateRef.current === "PLAYING") gameOver("NO_SHOT");
      }, 3000);
    }

    if (sceneRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createFn = (sceneRef.current as any).createFruit;
      if (createFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = createFn(aimX, SPAWN_Y, spawnId) as any;
        if (body && engineRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          matterLibRef.current.World.add((engineRef.current as any).world, body);
        }
      }
    }
  };

  // --- 설정 핸들러 ---
  const handleTempChange = (index: number, key: keyof FruitDef, value: string | number) => {
    setTempFruits(prev => {
      const next = [...prev];
      (next[index] as Record<string, string | number | undefined>)[key] = value;
      return next;
    });
  };

  const handleScaleRatioChange = (value: number) => {
    setScaleRatio(value);
    setTempFruits(prev => prev.map(f =>
      f.originalWidth ? { ...f, radius: (f.originalWidth / 2) * value } : f
    ));
  };

  const applySettings = () => {
    setFruits(tempFruits);
    setScoreRanges(tempScoreRanges);
    alert("설정이 적용되었습니다!");
  };

  // --- 점수 구간 핸들러 ---
  const addScoreRange = () => {
    const sorted = [...tempScoreRanges].sort((a, b) => a.minScore - b.minScore);
    const lastMin = sorted.length > 0 ? sorted[sorted.length - 1].minScore : 0;
    setTempScoreRanges(prev => [
      ...prev,
      { id: rangeIdCounter++, minScore: lastMin + 100, entries: [{ fruitId: 1, probability: 100 }], maxRepeatCount: 3 },
    ]);
  };

  const deleteScoreRange = (id: number) => {
    setTempScoreRanges(prev => prev.filter(r => r.id !== id));
  };

  const updateRangeField = (id: number, key: "minScore" | "maxRepeatCount", value: number) => {
    setTempScoreRanges(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));
  };

  const addRangeEntry = (rangeId: number) => {
    setTempScoreRanges(prev => prev.map(r => {
      if (r.id !== rangeId || r.entries.length >= 11) return r;
      return { ...r, entries: [...r.entries, { fruitId: 1, probability: 0 }] };
    }));
  };

  const deleteRangeEntry = (rangeId: number, entryIndex: number) => {
    setTempScoreRanges(prev => prev.map(r => {
      if (r.id !== rangeId || r.entries.length <= 1) return r;
      const entries = r.entries.filter((_, i) => i !== entryIndex);
      return { ...r, entries };
    }));
  };

  const updateRangeEntry = (rangeId: number, entryIndex: number, key: keyof ScoreRangeEntry, value: number) => {
    setTempScoreRanges(prev => prev.map(r => {
      if (r.id !== rangeId) return r;
      const entries = r.entries.map((e, i) => i === entryIndex ? { ...e, [key]: value } : e);
      return { ...r, entries };
    }));
  };

  const normalizeRangeEntries = (rangeId: number) => {
    setTempScoreRanges(prev => prev.map(r => {
      if (r.id !== rangeId) return r;
      const total = r.entries.reduce((s, e) => s + e.probability, 0);
      if (total === 0) return r;
      let sum = 0;
      const entries = r.entries.map((e, i) => {
        if (i === r.entries.length - 1) return { ...e, probability: Number((100 - sum).toFixed(1)) };
        const p = Math.round((e.probability / total) * 1000) / 10;
        sum += p;
        return { ...e, probability: p };
      });
      return { ...r, entries };
    }));
  };

  // 구간 표시용 maxScore 계산 (다음 구간의 minScore - 1, 마지막은 ∞)
  const getRangeMaxScore = (range: ScoreRange, allRanges: ScoreRange[]): string => {
    const sorted = [...allRanges].sort((a, b) => a.minScore - b.minScore);
    const idx = sorted.findIndex(r => r.id === range.id);
    if (idx === sorted.length - 1) return "∞";
    return String(sorted[idx + 1].minScore - 1);
  };

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

        {/* ── 게임 캔버스 ── */}
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
                       style={{ left: aimX }} />
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
                          height: f.radius * 2 * (f.originalHeight && f.originalWidth ? f.originalHeight / f.originalWidth : 1),
                          opacity: 0.8,
                        }} className="flex items-center justify-center">
                          {f.img
                            ? <img src={f.img} alt="" className="w-full h-full object-contain" />
                            : <div className="w-full h-full rounded-full" style={{ backgroundColor: f.color }} />}
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

              <div className="w-16 flex-shrink-0 flex flex-col gap-1 py-2 bg-gray-50 rounded-lg items-center overflow-hidden border" style={{ maxHeight: `${CANVAS_HEIGHT}px`, overflowY: "auto" }}>
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

        {/* ── 설정 패널 ── */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg h-full max-h-[850px] flex flex-col">

            {/* 헤더 */}
            <div className="flex justify-between items-center mb-3 border-b pb-2 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800">⚙️ 룰 & 서열</h2>
              <div className="flex gap-2">
                <button className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded font-bold hover:bg-gray-300 border border-gray-300">
                  CSV 추출
                </button>
                <button onClick={applySettings} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 font-bold">적용하기</button>
              </div>
            </div>

            {/* 공통 설정 */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs flex-shrink-0">
              <div className="col-span-2">
                <label className="block text-gray-500 mb-1">
                  스케일 비율
                  <span className="ml-1 text-gray-400">(기본값: {DEFAULT_SCALE_RATIO})</span>
                </label>
                <input
                  type="number" step="0.001" min="0.1" max="2"
                  value={scaleRatio}
                  onChange={(e) => handleScaleRatioChange(Number(e.target.value))}
                  className="w-full border p-1 rounded font-bold text-purple-600"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">총 단계</label>
                <input type="number" value={maxLevel} onChange={(e) => setMaxLevel(Number(e.target.value))} className="w-full border p-1 rounded" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">발사 횟수</label>
                <input type="number" value={totalShots} onChange={(e) => setTotalShots(Number(e.target.value))} className="w-full border p-1 rounded" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">경고 선 (%)</label>
                <input type="number" value={deadLinePercent} onChange={(e) => setDeadLinePercent(Number(e.target.value))} className="w-full border p-1 rounded text-red-500 font-bold" />
              </div>
            </div>

            {/* 탭 */}
            <div className="flex border-b mb-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab("fruits")}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "fruits" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                과일 특성
              </button>
              <button
                onClick={() => setActiveTab("ranges")}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "ranges" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                점수 구간
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="overflow-y-auto flex-1 min-h-0">

              {/* ── 과일 특성 탭 ── */}
              {activeTab === "fruits" && (
                <div className="space-y-2">
                  <div className="grid gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-bold text-center mb-2"
                       style={{ gridTemplateColumns: "0.8fr 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr" }}>
                    <div>단계</div>
                    <div>이름</div>
                    <div>크기</div>
                    <div>탄성</div>
                    <div>마찰</div>
                    <div>질량</div>
                    <div>점수</div>
                  </div>

                  {tempFruits.filter(f => f.id <= maxLevel).map((fruit, index) => (
                    <div key={fruit.id}
                         className="grid gap-1 items-center p-1 rounded border bg-white dark:bg-gray-700 dark:border-gray-600"
                         style={{ gridTemplateColumns: "0.8fr 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr" }}>
                      <div className="text-center font-bold text-xs text-gray-600 dark:text-gray-300">{fruit.id}</div>
                      <div className="text-center text-[9px] font-bold text-gray-700 dark:text-gray-200 truncate px-1">{fruit.name}</div>
                      <div>
                        <input type="number" value={Math.round(fruit.radius)}
                          onChange={(e) => handleTempChange(index, "radius", Number(e.target.value))}
                          className="w-full text-center text-[10px] border rounded p-1 bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                      </div>
                      <div>
                        <input type="number" step="0.1" value={fruit.restitution}
                          onChange={(e) => handleTempChange(index, "restitution", Number(e.target.value))}
                          className="w-full text-center text-[10px] border rounded p-1 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200" />
                      </div>
                      <div>
                        <input type="number" step="0.01" value={fruit.friction}
                          onChange={(e) => handleTempChange(index, "friction", Number(e.target.value))}
                          className="w-full text-center text-[10px] border rounded p-1 bg-green-50 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200" />
                      </div>
                      <div>
                        <input type="number" step="0.001" value={fruit.density}
                          onChange={(e) => handleTempChange(index, "density", Number(e.target.value))}
                          className="w-full text-center text-[10px] border rounded p-1 bg-orange-50 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-200" />
                      </div>
                      <div>
                        <input type="number" value={fruit.score}
                          onChange={(e) => handleTempChange(index, "score", Number(e.target.value))}
                          className="w-full text-center text-[10px] border rounded p-1 bg-yellow-50 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── 점수 구간 탭 ── */}
              {activeTab === "ranges" && (
                <div className="space-y-4">
                  {[...tempScoreRanges]
                    .sort((a, b) => a.minScore - b.minScore)
                    .map((range) => {
                      const maxScore = getRangeMaxScore(range, tempScoreRanges);
                      const totalProb = range.entries.reduce((s, e) => s + e.probability, 0);
                      const isValid = Math.abs(totalProb - 100) < 0.1;

                      return (
                        <div key={range.id} className="border dark:border-gray-600 rounded-lg overflow-hidden">
                          {/* 구간 헤더 */}
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b dark:border-gray-600">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-gray-700 dark:text-gray-200">
                                {range.minScore}점 ~ {maxScore}점
                              </span>
                              <span className="text-gray-400">|</span>
                              <label className="text-gray-500 dark:text-gray-400">최소 점수</label>
                              <input
                                type="number" min="0"
                                value={range.minScore}
                                onChange={(e) => updateRangeField(range.id, "minScore", Number(e.target.value))}
                                className="w-16 border rounded p-0.5 text-center text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-gray-600 dark:border-gray-500"
                              />
                              <span className="text-gray-400">|</span>
                              <label className="text-gray-500 dark:text-gray-400">연속 최대</label>
                              <input
                                type="number" min="1" max="11"
                                value={range.maxRepeatCount}
                                onChange={(e) => updateRangeField(range.id, "maxRepeatCount", Number(e.target.value))}
                                className="w-10 border rounded p-0.5 text-center text-xs font-bold text-orange-600 dark:text-orange-300 bg-white dark:bg-gray-600 dark:border-gray-500"
                              />
                            </div>
                            {tempScoreRanges.length > 1 && (
                              <button
                                onClick={() => deleteScoreRange(range.id)}
                                className="text-[10px] text-red-400 hover:text-red-500 font-bold px-1"
                              >
                                ✕ 구간 삭제
                              </button>
                            )}
                          </div>

                          {/* 엔트리 목록 */}
                          <div className="p-2 space-y-1 bg-white dark:bg-gray-800">
                            <div className="grid gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center mb-1"
                                 style={{ gridTemplateColumns: "2fr 3fr 1fr" }}>
                              <div>과일 단계</div>
                              <div>확률 (%)</div>
                              <div />
                            </div>

                            {range.entries.map((entry, ei) => {
                              const fruitDef = fruits.find(f => f.id === entry.fruitId);
                              return (
                                <div key={ei} className="grid gap-1 items-center"
                                     style={{ gridTemplateColumns: "2fr 3fr 1fr" }}>
                                  <select
                                    value={entry.fruitId}
                                    onChange={(e) => updateRangeEntry(range.id, ei, "fruitId", Number(e.target.value))}
                                    className="border rounded p-1 text-xs text-center bg-white dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100"
                                  >
                                    {fruits.filter(f => f.id <= maxLevel).map(f => (
                                      <option key={f.id} value={f.id}>{f.id}단계 {f.name}</option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number" min="0" max="100" step="0.1"
                                      value={entry.probability}
                                      onChange={(e) => updateRangeEntry(range.id, ei, "probability", Number(e.target.value))}
                                      className="w-full border rounded p-1 text-xs text-center font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-gray-700 dark:border-gray-500"
                                    />
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">%</span>
                                  </div>
                                  <button
                                    onClick={() => deleteRangeEntry(range.id, ei)}
                                    disabled={range.entries.length <= 1}
                                    className="text-red-400 hover:text-red-600 disabled:opacity-20 text-xs font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                              void fruitDef;
                            })}

                            {/* 엔트리 푸터 */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t dark:border-gray-700">
                              <button
                                onClick={() => addRangeEntry(range.id)}
                                disabled={range.entries.length >= 11}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold disabled:opacity-30"
                              >
                                + 단계 추가
                              </button>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isValid ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                                  합계: {totalProb.toFixed(1)}%
                                </span>
                                <button
                                  onClick={() => normalizeRangeEntries(range.id)}
                                  className="text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900"
                                >
                                  100% 맞춤
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  <button
                    onClick={addScoreRange}
                    className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 font-bold transition-colors"
                  >
                    + 점수 구간 추가
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
