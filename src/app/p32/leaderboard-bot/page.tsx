"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type BotConfig = {
  id: number;
  bot_name: string;
  type_id: number;
  type_name: string;
  merge_min: number;
  merge_max: number;
  merge_prob: number;
  quest_min: number;
  quest_max: number;
  quest_prob: number;
  time_min: number;
  time_max: number;
  time_prob: number;
  time_max_score: number;
  countdown_sec: number;
};

type QuestPreset = { id: number; name: string; score: number };


type SimEntry = {
  id: number;
  name: string;
  isUser: boolean;
  totalScore: number;
  mergeScore: number;
  questScore: number;
  timeScore: number;
  totalGained: number;
};

type Preset = {
  name: string;
  composition: Record<number, number>;
};

// ─────────────────────────────────────────────
// Mock Data (6 types × ~33명 = 200명 풀)
// ─────────────────────────────────────────────
const MOCK_BOT_TYPES = [
  { id: 1, type_name: "타입1", merge_min: 5,  merge_max: 15, merge_prob: 70, quest_min: 10, quest_max: 30, quest_prob: 80, time_min: 1, time_max: 5,  time_prob: 30, time_max_score: 30,  countdown_sec: 1800 },
  { id: 2, type_name: "타입2", merge_min: 3,  merge_max: 10, merge_prob: 50, quest_min: 5,  quest_max: 20, quest_prob: 50, time_min: 1, time_max: 8,  time_prob: 40, time_max_score: 50,  countdown_sec: 1800 },
  { id: 3, type_name: "타입3", merge_min: 1,  merge_max: 5,  merge_prob: 20, quest_min: 2,  quest_max: 8,  quest_prob: 20, time_min: 3, time_max: 12, time_prob: 80, time_max_score: 100, countdown_sec: 900  },
  { id: 4, type_name: "타입4", merge_min: 2,  merge_max: 8,  merge_prob: 30, quest_min: 3,  quest_max: 10, quest_prob: 30, time_min: 2, time_max: 10, time_prob: 60, time_max_score: 80,  countdown_sec: 1200 },
  { id: 5, type_name: "타입5", merge_min: 1,  merge_max: 3,  merge_prob: 10, quest_min: 1,  quest_max: 5,  quest_prob: 10, time_min: 1, time_max: 4,  time_prob: 20, time_max_score: 20,  countdown_sec: 3600 },
  { id: 6, type_name: "타입6", merge_min: 4,  merge_max: 12, merge_prob: 60, quest_min: 8,  quest_max: 25, quest_prob: 70, time_min: 2, time_max: 8,  time_prob: 50, time_max_score: 60,  countdown_sec: 1500 },
];

const POOL_COUNTS = [34, 34, 33, 33, 33, 33];

function buildMockPool(): BotConfig[] {
  const bots: BotConfig[] = [];
  let id = 1;
  MOCK_BOT_TYPES.forEach((t, ti) => {
    for (let i = 1; i <= POOL_COUNTS[ti]; i++) {
      bots.push({
        id,
        bot_name: `PLAYER_${String(id).padStart(3, "0")}`,
        type_id: t.id,
        type_name: t.type_name,
        merge_min: t.merge_min, merge_max: t.merge_max, merge_prob: t.merge_prob,
        quest_min: t.quest_min, quest_max: t.quest_max, quest_prob: t.quest_prob,
        time_min:  t.time_min,  time_max:  t.time_max,  time_prob:  t.time_prob,
        time_max_score: t.time_max_score,
        countdown_sec:  t.countdown_sec,
      });
      id++;
    }
  });
  return bots;
}

const DEFAULT_COMPOSITION: Record<number, number> = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4 };
const INITIAL_POOL = buildMockPool();
const SESSION_MAX_MIN = 24 * 60; // 1440분
const PRESET_STORAGE_KEY       = "leaderboard_bot_presets";
const QUEST_PRESET_STORAGE_KEY = "leaderboard_quest_presets";

function pickFromPool(pool: BotConfig[], composition: Record<number, number>): BotConfig[] {
  const picked: BotConfig[] = [];
  for (const [typeIdStr, count] of Object.entries(composition)) {
    const typeId = Number(typeIdStr);
    const typePool = pool.filter(b => b.type_id === typeId);
    const shuffled = [...typePool].sort(() => Math.random() - 0.5);
    picked.push(...shuffled.slice(0, count));
  }
  return picked;
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

const TYPE_COLORS: Record<number, string> = {
  1: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
  2: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
  3: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  4: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  5: "bg-gray-100   text-gray-600   dark:bg-gray-700/50   dark:text-gray-400",
  6: "bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400",
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function LeaderboardBotPage() {
  const [allBots, setAllBots]           = useState<BotConfig[]>(INITIAL_POOL);
  const [selectedBots, setSelectedBots] = useState<BotConfig[]>(() => pickFromPool(INITIAL_POOL, DEFAULT_COMPOSITION));
  const [botTypes, setBotTypes]         = useState(MOCK_BOT_TYPES.map(t => ({ id: t.id, type_name: `타입 ${t.id}` })));

  const [typeComposition, setTypeComposition] = useState<Record<number, number>>(DEFAULT_COMPOSITION);
  const [compositionError, setCompositionError] = useState<string | null>(null);

  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [supabaseLoaded, setSupabaseLoaded]   = useState(false);

  // 유저 입력
  const [userInitScore,   setUserInitScore]   = useState(0);
  const [mergeCount,      setMergeCount]      = useState(0);
  const [activeMinutes,   setActiveMinutes]   = useState(0);
  const [inactiveMinutes, setInactiveMinutes] = useState(0);

  // 퀘스트 프리셋 (localStorage 저장)
  const [questPresets,    setQuestPresets]    = useState<QuestPreset[]>([
    { id: 1, name: "50점 퀘스트",  score: 50  },
    { id: 2, name: "100점 퀘스트", score: 100 },
    { id: 3, name: "120점 퀘스트", score: 120 },
  ]);
  const [questClears,     setQuestClears]     = useState<Record<number, number>>({});
  const [newQuestName,    setNewQuestName]    = useState("");
  const [newQuestScore,   setNewQuestScore]   = useState(50);

  const [results,      setResults]      = useState<SimEntry[] | null>(null);
  const [prevResults,  setPrevResults]  = useState<SimEntry[] | null>(null);
  const [showBotTable, setShowBotTable] = useState(true);

  const [savingBots,   setSavingBots]   = useState(false);
  const [saveMsg,      setSaveMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  // 프리셋
  const [presets,     setPresets]     = useState<Preset[]>([]);
  const [presetName,  setPresetName]  = useState("");

  // 초기 로드: localStorage 프리셋 + Supabase 타입/봇 데이터
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY);
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* ignore */ }
    try {
      const savedQ = localStorage.getItem(QUEST_PRESET_STORAGE_KEY);
      if (savedQ) setQuestPresets(JSON.parse(savedQ));
    } catch { /* ignore */ }
    loadFromSupabase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function savePresets(next: Preset[]) {
    setPresets(next);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets.filter(p => p.name !== name), { name, composition: { ...typeComposition } }];
    savePresets(next);
    setPresetName("");
  }

  function handleLoadPreset(preset: Preset) {
    setTypeComposition(preset.composition);
    setCompositionError(null);
  }

  function handleDeletePreset(name: string) {
    savePresets(presets.filter(p => p.name !== name));
  }

  // ── Supabase 로드 ──────────────────────────
  async function loadFromSupabase() {
    setLoadingSupabase(true);
    try {
      const supabase = createClient();
      const [{ data: types }, { data: botRows }] = await Promise.all([
        supabase.from("leaderboard_bot_types").select("*"),
        supabase.from("leaderboard_bots").select("*"),
      ]);

      const num = (t: Record<string, unknown>, key: string, fallback: number) => {
        const v = t[key];
        return typeof v === "number" ? v : Number(v) || fallback;
      };

      // ── 타입 로드 (봇 데이터와 무관하게 항상 처리) ──
      if (types?.length) {
        const loadedIds = new Set(types.map((t: Record<string, unknown>) => Number(t.id)));
        const mergedTypes = [
          ...types.map((t: Record<string, unknown>) => ({
            id: t.id as number,
            type_name: t.type_name as string,
          })),
          ...MOCK_BOT_TYPES
            .filter(t => !loadedIds.has(t.id))
            .map(t => ({ id: t.id, type_name: `${t.type_name} (임시)` })),
        ].sort((a, b) => a.id - b.id);
        setBotTypes(mergedTypes);
        setSupabaseLoaded(true);
      }

      // ── 봇 풀 로드 (봇 데이터가 있을 때만) ──
      if (types?.length && botRows?.length) {
        const typeMap = new Map<number, Record<string, unknown>>();
        types.forEach((t: Record<string, unknown>) => typeMap.set(Number(t.id), t));

        const pool: BotConfig[] = botRows.map((b: Record<string, unknown>) => {
          const t = typeMap.get(Number(b.bot_type_id)) ?? {};
          return {
            id:       Number(b.id),
            bot_name: String(b.bot_name ?? ""),
            type_id:  Number(b.bot_type_id),
            type_name: String(t.type_name ?? "Unknown"),
            merge_min:  num(t, "merge_min",  1),
            merge_max:  num(t, "merge_max",  10),
            merge_prob: num(t, "merge_prob", 0.5),
            quest_min:  num(t, "quest_min",  1),
            quest_max:  num(t, "quest_max",  10),
            quest_prob: num(t, "quest_prob", 0.5),
            time_min:   num(t, "time_min",   1),
            time_max:   num(t, "time_max",   10),
            time_prob:  num(t, "time_prob",  0.5),
            time_max_score: num(t, "time_max_score", 50),
            countdown_sec:  num(t, "countdown_sec",  1800),
          };
        });

        setAllBots(pool);
        setSelectedBots(pickFromPool(pool, typeComposition));
      }
    } catch (e) {
      console.error("Supabase 로드 실패:", e);
    } finally {
      setLoadingSupabase(false);
    }
  }

  // ── 29명 뽑기 ─────────────────────────────
  function handlePickBots() {
    const total = Object.values(typeComposition).reduce((s, v) => s + v, 0);
    if (total !== 29) {
      setCompositionError(`현재 합계 ${total}명 — 정확히 29명이어야 합니다.`);
      return;
    }
    for (const [typeIdStr, count] of Object.entries(typeComposition)) {
      const typeId = Number(typeIdStr);
      const poolCount = allBots.filter(b => b.type_id === typeId).length;
      const typeName = botTypes.find(t => t.id === typeId)?.type_name ?? `타입 ${typeId}`;
      if (count > poolCount) {
        setCompositionError(`${typeName} 풀 인원(${poolCount}명)보다 많이 선택했습니다.`);
        return;
      }
    }
    setCompositionError(null);
    setSelectedBots(pickFromPool(allBots, typeComposition));
    setResults(null);
  }

  // ── 시뮬레이션 실행 ────────────────────────
  function runSimulation() {
    const n = selectedBots.length;
    const mergeScores = new Array(n).fill(0);
    const questScores = new Array(n).fill(0);
    const timeScores  = new Array(n).fill(0);

    for (let m = 0; m < mergeCount; m++) {
      selectedBots.forEach((bot, i) => {
        if (Math.random() < bot.merge_prob / 100)
          mergeScores[i] += randInt(bot.merge_min, bot.merge_max);
      });
    }

    questPresets.forEach(preset => {
      const count = questClears[preset.id] ?? 0;
      for (let c = 0; c < count; c++) {
        selectedBots.forEach((bot, i) => {
          if (Math.random() < bot.quest_prob / 100)
            questScores[i] += randInt(bot.quest_min, bot.quest_max);
        });
      }
    });

    selectedBots.forEach((bot, i) => {
      const cycles = Math.floor((inactiveMinutes * 60) / bot.countdown_sec);
      let accumulated = 0;
      for (let t = 0; t < cycles; t++) {
        if (accumulated >= bot.time_max_score) break;
        if (Math.random() < bot.time_prob / 100) {
          const canGain = bot.time_max_score - accumulated;
          accumulated += Math.min(randInt(bot.time_min, bot.time_max), canGain);
        }
      }
      timeScores[i] = accumulated;
    });

    const userMerge  = mergeCount;
    const userQuest  = questPresets.reduce((s, p) => s + p.score * (questClears[p.id] ?? 0), 0);
    const userTotal  = userInitScore + userMerge + userQuest;
    const userGained = userMerge + userQuest;

    const entries: SimEntry[] = [
      { id: 0, name: "You", isUser: true,
        totalScore: userTotal, mergeScore: userMerge, questScore: userQuest, timeScore: 0,
        totalGained: userGained },
      ...selectedBots.map((bot, i) => {
        const gained = mergeScores[i] + questScores[i] + timeScores[i];
        return {
          id: bot.id, name: bot.bot_name, isUser: false,
          totalScore: gained,
          mergeScore: mergeScores[i], questScore: questScores[i], timeScore: timeScores[i],
          totalGained: gained,
        };
      }),
    ];
    entries.sort((a, b) => b.totalScore - a.totalScore);
    setPrevResults(results);
    setResults(entries);
  }

  // ── 퀘스트 프리셋 관리 ────────────────────
  function saveQuestPresets(next: QuestPreset[]) {
    setQuestPresets(next);
    localStorage.setItem(QUEST_PRESET_STORAGE_KEY, JSON.stringify(next));
  }
  function addQuestPreset() {
    const name = newQuestName.trim() || `${newQuestScore}점 퀘스트`;
    const next = [...questPresets, { id: Date.now(), name, score: newQuestScore }];
    saveQuestPresets(next);
    setNewQuestName("");
    setNewQuestScore(50);
  }
  function removeQuestPreset(id: number) {
    saveQuestPresets(questPresets.filter(q => q.id !== id));
    setQuestClears(prev => { const n = { ...prev }; delete n[id]; return n; });
  }
  function setQuestClearCount(id: number, delta: number) {
    setQuestClears(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }
  function resetQuestClears() {
    setQuestClears({});
  }

  function updateBotField(botId: number, field: keyof BotConfig, value: number | string) {
    setSelectedBots(prev => prev.map(b => b.id === botId ? { ...b, [field]: value } : b));
    setSaveMsg(null);
  }

  // ── 수정된 값 Supabase에 저장 ─────────────
  async function handleSaveBotTypes() {
    setSavingBots(true);
    setSaveMsg(null);
    try {
      const supabase = createClient();

      // 타입별로 그룹화 (첫 번째 봇 값 사용)
      const typeMap = new Map<number, BotConfig>();
      selectedBots.forEach(bot => {
        if (!typeMap.has(bot.type_id)) typeMap.set(bot.type_id, bot);
      });

      // 같은 타입 내 값이 다른 봇이 있는지 체크
      let hasDivergence = false;
      selectedBots.forEach(bot => {
        const rep = typeMap.get(bot.type_id)!;
        if (
          bot.merge_min !== rep.merge_min || bot.merge_max !== rep.merge_max || bot.merge_prob !== rep.merge_prob ||
          bot.quest_min !== rep.quest_min || bot.quest_max !== rep.quest_max || bot.quest_prob !== rep.quest_prob ||
          bot.time_min  !== rep.time_min  || bot.time_max  !== rep.time_max  || bot.time_prob  !== rep.time_prob  ||
          bot.time_max_score !== rep.time_max_score || bot.countdown_sec !== rep.countdown_sec
        ) hasDivergence = true;
      });

      await Promise.all(
        Array.from(typeMap.entries()).map(([typeId, bot]) =>
          supabase.from("leaderboard_bot_types").update({
            merge_min: bot.merge_min, merge_max: bot.merge_max, merge_prob: bot.merge_prob,
            quest_min: bot.quest_min, quest_max: bot.quest_max, quest_prob: bot.quest_prob,
            time_min:  bot.time_min,  time_max:  bot.time_max,  time_prob:  bot.time_prob,
            time_max_score: bot.time_max_score, countdown_sec: bot.countdown_sec,
          }).eq("id", typeId)
        )
      );

      setSaveMsg({
        ok: true,
        text: `${typeMap.size}개 타입 저장 완료${hasDivergence ? " (같은 타입 내 값이 달라 첫 번째 봇 기준으로 저장됨)" : ""}`,
      });
    } catch (e) {
      console.error(e);
      setSaveMsg({ ok: false, text: "저장 실패 — Supabase 연결을 확인하세요" });
    } finally {
      setSavingBots(false);
    }
  }

  // ── 파생값 ────────────────────────────────
  const compositionTotal = Object.values(typeComposition).reduce((s, v) => s + v, 0);
  const totalMinutes     = activeMinutes + inactiveMinutes;
  const sessionProgress  = Math.min(totalMinutes / SESSION_MAX_MIN, 1);
  const sessionOver      = totalMinutes >= SESSION_MAX_MIN;
  const sessionWarning   = !sessionOver && totalMinutes >= SESSION_MAX_MIN * (20 / 24);

  const userRank   = results ? results.findIndex(r => r.isUser) + 1 : null;
  const questTotal = questPresets.reduce((s, p) => s + p.score * (questClears[p.id] ?? 0), 0);
  const questClearTotal = Object.values(questClears).reduce((s, v) => s + v, 0);

  const sessionBarColor = sessionOver
    ? "bg-red-500"
    : sessionWarning
      ? "bg-yellow-400"
      : "bg-emerald-500";

  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏆 리더보드 AI봇 시뮬레이터</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              유저 액션에 따른 29명 봇의 스코어 변화 시뮬레이션 · 풀 {allBots.length}명
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              supabaseLoaded
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}>
              {supabaseLoaded ? "✓ Supabase 연동됨" : "⚠ 목 데이터"}
            </span>
            <button
              onClick={loadFromSupabase}
              disabled={loadingSupabase}
              className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
            >
              {loadingSupabase ? "로딩 중…" : "Supabase에서 불러오기"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-6 space-y-6">

        {/* ── 봇 그룹 구성 ─────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base">봇 그룹 구성</h2>
              <p className="text-xs text-gray-400 mt-0.5">타입별 인원수를 입력하고 29명을 뽑으세요</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                compositionTotal === 29
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {compositionTotal} / 29명
              </span>
              <button
                onClick={handlePickBots}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                🎲 29명 뽑기
              </button>
            </div>
          </div>

          {/* 타입별 입력 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {botTypes.map(type => {
              const poolCount = allBots.filter(b => b.type_id === type.id).length;
              return (
                <div key={type.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[type.id] ?? "bg-gray-100 text-gray-600"}`}>
                      {type.type_name}
                    </span>
                    <span className="text-xs text-gray-400">/{poolCount}</span>
                  </div>
                  <input
                    type="number" min={0} max={poolCount}
                    value={typeComposition[type.id] ?? 0}
                    onChange={e => {
                      setTypeComposition(prev => ({ ...prev, [type.id]: Number(e.target.value) }));
                      setCompositionError(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              );
            })}
          </div>

          {compositionError && (
            <p className="mt-3 text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5">
              <span>⚠</span> {compositionError}
            </p>
          )}

          {/* 현재 선택 분포 */}
          {selectedBots.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">현재 선택:</span>
              {botTypes.map(type => {
                const cnt = selectedBots.filter(b => b.type_id === type.id).length;
                if (cnt === 0) return null;
                return (
                  <span key={type.id} className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[type.id] ?? "bg-gray-100 text-gray-600"}`}>
                    {type.type_name} {cnt}명
                  </span>
                );
              })}
            </div>
          )}

          {/* ── 프리셋 ── */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">유저 그룹 프리셋</p>

            {/* 저장된 프리셋 목록 */}
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {presets.map(preset => (
                  <div key={preset.name} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="text-xs text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-1 text-xs leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 현재 구성 저장 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="프리셋 이름 (예: 초보 유저)"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSavePreset()}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>

        {/* ── 메인 2컬럼 ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Inputs */}
          <div className="space-y-4">

            {/* 유저 초기 점수 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">유저 초기 점수</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 shrink-0">시작 점수</label>
                <input
                  type="number" min={0}
                  value={userInitScore}
                  onChange={e => setUserInitScore(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 유저 액션 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
              <h2 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">유저 액션</h2>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 shrink-0">Merge 횟수</label>
                <input
                  type="number" min={0}
                  value={mergeCount}
                  onChange={e => setMergeCount(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-orange-500 dark:text-orange-400 w-20 text-right shrink-0">→ +{mergeCount}점</span>
              </div>

              {/* 퀘스트 프리셋 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">퀘스트 클리어</span>
                  <button
                    onClick={resetQuestClears}
                    className="text-xs px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    초기화
                  </button>
                </div>

                {/* 프리셋 목록 */}
                <div className="space-y-2 mb-3">
                  {questPresets.map(preset => {
                    const count = questClears[preset.id] ?? 0;
                    return (
                      <div key={preset.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-0 truncate">
                          {preset.name} <span className="text-gray-400">({preset.score}점)</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setQuestClearCount(preset.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-bold transition-colors"
                          >-</button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">{count}</span>
                          <button
                            onClick={() => setQuestClearCount(preset.id, +1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-bold transition-colors"
                          >+</button>
                        </div>
                        <span className="text-xs text-orange-500 dark:text-orange-400 w-16 text-right shrink-0">
                          +{(preset.score * count).toLocaleString()}점
                        </span>
                        <button
                          onClick={() => removeQuestPreset(preset.id)}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 text-xs px-1 transition-colors"
                        >✕</button>
                      </div>
                    );
                  })}
                  {questClearTotal > 0 && (
                    <p className="text-xs text-green-500 dark:text-green-400 pt-1">
                      퀘스트 합계: +{questTotal.toLocaleString()}점 ({questClearTotal}회 클리어)
                    </p>
                  )}
                </div>

                {/* 새 프리셋 추가 */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <input
                    type="text"
                    placeholder="이름 (선택)"
                    value={newQuestName}
                    onChange={e => setNewQuestName(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number" min={1}
                    value={newQuestScore}
                    onChange={e => setNewQuestScore(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400 shrink-0">점</span>
                  <button
                    onClick={addQuestPreset}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
                  >+ 추가</button>
                </div>
              </div>
            </div>

            {/* 세션 시간 */}
            <div className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 space-y-4 ${
              sessionOver ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-gray-800"
            }`}>
              <h2 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">세션 시간</h2>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-24 shrink-0">활동 시간</label>
                <input
                  type="number" min={0}
                  value={activeMinutes}
                  onChange={e => setActiveMinutes(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400 shrink-0">분</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-24 shrink-0">비활동 시간</label>
                <input
                  type="number" min={0}
                  value={inactiveMinutes}
                  onChange={e => setInactiveMinutes(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400 shrink-0">분</span>
              </div>

              {/* 세션 진행도 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">총 세션 시간</span>
                  <span className={`font-bold ${sessionOver ? "text-red-500" : sessionWarning ? "text-yellow-500" : "text-gray-700 dark:text-gray-300"}`}>
                    {formatMinutes(totalMinutes)} / 24시간
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${sessionBarColor}`}
                    style={{ width: `${sessionProgress * 100}%` }}
                  />
                </div>
                {sessionOver && (
                  <p className="text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
                    <span>🚫</span> 24시간 초과 — 리더보드 세션이 종료됩니다
                  </p>
                )}
                {sessionWarning && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <span>⚠</span> 세션 종료까지 {formatMinutes(SESSION_MAX_MIN - totalMinutes)} 남았습니다
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-400">비활동 시간만 봇 스코어에 영향을 줍니다.</p>
            </div>

            {/* 유저 예상 점수 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">유저 예상 총 점수</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(userInitScore + mergeCount + questTotal).toLocaleString()}
              </p>
              <p className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-1">
                시작 {userInitScore} + Merge {mergeCount} + 퀘스트 {questTotal}
              </p>
            </div>

            <button
              onClick={runSimulation}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-95"
            >
              🚀 시뮬레이션 실행
            </button>
          </div>

          {/* Right: Results */}
          <div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-base">리더보드</h2>
                {userRank !== null && (
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    내 순위: {userRank}위 / 30
                  </span>
                )}
              </div>

              {results ? (
                <div className="overflow-y-auto" style={{ maxHeight: 580 }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm">
                      <tr className="text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-3 text-center w-10">순위</th>
                        <th className="px-2 py-3 text-center w-10">변동</th>
                        <th className="px-4 py-3 text-left">이름</th>
                        <th className="px-4 py-3 text-right">스코어</th>
                        <th className="px-4 py-3 text-right">획득</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((entry, idx) => {
                        const rank = idx + 1;
                        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                        // 순위 변동 계산
                        const prevRank = prevResults
                          ? prevResults.findIndex(r => r.id === entry.id) + 1
                          : null;
                        const rankDelta = prevRank ? prevRank - rank : null;

                        return (
                          <tr
                            key={entry.id}
                            className={`border-t border-gray-50 dark:border-gray-800/50 transition-colors ${
                              entry.isUser ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                            }`}
                          >
                            {/* 순위 */}
                            <td className="px-4 py-2.5 text-center">
                              {medal
                                ? <span className="text-base">{medal}</span>
                                : <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{rank}</span>
                              }
                            </td>

                            {/* 순위 변동 */}
                            <td className="px-2 py-2.5 text-center">
                              {rankDelta === null ? (
                                <span className="text-xs text-gray-300 dark:text-gray-600">NEW</span>
                              ) : rankDelta > 0 ? (
                                <span className="text-xs font-bold text-emerald-500">▲{rankDelta}</span>
                              ) : rankDelta < 0 ? (
                                <span className="text-xs font-bold text-red-400">▼{Math.abs(rankDelta)}</span>
                              ) : (
                                <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>

                            {/* 이름 */}
                            <td className="px-4 py-2.5">
                              <span className={`font-medium ${entry.isUser ? "text-blue-600 dark:text-blue-400" : ""}`}>
                                {entry.name}
                              </span>
                            </td>

                            {/* 스코어 */}
                            <td className="px-4 py-2.5 text-right font-mono font-bold">
                              {entry.totalScore.toLocaleString()}
                            </td>

                            {/* 획득 점수 */}
                            <td className="px-4 py-2.5 text-right">
                              {entry.totalGained > 0
                                ? <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400">+{entry.totalGained}</span>
                                : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <span className="text-5xl mb-4">🏆</span>
                  <p className="text-sm">시뮬레이션 결과가 여기에 표시됩니다</p>
                  <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">좌측에서 값을 입력하고 실행 버튼을 누르세요</p>
                </div>
              )}

              {/* 리셋 버튼 */}
              {results && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { setResults(null); setPrevResults(null); }}
                    className="w-full py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    🔄 리더보드 초기화
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 선택된 봇 설정 테이블 ─────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <button
              onClick={() => setShowBotTable(v => !v)}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <h2 className="font-semibold text-base flex items-center gap-2">
                🤖 선택된 봇 설정
                <span className="text-xs text-gray-400 font-normal">({selectedBots.length}명 · 값 직접 수정 후 재실행 가능)</span>
              </h2>
              <span className="text-gray-400 text-sm">{showBotTable ? "▲" : "▼"}</span>
            </button>

            <div className="flex items-center gap-3">
              {saveMsg && (
                <span className={`text-xs ${saveMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {saveMsg.ok ? "✓" : "✕"} {saveMsg.text}
                </span>
              )}
              <button
                onClick={handleSaveBotTypes}
                disabled={savingBots || !supabaseLoaded}
                title={!supabaseLoaded ? "Supabase 연동 후 사용 가능" : ""}
                className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {savingBots ? "저장 중…" : "Supabase에 저장"}
              </button>
            </div>
          </div>

          {showBotTable && (
            <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
              <table className="w-full text-xs min-w-[1000px]">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-3 text-left w-6">#</th>
                    <th className="px-3 py-3 text-left">이름</th>
                    <th className="px-3 py-3 text-left">타입</th>
                    <th className="px-3 py-3 text-center text-orange-500" colSpan={3}>Merge (min / max / 확률)</th>
                    <th className="px-3 py-3 text-center text-green-500" colSpan={3}>퀘스트 (min / max / 확률)</th>
                    <th className="px-3 py-3 text-center text-purple-500" colSpan={5}>시간 (min / max / 확률 / 한도 / countdown)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBots.map(bot => (
                    <tr key={bot.id} className="border-t border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-400">{bot.id}</td>
                      <td className="px-3 py-2 font-medium">{bot.bot_name}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[bot.type_id] ?? "bg-gray-100 text-gray-600"}`}>
                          {botTypes.find(t => t.id === bot.type_id)?.type_name ?? `타입 ${bot.type_id}`}
                        </span>
                      </td>
                      {(["merge_min","merge_max","merge_prob","quest_min","quest_max","quest_prob","time_min","time_max","time_prob","time_max_score","countdown_sec"] as const).map(field => (
                        <td key={field} className="px-2 py-2">
                          <input
                            type="number"
                            step={1}
                            min={0}
                            max={field.endsWith("_prob") ? 100 : undefined}
                            value={bot[field] as number}
                            onChange={e => updateBotField(bot.id, field, Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
