"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap, X } from "lucide-react";

// --- Types ---
type Card = {
  id: number;
  name: string;
  image: string;
  rank: number;
  isGold: boolean;
};

type PackDef = {
  id: number;
  name: string;
  image: string;
  cardCount: number;
  guaranteedRank: number;
  guaranteedCount: number;
  probs: {
    r1: number; r2: number; r3: number; r4: number; r5: number;
    g4: number; g5: number;
  }
};

type SimulationResult = {
  packId: number;
  packName: string;
  cards: Card[];
  newPoints: number;
};

type UserSession = { id: string; email?: string; } | null;

export default function CardSimulatorPage() {
  // --- State ---
  const [user, setUser] = useState<UserSession>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);

  const [cardsData, setCardsData] = useState<Card[]>([]);
  const [packsData, setPacksData] = useState<PackDef[]>([]);
  const [setNames, setSetNames] = useState<string[]>(Array(12).fill(""));
  const [dataVersion, setDataVersion] = useState<string>("");

  const [activeTab, setActiveTab] = useState<'album' | 'simulator'>('album');
  const [simTab, setSimTab] = useState<'single' | 'bulk'>('single');
  
  const [collection, setCollection] = useState<Record<number, number>>({});
  const [starPoints, setStarPoints] = useState<number>(0);
  
  const [lastResult, setLastResult] = useState<SimulationResult[]>([]);
  const [bulkInputs, setBulkInputs] = useState<Record<number, number>>({});

  // Animation State
  const [animationStep, setAnimationStep] = useState<'idle' | 'shaking' | 'flash' | 'reveal'>('idle');
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);
  const [currentPackImage, setCurrentPackImage] = useState<string>("");

  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const packFileInputRef = useRef<HTMLInputElement>(null);
  const encodingRef = useRef<"utf-8" | "euc-kr">("utf-8");

  // --- Initial Load ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        await loadUserData(session.user.id);
      } else {
        await loadLocalOrFetchDefault();
      }
    };
    init();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email });
      else setUser(null);
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  // --- Data Loading Helpers ---
  const fetchDefaultSetNamesOnly = async () => {
    try {
      const { data } = await supabase.from('default_set_names').select('*').order('id', { ascending: true });
      if (data) {
        const names = Array(12).fill("");
        data.forEach((row: any) => { if (typeof row.id === 'number' && row.id >= 0 && row.id < 12) names[row.id] = row.name; });
        return names;
      }
    } catch (e) { console.error(e); }
    return Array(12).fill("");
  };

  const fetchLatestVersion = async () => {
    try {
      const { data } = await supabase.from('data_versions').select('version').order('id', { ascending: false }).limit(1).single();
      if (data) { setDataVersion(data.version); localStorage.setItem("card_data_version", data.version); }
    } catch (e) { console.error(e); }
  };

  const fetchSystemDefaults = async () => {
    setIsLoading(true);
    try {
      const [cardsRes, packsRes, setsRes, versionRes] = await Promise.all([
        supabase.from('default_cards').select('*').order('id', { ascending: true }),
        supabase.from('default_packs').select('*').order('id', { ascending: true }),
        supabase.from('default_set_names').select('*').order('id', { ascending: true }),
        supabase.from('data_versions').select('version').order('id', { ascending: false }).limit(1).single()
      ]);

      if (cardsRes.error || packsRes.error) throw new Error("Load failed");

      const defaultCards = cardsRes.data.map((c: any) => ({
        id: c.id, name: c.name, image: c.image || "", rank: c.rank, isGold: c.is_gold
      }));
      const defaultPacks = packsRes.data.map((p: any) => ({
        id: p.id, name: p.name, image: p.image || "",
        cardCount: p.card_count, guaranteedRank: p.guaranteed_rank, guaranteedCount: p.guaranteed_count,
        probs: { r1: p.prob_r1, r2: p.prob_r2, r3: p.prob_r3, r4: p.prob_r4, r5: p.prob_r5, g4: p.prob_g4, g5: p.prob_g5 }
      }));
      const defaultSetNames = Array(12).fill("");
      if (setsRes.data) setsRes.data.forEach((row: any) => { if (row.id >= 0 && row.id < 12) defaultSetNames[row.id] = row.name; });
      const version = versionRes.data?.version || "1.0.0";

      return { defaultCards, defaultPacks, defaultSetNames, version };
    } catch (err) { return { defaultCards: [], defaultPacks: [], defaultSetNames: Array(12).fill(""), version: "" }; }
    finally { setIsLoading(false); }
  };

  const loadLocalOrFetchDefault = async () => {
    const localCards = localStorage.getItem("card_data_source");
    const localPacks = localStorage.getItem("pack_data_source");
    if (localCards && localPacks) {
      setCardsData(JSON.parse(localCards)); setPacksData(JSON.parse(localPacks));
      const savedSetNames = localStorage.getItem("card_set_names");
      if (savedSetNames) {
        const parsed = JSON.parse(savedSetNames);
        if (parsed.every((n: string) => n === "")) {
           const defNames = await fetchDefaultSetNamesOnly(); setSetNames(defNames);
        } else setSetNames(parsed);
      } else {
        const defNames = await fetchDefaultSetNamesOnly(); setSetNames(defNames);
      }
      loadLocalState(false);
      const savedVersion = localStorage.getItem("card_data_version");
      if (!savedVersion) await fetchLatestVersion(); else setDataVersion(savedVersion);
    } else {
      const { defaultCards, defaultPacks, defaultSetNames, version } = await fetchSystemDefaults();
      if (defaultCards.length > 0) {
        setCardsData(defaultCards); setPacksData(defaultPacks); setSetNames(defaultSetNames); setDataVersion(version);
        saveToLocal(defaultCards, defaultPacks, {}, defaultSetNames, 0); localStorage.setItem("card_data_version", version);
      }
    }
  };

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    const { data } = await supabase.from('user_game_data').select('*').eq('user_id', userId).single();
    setIsLoading(false);
    if (data) {
      setCardsData(data.cards_data); setPacksData(data.packs_data); setCollection(data.collection || {}); setStarPoints(Number(data.star_points || 0));
      let userSetNames = data.set_names || Array(12).fill("");
      if (userSetNames.every((n: any) => !n || n === "")) {
        const defaultNames = await fetchDefaultSetNamesOnly(); if (defaultNames.some(n => n !== "")) userSetNames = defaultNames;
      }
      setSetNames(userSetNames);
      const localVersion = localStorage.getItem("card_data_version");
      if (localVersion) setDataVersion(localVersion); else await fetchLatestVersion();
      saveToLocal(data.cards_data, data.packs_data, data.collection, userSetNames, data.star_points);
    } else await loadLocalOrFetchDefault();
  };

  const loadLocalState = (includeNames = true) => {
    if (includeNames) { const saved = localStorage.getItem("card_set_names"); if (saved) setSetNames(JSON.parse(saved)); }
    const col = localStorage.getItem("card_collection"); if (col) setCollection(JSON.parse(col));
    const pts = localStorage.getItem("card_star_points"); if (pts) setStarPoints(Number(pts));
    const ver = localStorage.getItem("card_data_version"); if (ver) setDataVersion(ver);
  };

  const saveToLocal = (cards: any, packs: any, col: any, names: any, points: any) => {
    localStorage.setItem("card_data_source", JSON.stringify(cards)); localStorage.setItem("pack_data_source", JSON.stringify(packs));
    localStorage.setItem("card_collection", JSON.stringify(col)); localStorage.setItem("card_set_names", JSON.stringify(names));
    localStorage.setItem("card_star_points", String(points));
  };

  const resetAllData = async () => {
    if (confirm("초기화하시겠습니까?")) {
      const { defaultCards, defaultPacks, defaultSetNames, version } = await fetchSystemDefaults();
      if (defaultCards.length === 0) return;
      setCardsData(defaultCards); setPacksData(defaultPacks); setSetNames(defaultSetNames); setDataVersion(version);
      setCollection({}); setStarPoints(0); setLastResult([]);
      saveToLocal(defaultCards, defaultPacks, {}, defaultSetNames, 0); localStorage.setItem("card_data_version", version);
      if (user) {
        await supabase.from('user_game_data').upsert({
          user_id: user.id, cards_data: defaultCards, packs_data: defaultPacks, collection: {}, set_names: defaultSetNames, star_points: 0, updated_at: new Date().toISOString()
        });
      }
      alert(`초기화 완료 (v${version})`);
    }
  };

  // --- Auth & Import Helpers ---
  const saveDataToSupabase = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    setIsLoading(true);
    try {
      const { error } = await supabase.from('user_game_data').upsert({
        user_id: user.id, cards_data: cardsData, packs_data: packsData, collection: collection,
        set_names: setNames, star_points: starPoints, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      alert("☁️ 클라우드에 안전하게 저장되었습니다!");
    } catch (err: any) { alert(`저장 실패: ${err.message}`); } finally { setIsLoading(false); }
  };

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        alert("가입 완료! 자동 로그인됩니다.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setIsAuthModalOpen(false);
      }
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); window.location.reload(); };
  const handleSetRename = (i: number, v: string) => { const n = [...setNames]; n[i] = v; setSetNames(n); localStorage.setItem("card_set_names", JSON.stringify(n)); };

  const triggerImport = (type: "card" | "pack", encoding: "utf-8" | "euc-kr") => { encodingRef.current = encoding; (type==='card'?cardFileInputRef:packFileInputRef).current?.click(); };
  
  const readCSVFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => { const buffer = e.target?.result as ArrayBuffer; const decoder = new TextDecoder(encodingRef.current); resolve(decoder.decode(buffer)); };
      reader.onerror = reject; reader.readAsArrayBuffer(file);
    });
  };

  const handleCardCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await readCSVFile(file); const lines = text.split("\n").map(l => l.trim()).filter(l => l);
      const newCards = [...cardsData]; const startIndex = (lines[0].toUpperCase().startsWith("INDEX") || lines[0].startsWith("ID")) ? 1 : 0;
      let cnt = 0;
      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(","); const id = Number(cols[0]); if (isNaN(id)) continue;
        const existIdx = newCards.findIndex(c => c.id === id);
        const newCard = { id, name: cols[1]||"", image: cols[2]||"", rank: Number(cols[3])||1, isGold: (cols[4]==="1"||cols[4]==="TRUE") };
        if (existIdx >= 0) newCards[existIdx] = newCard; else newCards.push(newCard);
        cnt++;
      }
      newCards.sort((a, b) => a.id - b.id); setCardsData(newCards); localStorage.setItem("card_data_source", JSON.stringify(newCards));
      alert(`✅ ${cnt}개 업데이트`);
    } catch { alert("실패"); } e.target.value = "";
  };

  const handlePackCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await readCSVFile(file); const lines = text.split("\n").map(l => l.trim()).filter(l => l);
      const newPacks = []; const startIndex = (lines[0].toUpperCase().startsWith("INDEX") || lines[0].startsWith("ID")) ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(","); const id = Number(cols[0]); if (isNaN(id)) continue;
        newPacks.push({
          id, name: cols[1]||"", image: cols[2]||"", cardCount: Number(cols[3])||5, guaranteedRank: Number(cols[4])||1, guaranteedCount: Number(cols[5])||0,
          probs: { r1: Number(cols[6])||0, r2: Number(cols[7])||0, r3: Number(cols[8])||0, r4: Number(cols[9])||0, r5: Number(cols[10])||0, g4: Number(cols[11])||0, g5: Number(cols[12])||0 }
        });
      }
      newPacks.sort((a, b) => a.id - b.id); setPacksData(newPacks); localStorage.setItem("pack_data_source", JSON.stringify(newPacks));
      alert(`✅ ${newPacks.length}개 업데이트`);
    } catch { alert("실패"); } e.target.value = "";
  };

  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.setAttribute("download", fileName); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  const exportCardDataCSV = () => { const h = ["id,name,image,rank,is_gold"]; const r = cardsData.map(c => `${c.id},${c.name},${c.image},${c.rank},${c.isGold?1:0}`); downloadCSV([h, ...r].join("\n"), "card_list.csv"); };
  const exportPackDataCSV = () => { const h = ["id,name,image,card_count,guaranteed_rank,guaranteed_count,prob_r1,prob_r2,prob_r3,prob_r4,prob_r5,prob_g4,prob_g5"]; const r = packsData.map(p => `${p.id},${p.name},${p.image},${p.cardCount},${p.guaranteedRank},${p.guaranteedCount},${p.probs.r1},${p.probs.r2},${p.probs.r3},${p.probs.r4},${p.probs.r5},${p.probs.g4},${p.probs.g5}`); downloadCSV([h, ...r].join("\n"), "pack_list.csv"); };

  // --- Simulator Logic ---
  const drawOneCard = (pack: PackDef, minRank: number): Card => {
    const p = pack.probs;
    const candidates = [
      { prob: p.g5, rank: 5, gold: true }, { prob: p.g4, rank: 4, gold: true },
      { prob: p.r5, rank: 5, gold: false }, { prob: p.r4, rank: 4, gold: false },
      { prob: p.r3, rank: 3, gold: false }, { prob: p.r2, rank: 2, gold: false },
      { prob: p.r1, rank: 1, gold: false },
    ].filter(item => item.rank >= minRank);
    const totalProb = candidates.reduce((sum, item) => sum + item.prob, 0);
    let selected = { rank: minRank, gold: false };
    if (totalProb > 0) {
      let rand = Math.random() * totalProb;
      for (const item of candidates) {
        if (rand <= item.prob) { selected = { rank: item.rank, gold: item.gold }; break; }
        rand -= item.prob;
      }
    }
    let pool = cardsData.filter(c => c.rank === selected.rank && c.isGold === selected.gold);
    if (pool.length === 0) pool = cardsData.filter(c => c.rank === selected.rank);
    if (pool.length === 0) pool = cardsData;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const updateCollection = (newCards: Card[]) => {
    const nextCollection = { ...collection };
    let gainedPoints = 0;
    newCards.forEach(card => {
      if (nextCollection[card.id] && nextCollection[card.id] > 0) gainedPoints += 1;
      else nextCollection[card.id] = 1;
    });
    setCollection(nextCollection);
    localStorage.setItem("card_collection", JSON.stringify(nextCollection));
    if (gainedPoints > 0) {
      const newTotalPoints = starPoints + gainedPoints;
      setStarPoints(newTotalPoints);
      localStorage.setItem("card_star_points", newTotalPoints.toString());
    }
    return gainedPoints;
  };

  const openSinglePack = (packId: number) => {
    const pack = packsData.find(p => p.id === packId);
    if (!pack) return;
    const resultCards = [];
    const guaranteed = pack.guaranteedCount;
    const normal = Math.max(0, pack.cardCount - guaranteed);
    for (let i = 0; i < normal; i++) resultCards.push(drawOneCard(pack, 1));
    for (let i = 0; i < guaranteed; i++) resultCards.push(drawOneCard(pack, pack.guaranteedRank));
    const earnedPoints = updateCollection(resultCards);
    setLastResult([{ packId, packName: pack.name, cards: resultCards, newPoints: earnedPoints }]);
    setCurrentPackImage(pack.image || "pack_1.png");
    setRevealedCards(new Array(resultCards.length).fill(false));
    setAnimationStep('shaking');
    setTimeout(() => {
      setAnimationStep('flash');
      setTimeout(() => { setAnimationStep('reveal'); }, 200);
    }, 1500);
  };

  const openBulkPacks = () => {
    let totalCards: Card[] = [];
    let totalPacks = 0;
    packsData.forEach(pack => {
      const count = bulkInputs[pack.id] || 0;
      totalPacks += count;
      for (let i = 0; i < count; i++) {
        const guaranteed = pack.guaranteedCount;
        const normal = Math.max(0, pack.cardCount - guaranteed);
        for (let j = 0; j < normal; j++) totalCards.push(drawOneCard(pack, 1));
        for (let j = 0; j < guaranteed; j++) totalCards.push(drawOneCard(pack, pack.guaranteedRank));
      }
    });
    if (totalCards.length === 0) return alert("수량을 입력해주세요.");
    const earnedPoints = updateCollection(totalCards);
    setLastResult([{ packId: -1, packName: `총 ${totalPacks}팩 결과 (${totalCards.length}장)`, cards: totalCards, newPoints: earnedPoints }]);
  };

  // --- Handlers & Renders ---
  const handleCardClick = (index: number) => { const n = [...revealedCards]; n[index] = true; setRevealedCards(n); };
  const handleRevealAll = () => { setRevealedCards(new Array(revealedCards.length).fill(true)); };
  const closeAnimation = () => { setAnimationStep('idle'); };

  const renderSets = () => {
    return Array.from({ length: 12 }, (_, setIndex) => {
      const setCards = cardsData.slice(setIndex * 9, (setIndex + 1) * 9);
      const setCollected = setCards.filter(c => collection[c.id]).length;
      const isComplete = setCollected === 9 && setCards.length > 0;
      return (
        <div key={setIndex} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${isComplete ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <input type="text" value={setNames[setIndex] || ""} onChange={(e) => handleSetRename(setIndex, e.target.value)} placeholder={`${setIndex + 1}번 세트`} className="bg-transparent font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:border-b border-blue-500 w-2/3" />
            <span className={`text-xs font-bold ${isComplete ? 'text-blue-600' : 'text-gray-400'}`}>{setCollected}/9 {isComplete && "★"}</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {setCards.map((card) => {
              const has = collection[card.id] > 0;
              return (
                <div key={card.id} className="relative aspect-[2/3] group">
                  {has ? (
                    <div className={`absolute inset-0 bg-white dark:bg-gray-700 border-2 rounded flex flex-col items-center justify-between p-1 shadow-sm transition hover:scale-105 z-10 ${card.isGold ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                      <div className="w-full flex justify-between items-start">
                        <span className={`text-[8px] font-bold px-1 rounded ${card.rank >= 5 ? 'bg-purple-500 text-white' : card.rank >= 4 ? 'bg-red-500 text-white' : card.rank >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{'★'.repeat(card.rank)}</span>
                        <span className="text-[8px] text-gray-400">#{card.id}</span>
                      </div>
                      <div className="text-center w-full">
                        <p className={`text-[9px] font-bold truncate px-0.5 leading-tight ${card.isGold ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-800 dark:text-gray-200'}`}>{card.name}</p>
                        {card.isGold && <span className="text-[8px] text-yellow-500 font-bold block">GOLD</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded flex items-center justify-center"><span className="text-gray-300 text-xs font-bold">#{card.id}</span></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const renderProbTable = (packId: number) => {
    const pack = packsData.find(p => p.id === packId); if (!pack) return null; const p = pack.probs;
    return (
      <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-bold text-gray-500 mb-2">📊 {pack.name} 적용 확률</p>
        <div className="grid grid-cols-4 gap-y-1 gap-x-2 text-center">
          <div className="bg-white dark:bg-gray-800 p-1 rounded border">1★: {p.r1}%</div>
          <div className="bg-white dark:bg-gray-800 p-1 rounded border">2★: {p.r2}%</div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-1 rounded border border-blue-100">3★: {p.r3}%</div>
          <div className="bg-red-50 dark:bg-red-900/20 p-1 rounded border border-red-100">4★: {p.r4}%</div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-1 rounded border border-purple-100">5★: {p.r5}%</div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-1 rounded border border-yellow-100 font-bold text-yellow-700">G4: {p.g4}%</div>
          <div className="bg-yellow-100 dark:bg-yellow-900/40 p-1 rounded border border-yellow-200 font-black text-yellow-800 col-span-2">G5: {p.g5}%</div>
        </div>
      </div>
    );
  };

  const completionRate = cardsData.length > 0 
    ? ((Object.keys(collection).length / cardsData.length) * 100).toFixed(1) 
    : "0.0";

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 font-sans text-gray-800 dark:text-gray-100 pb-20 relative">
      <input type="file" accept=".csv" ref={cardFileInputRef} onChange={handleCardCSVImport} className="hidden" />
      <input type="file" accept=".csv" ref={packFileInputRef} onChange={handlePackCSVImport} className="hidden" />

      {/* Animation Overlay */}
      <AnimatePresence>
        {animationStep !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 overflow-hidden"
          >
            {animationStep === 'shaking' && (
              <motion.div
                initial={{ scale: 0.5, y: 100 }}
                animate={{ scale: 1, y: 0, rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ duration: 0.5, rotate: { repeat: Infinity, duration: 0.2 } }}
                className="relative"
              >
                <div className="w-48 h-64 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl border-4 border-white shadow-[0_0_50px_rgba(59,130,246,0.6)] flex items-center justify-center">
                   <Zap size={64} className="text-white animate-pulse" />
                </div>
                <p className="text-white text-center mt-8 font-bold animate-pulse">개봉 중...</p>
              </motion.div>
            )}
            {animationStep === 'flash' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-50" />}
            {animationStep === 'reveal' && lastResult.length > 0 && (
              <div className="w-full max-w-4xl flex flex-col items-center">
                <div className="flex gap-4 mb-8">
                  <button onClick={handleRevealAll} className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition">모두 뒤집기</button>
                  <button onClick={closeAnimation} className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition">닫기</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 perspective-1000">
                  {lastResult[0].cards.map((card, idx) => {
                    const isRevealed = revealedCards[idx];
                    const isHighRank = card.rank >= 4 || card.isGold;
                    
                    return (
                      <motion.div
                        key={idx}
                        // [FIX] 초기값 0도 (뒷면이 0도), 뒤집으면 180도 (앞면이 180도)
                        initial={{ rotateY: 0 }} 
                        animate={{ rotateY: isRevealed ? 180 : 0 }}
                        transition={{ delay: idx * 0.1, type: "spring", stiffness: 260, damping: 20 }}
                        onClick={() => handleCardClick(idx)}
                        className="relative w-32 h-48 cursor-pointer preserve-3d"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {/* [FIX] Front (Card Info): Rotated 180deg initially (Hidden behind back) */}
                        <div 
                          className={`absolute inset-0 backface-hidden rounded-lg shadow-xl overflow-hidden bg-white border-2 flex flex-col items-center justify-between p-2
                            ${card.isGold ? 'border-yellow-400 bg-yellow-50 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-gray-200'}
                            ${isHighRank && isRevealed ? 'animate-pulse-slow' : ''}`}
                          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                        >
                          <div className="w-full flex justify-between">
                            <span className={`text-xs font-bold px-1 rounded ${card.rank>=5?'bg-purple-500 text-white':card.rank>=4?'bg-red-500 text-white':card.rank>=3?'bg-blue-500 text-white':'bg-gray-200'}`}>{'★'.repeat(card.rank)}</span>
                          </div>
                          <div className="text-center">
                            <p className={`text-xs font-bold ${card.isGold ? 'text-yellow-700' : 'text-gray-800'}`}>{card.name}</p>
                            {card.isGold && <span className="text-[9px] font-bold text-yellow-500 block">GOLD</span>}
                          </div>
                          <div className="text-[10px] text-gray-400">#{card.id}</div>
                        </div>

                        {/* [FIX] Back (Card Pattern): Rotated 0deg initially (Visible) */}
                        <div 
                          className="absolute inset-0 backface-hidden rounded-lg bg-gradient-to-br from-blue-800 to-indigo-900 border-2 border-blue-400 shadow-md flex items-center justify-center"
                          style={{ transform: "rotateY(0deg)", backfaceVisibility: "hidden" }}
                        >
                          <Star className="text-blue-400/30" size={32} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{authMode === 'login' ? '🔑 로그인' : '📝 회원가입'}</h2>
            <input type="email" placeholder="이메일" className="w-full p-2 border rounded mb-2 dark:bg-gray-900" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            <input type="password" placeholder="비밀번호" className="w-full p-2 border rounded mb-4 dark:bg-gray-900" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
            <button onClick={handleAuth} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-2 rounded mb-2 hover:bg-blue-700 disabled:bg-gray-400">{isLoading ? '처리 중...' : (authMode === 'login' ? '로그인' : '가입하기')}</button>
            <div className="text-center text-xs text-gray-500">{authMode === 'login' ? <span className="cursor-pointer underline" onClick={() => setAuthMode('signup')}>계정이 없나요? 회원가입</span> : <span className="cursor-pointer underline" onClick={() => setAuthMode('login')}>이미 계정이 있나요? 로그인</span>}</div>
            <button onClick={() => setIsAuthModalOpen(false)} className="w-full mt-4 text-gray-400 text-xs">닫기</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div><h1 className="text-2xl font-black text-blue-900 dark:text-blue-100">🃏 카드 팩 시뮬레이터</h1><p className="text-sm text-gray-500">데이터를 CSV로 관리하고 확률을 테스트하세요.</p></div>
        <div className="flex flex-col items-end gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-bold">{user.email}님</span>
              <button onClick={saveDataToSupabase} disabled={isLoading} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-bold shadow disabled:bg-gray-400">{isLoading ? '저장 중...' : '☁️ 서버 저장'}</button>
              <button onClick={() => loadUserData(user.id)} disabled={isLoading} className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700 font-bold shadow disabled:bg-gray-400">{isLoading ? '로딩 중...' : '💾 불러오기'}</button>
              <button onClick={handleLogout} className="text-xs text-red-500 underline ml-2">로그아웃</button>
            </div>
          ) : (<button onClick={() => setIsAuthModalOpen(true)} className="text-xs bg-blue-500 text-white px-4 py-2 rounded font-bold shadow animate-bounce">🔑 로그인하여 데이터 저장</button>)}
          
          {dataVersion && <div className="text-[10px] text-gray-400 font-bold font-mono tracking-tight text-right w-full">Current Data: v{dataVersion}</div>}

          {/* [RESTORED] Full Import/Export Controls */}
          <div className="flex flex-wrap gap-2 justify-center bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex gap-1 items-center">
               <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">카드</span>
               <button onClick={() => triggerImport("card", "utf-8")} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-bold">Import (UTF-8)</button>
               <button onClick={() => triggerImport("card", "euc-kr")} className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded font-bold">Import (엑셀)</button>
               <button onClick={exportCardDataCSV} className="text-[10px] bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded font-bold">Export</button>
            </div>
            <div className="w-px bg-gray-300 h-6"></div>
            <div className="flex gap-1 items-center">
               <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">팩</span>
               <button onClick={() => triggerImport("pack", "utf-8")} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-bold">Import (UTF-8)</button>
               <button onClick={() => triggerImport("pack", "euc-kr")} className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded font-bold">Import (엑셀)</button>
               <button onClick={exportPackDataCSV} className="text-[10px] bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded font-bold">Export</button>
            </div>
            <button onClick={resetAllData} className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">RESET</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mb-6 border-b border-gray-200 dark:border-gray-700 flex gap-6">
        <button onClick={() => setActiveTab('album')} className={`pb-3 text-sm font-bold border-b-2 ${activeTab==='album'?'border-blue-600 text-blue-600':'border-transparent text-gray-400'}`}>📂 앨범 ({completionRate}%)</button>
        <button onClick={() => setActiveTab('simulator')} className={`pb-3 text-sm font-bold border-b-2 ${activeTab==='simulator'?'border-blue-600 text-blue-600':'border-transparent text-gray-400'}`}>🎰 시뮬레이터</button>
        <div className="ml-auto pb-2 flex items-center gap-2"><div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">⭐ Star Points: {starPoints.toLocaleString()}</div></div>
      </div>

      {activeTab === 'album' && <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{renderSets()}</div>}

      {activeTab === 'simulator' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-1 rounded-lg inline-flex border border-gray-200 dark:border-gray-700"><button onClick={() => setSimTab('single')} className={`px-4 py-1.5 text-xs font-bold rounded ${simTab === 'single' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>단일 개봉</button><button onClick={() => setSimTab('bulk')} className={`px-4 py-1.5 text-xs font-bold rounded ${simTab === 'bulk' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>대량 개봉</button></div>
            {simTab === 'single' && <div className="grid grid-cols-2 gap-3">{packsData.map((pack) => (<button key={pack.id} onClick={() => openSinglePack(pack.id)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-md transition text-left relative overflow-hidden group"><div className="relative z-10"><div className="text-xs font-bold text-gray-400 mb-1">Vol.{pack.id}</div><div className="font-bold text-gray-800 dark:text-gray-200 mb-2">{pack.name}</div><div className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded inline-block">{pack.cardCount}장 | {pack.guaranteedRank}성↑ {pack.guaranteedCount}장 보장</div></div></button>))}</div>}
            {simTab === 'bulk' && <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700"><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">{packsData.map((pack) => (<div key={pack.id} className="flex flex-col gap-1"><span className="text-xs font-bold text-gray-500 truncate">{pack.name}</span><input type="number" min={0} className="w-full p-2 text-center border rounded font-bold dark:bg-gray-900" placeholder="0" value={bulkInputs[pack.id] || ''} onChange={(e) => setBulkInputs({...bulkInputs, [pack.id]: Number(e.target.value)})} /></div>))}</div><button onClick={openBulkPacks} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition">결과 확인</button></div>}
          </div>
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700 sticky top-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h2 className="font-bold text-lg mb-4 border-b pb-2">🎉 획득 결과</h2>
            {lastResult.length === 0 ? <div className="text-center text-gray-400 py-10 text-sm">팩을 선택해주세요.</div> : (
              <div className="space-y-6">
                {lastResult.map((res, idx) => (
                  <div key={idx} className="animate-fade-in">
                    <div className="flex justify-between items-center mb-2"><p className="text-sm font-bold text-blue-600">{res.packName}</p>{res.newPoints > 0 && (<span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">+{res.newPoints} Pts</span>)}</div>
                    <div className="space-y-2">{res.cards.map((card, cIdx) => (<div key={cIdx} className={`flex items-center gap-2 p-2 rounded border ${card.isGold ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'} dark:border-gray-700 dark:bg-gray-900`}><div className={`w-6 h-6 flex items-center justify-center text-[8px] font-bold rounded ${card.rank >= 5 ? 'bg-purple-500 text-white' : card.rank >= 4 ? 'bg-red-500 text-white' : card.rank >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{'★'.repeat(card.rank)}</div><div className="flex-1 min-w-0"><p className={`text-xs font-bold truncate ${card.isGold ? 'text-yellow-700' : ''}`}>{card.name}</p></div>{card.isGold && <span className="text-[8px] font-bold text-yellow-500">G</span>}</div>))}</div>
                    {res.packId !== -1 && renderProbTable(res.packId)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}