"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Wine,           // 세란의 술/유흥 상징
  Flame,          // 도깨비불/전란 상징
  ScrollText,     // 계약/정보 상징
  MoreVertical, 
  Send, 
  Activity,       // 생체 신호 (Valence)
  Heart,          // 친밀도
  Network,        // 관계도
  Copy,
  Gem             // 돈/가치 상징
} from "lucide-react";

// --- 1. 타입 정의 (업그레이드: 입체적 기억 설계 반영) ---

// [Group A] 감정 및 태도
type SentimentContext = {
  valence: number;        // -1.0 (부정) ~ +1.0 (긍정)
  arousal: number;        // 0.0 (차분) ~ 1.0 (흥분)
  primary_emotion: string; 
};

// [Group B] 사실 및 관계 (지식 그래프)
type EntityNode = {
  name: string;
  category: 'person' | 'pet' | 'location' | 'object' | 'concept';
  relation_to_user: string; // 예: "enemy", "lover", "boss"
};

// [Group C] 대화 맥락
type InteractionContext = {
  intimacy_level: 1 | 2 | 3 | 4 | 5; // 1:초면 ~ 5:영혼의 파트너
  intent: 'seeking_comfort' | 'venting' | 'sharing_info' | 'asking_advice' | 'small_talk';
};

// [통합] 최종 분석 데이터 구조
type AnalysisData = {
  // 핵심 지표
  importance_score: number;     // 1~10
  
  // 감정/맥락
  sentiment: SentimentContext;
  context: InteractionContext;
  
  // 추출된 정보
  entity_graph: EntityNode[];
  user_preferences: { target: string; sentiment: 'like' | 'dislike' | 'hate' | 'love' }[];
  
  // 요약 및 관리
  one_line_summary: string;
  retention_policy: 'temporary' | 'long_term' | 'permanent_core';
};

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

// --- 2. Mock 데이터 (세란의 페르소나 + 정교한 분석 데이터) ---
const MOCK_DB: Record<string, AnalysisData> = {
  "default": {
    "importance_score": 2,
    "sentiment": { "valence": 0.1, "arousal": 0.2, "primary_emotion": "boredom" },
    "context": { "intimacy_level": 1, "intent": "small_talk" },
    "entity_graph": [],
    "user_preferences": [],
    "one_line_summary": "영양가 없는 잡담 중.",
    "retention_policy": "temporary"
  },
  "졸려": {
    "importance_score": 4,
    "sentiment": { "valence": -0.4, "arousal": 0.1, "primary_emotion": "exhausted" },
    "context": { "intimacy_level": 2, "intent": "seeking_comfort" },
    "entity_graph": [{ "name": "User", "category": "person", "relation_to_user": "self" }],
    "user_preferences": [],
    "one_line_summary": "극심한 피로 호소. 판단력 저하 상태.",
    "retention_policy": "temporary"
  },
  "초코": {
    "importance_score": 6,
    "sentiment": { "valence": 0.8, "arousal": 0.6, "primary_emotion": "affection" },
    "context": { "intimacy_level": 3, "intent": "sharing_info" },
    "entity_graph": [
      { "name": "초코", "category": "pet", "relation_to_user": "precious_family" }
    ],
    "user_preferences": [{ "target": "초코", "sentiment": "love" }],
    "one_line_summary": "반려견 '초코'에 대한 강한 애착 표출.",
    "retention_policy": "long_term"
  },
  "배신": {
    "importance_score": 10,
    "sentiment": { "valence": -0.9, "arousal": 0.9, "primary_emotion": "hatred" },
    "context": { "intimacy_level": 2, "intent": "venting" }, // 화풀이
    "entity_graph": [
      { "name": "Unknown_Target", "category": "person", "relation_to_user": "traitor" }
    ],
    "user_preferences": [{ "target": "배신자", "sentiment": "hate" }],
    "one_line_summary": "믿었던 대상에게 배신당함. 복수심 감지됨.",
    "retention_policy": "permanent_core"
  },
  "결혼": {
    "importance_score": 5,
    "sentiment": { "valence": 0.7, "arousal": 0.5, "primary_emotion": "anticipation" },
    "context": { "intimacy_level": 2, "intent": "sharing_info" },
    "entity_graph": [
      { "name": "Partner", "category": "person", "relation_to_user": "spouse_to_be" }
    ],
    "user_preferences": [{ "target": "결혼", "sentiment": "like" }],
    "one_line_summary": "결혼 예정. 낙관적 미래를 꿈꾸는 중.",
    "retention_policy": "long_term"
  },
  "야근": {
    "importance_score": 7,
    "sentiment": { "valence": -0.7, "arousal": 0.4, "primary_emotion": "resignation" },
    "context": { "intimacy_level": 2, "intent": "venting" },
    "entity_graph": [
      { "name": "Company", "category": "concept", "relation_to_user": "exploiter" }, // 착취자
      { "name": "Coffee", "category": "object", "relation_to_user": "survival_tool" }
    ],
    "user_preferences": [{ "target": "야근", "sentiment": "hate" }, { "target": "커피", "sentiment": "like" }],
    "one_line_summary": "과도한 업무로 인한 번아웃. 조직에 대한 반감.",
    "retention_policy": "long_term"
  }
};

// --- 3. JSON 하이라이터 컴포넌트 ---
const JsonValue = ({ value, indent = 0 }: { value: unknown; indent?: number }) => {
  const pad = "  ".repeat(indent);
  const padClose = "  ".repeat(Math.max(0, indent - 1));

  if (value === null) return <span className="text-gray-500">null</span>;
  if (typeof value === "boolean") return <span className="text-red-500">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-amber-500">{value}</span>;
  if (typeof value === "string") return <span className="text-emerald-400">{`"${value}"`}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>{"[]"}</span>;
    return (
      <span>
        {"[\n"}
        {value.map((item, i) => (
          <span key={i}>
            {pad}<JsonValue value={item} indent={indent + 1} />
            {i < value.length - 1 ? ",\n" : "\n"}
          </span>
        ))}
        {padClose}{"]"}
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span>{"{}"}</span>;
    return (
      <span>
        {"{\n"}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {pad}<span className="text-rose-400">{`"${key}"`}</span>{": "}
            <JsonValue value={val} indent={indent + 1} />
            {i < entries.length - 1 ? ",\n" : "\n"}
          </span>
        ))}
        {padClose}{"}"}
      </span>
    );
  }

  return <span>{String(value)}</span>;
};

export default function SeranChatPrototypeV2() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 0, 
      text: "어서 와라. 몽환루(夢幻樓)는 처음인가 보군.\n여기선 돈이 왕이고 쾌락이 법이지.\n\n너, 낯선 냄새가 나는데... \n기억을 팔러 왔나, 아니면 잊으러 왔나?", 
      sender: 'bot', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    
    // 1. 유저 메시지 표시
    const newMessage: Message = { 
      id: nextId.current++, 
      text: userText, 
      sender: 'user', 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setStatus('analyzing');

    // 2. 분석 시뮬레이션 (딜레이)
    await new Promise(r => setTimeout(r, 800));

    // 3. 키워드 매칭 로직
    let resultKey = "default";
    if (userText.includes("졸려") || userText.includes("피곤")) resultKey = "졸려";
    else if (userText.includes("초코") || userText.includes("강아지")) resultKey = "초코";
    else if (userText.includes("배신") || userText.includes("믿음") || userText.includes("상처")) resultKey = "배신";
    else if (userText.includes("결혼") || userText.includes("웨딩")) resultKey = "결혼";
    else if (userText.includes("일") || userText.includes("업무") || userText.includes("커피") || userText.includes("야근")) {
        resultKey = "야근";
    }

    const result = { ...MOCK_DB[resultKey] };
    setAnalysisResult(result);
    setStatus('complete');

    // 4. 세란의 화법으로 응답 생성
    setTimeout(() => {
      const botReply = generateSeranReply(result, resultKey);
      setMessages(prev => [...prev, { 
        id: nextId.current++, 
        text: botReply, 
        sender: 'bot', 
        timestamp: new Date() 
      }]);
    }, 500);
  };

  const generateSeranReply = (data: AnalysisData, key: string) => {
    // 세란의 말투: 냉소적, 하대, 그러나 핵심을 찌름
    
    if (key === '야근') {
      return "밤 늦게까지 남의 일을 해주느라 몸을 축내는군.\n그 대단하신 조직이 네 건강까지 책임져 주던가? \n쯧, 여기 독한 술이나 한 잔 마시고 잊어버려.";
    }
    if (key === '배신') {
      return "하, 배신이라... 눈빛이 마음에 드는군.\n원래 사람은 믿는 게 아니야. 이용하는 거지.\n그 상처, 내가 아주 비싸게 사줄 수도 있는데 말이야.";
    }
    if (key === '초코') {
      return "짐승이라. 때로는 말 많은 인간보다 낫지.\n적어도 밥 주는 주인의 손을 물지는 않으니까.\n그래서, 그 녀석 이름이 뭐라고?";
    }
    if (key === '결혼') {
      return "사랑? 흥, 영원할 것 같나?\n계약서에 도장 찍는다고 마음이 묶이는 건 아닐 텐데.\n뭐, 축하는 해주지. 오늘 술값은 네가 내라.";
    }
    if (data.sentiment.primary_emotion === 'exhausted') {
      return "눈이 풀렸군. 재미없어.\n2층 객실이라도 빌려줄까? 물론 공짜는 아니야.";
    }
    
    // Default Responses
    const replies = [
      "그래서? 결론만 말해. 내 시간은 비싸니까.",
      "흐음... 너, 꽤 특이한 곳에서 왔군. 말투가 촌스러워.",
      "돈 냄새가 안 나는데. 더 재미있는 이야기는 없어?",
      "(곰방대 연기를 내뿜으며) 계속 떠들어 봐. 듣고는 있으니."
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans bg-slate-950 text-slate-200 border-b border-slate-900">
      
      {/* --- 왼쪽: 몽환루 채팅 인터페이스 --- */}
      <div className="w-full md:w-1/3 flex flex-col border-r border-slate-800 bg-slate-900 h-full relative z-10 shadow-2xl">
        
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-red-900 bg-slate-800 flex items-center justify-center overflow-hidden relative">
               <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 to-slate-900/80 z-0"></div>
               <Wine className="w-6 h-6 text-red-500 z-10" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-lg tracking-wider font-serif">몽환루 (夢幻樓)</h1>
              <p className="text-xs text-red-400 flex items-center gap-1 font-serif">
                <Flame className="w-3 h-3 fill-current" />
                주인: 세란 (Seran)
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* 채팅 영역 */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-5 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-900 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn group`}>
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-red-900/30 flex-shrink-0 flex items-center justify-center text-red-500 mt-1 shadow-[0_0_10px_rgba(220,38,38,0.2)]">
                  <Wine className="w-4 h-4" />
                </div>
              )}
              <div className={`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-md
                ${msg.sender === 'user' 
                  ? 'bg-slate-700 text-slate-100 rounded-tr-none border border-slate-600' 
                  : 'bg-red-950/40 text-red-100 rounded-tl-none border border-red-900/30 font-serif'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* 입력 영역 */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="flex gap-2 relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-800 text-slate-200 rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 border border-slate-700 transition-all placeholder:text-slate-600"
              placeholder="주인장에게 말을 건넨다..." 
              autoComplete="off"
            />
            <button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100 p-3 rounded-lg transition-all shadow-[0_0_15px_rgba(153,27,27,0.4)] border border-red-800">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* --- 오른쪽: Memory Ledger (세란의 장부) - UPDATED --- */}
      <div className="flex-1 flex flex-col bg-slate-950 h-full relative border-l border-slate-800">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <ScrollText className="w-80 h-80 text-white" />
        </div>

        {/* 대시보드 헤더 */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              <Gem className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-200 text-sm tracking-wide">SECRET LEDGER (비밀 장부)</h2>
              <p className="text-xs text-slate-500">Value & Context Extraction</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-900 rounded text-[10px] text-slate-500 border border-slate-800 uppercase tracking-widest">Confidential</span>
            <div className={`px-2 py-1 rounded text-xs border flex items-center gap-1 transition-all
              ${status === 'analyzing' 
                ? 'bg-amber-900/20 text-amber-500 border-amber-900/50' 
                : status === 'complete' 
                  ? 'bg-red-900/20 text-red-400 border-red-900/50'
                  : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'analyzing' ? 'bg-amber-500 animate-pulse' : status === 'complete' ? 'bg-red-500' : 'bg-slate-600'}`}></span>
              {status === 'idle' ? '대기중' : status === 'analyzing' ? '가치 평가중...' : '기록 완료'}
            </div>
          </div>
        </div>

        {/* 분석 결과 뷰어 */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative z-0">
          
          {/* 1. 핵심 지표 카드 (Importance & Valence) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Importance Score */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-sm p-4 flex flex-col relative overflow-hidden group hover:border-red-900/50 transition-colors">
              <span className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Gem className="w-3 h-3" /> Information Value
              </span>
              <div className="flex items-end gap-2 z-10">
                <span className="text-3xl font-bold text-slate-200 font-serif">{analysisResult ? analysisResult.importance_score : '-'}</span>
                <span className="text-sm text-slate-600 mb-1">/ 10</span>
              </div>
              <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out ${
                    (analysisResult?.importance_score || 0) >= 8 ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' :
                    (analysisResult?.importance_score || 0) >= 5 ? 'bg-amber-600' : 'bg-slate-600'
                  }`}
                  style={{ width: `${(analysisResult?.importance_score || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* Emotional Valence (NEW) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-sm p-4 flex flex-col relative overflow-hidden hover:border-red-900/50 transition-colors">
              <span className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3" /> Mood Valence
              </span>
              <div className="flex items-center justify-between h-full z-10 px-2">
                 <span className="text-xs text-red-400 font-bold">Negative</span>
                 <span className="text-xs text-slate-600">Neutral</span>
                 <span className="text-xs text-emerald-400 font-bold">Positive</span>
              </div>
              
              {/* Valence Bar (Center origin) */}
              <div className="relative w-full h-2 bg-slate-800 mt-2 rounded-full overflow-hidden flex">
                <div className="absolute left-1/2 top-0 w-0.5 h-full bg-slate-500 z-20"></div> {/* Center Line */}
                {analysisResult && (
                  <div 
                    className={`absolute h-full top-0 transition-all duration-700 ${
                      analysisResult.sentiment.valence < 0 ? 'bg-red-500 right-1/2 rounded-l-full' : 'bg-emerald-500 left-1/2 rounded-r-full'
                    }`}
                    style={{ 
                      width: `${Math.abs(analysisResult.sentiment.valence) * 50}%`,
                    }}
                  />
                )}
              </div>
              <div className="text-center mt-1 text-xs text-slate-400 font-mono">
                {analysisResult ? analysisResult.sentiment.valence : '0.0'}
              </div>
            </div>
          </div>

          {/* 2. 맥락 & 엔티티 카드 (Context & Graph) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             {/* Context Data (Intent & Intimacy) */}
             <div className="bg-slate-900/80 border border-slate-800 rounded-sm p-4 hover:border-red-900/50 transition-colors">
                <span className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Interaction Context
                </span>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Guest Intimacy</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <div key={lvl} className={`w-2 h-2 rounded-full ${
                          analysisResult && lvl <= analysisResult.context.intimacy_level 
                          ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' 
                          : 'bg-slate-800'
                        }`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Detected Intent</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      analysisResult 
                      ? 'bg-slate-800 text-slate-200 border-slate-700' 
                      : 'bg-transparent text-slate-600 border-transparent'
                    }`}>
                      {analysisResult ? analysisResult.context.intent.toUpperCase() : '-'}
                    </span>
                  </div>
                </div>
             </div>

             {/* Entity Graph Visualization (NEW) */}
             <div className="bg-slate-900/80 border border-slate-800 rounded-sm p-4 hover:border-red-900/50 transition-colors">
                <span className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Network className="w-3 h-3" /> Entity Knowledge Graph
                </span>
                <div className="flex flex-col gap-2 h-24 overflow-y-auto scrollbar-hide">
                  {analysisResult?.entity_graph && analysisResult.entity_graph.length > 0 ? (
                    analysisResult.entity_graph.map((node, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-slate-950 p-1.5 rounded border border-slate-800/50">
                        <span className="text-amber-500 font-bold px-1">[{node.name}]</span>
                        <span className="text-slate-600">is</span>
                        <span className="text-slate-300 italic">{node.relation_to_user}</span>
                        <span className="ml-auto text-[10px] text-slate-600 bg-slate-900 px-1 rounded uppercase">{node.category}</span>
                      </div>
                    ))
                  ) : (
                     <div className="flex items-center justify-center h-full text-slate-700 text-xs italic">
                       No entities detected
                     </div>
                  )}
                </div>
             </div>
          </div>

          {/* JSON 코드 뷰어 (상세 로그) */}
          <div className="flex-1 bg-slate-950 rounded-sm border border-slate-800 p-0 font-mono text-xs leading-relaxed overflow-hidden shadow-inner relative group min-h-[250px] flex flex-col">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">System Log: /var/log/monghwanlu/memory_v2.json</span>
                <button className="text-slate-500 hover:text-slate-300 transition-colors">
                    <Copy className="w-3 h-3" />
                </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
                <pre className="text-slate-500">
                {analysisResult ? (
                    <code><JsonValue value={analysisResult} indent={1} /></code>
                ) : (
                    <span className="text-slate-700 opacity-50">
                    {`// 손님의 발화를 기다리는 중... \n// 뇌파 동기화 대기...`}
                    </span>
                )}
                </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}