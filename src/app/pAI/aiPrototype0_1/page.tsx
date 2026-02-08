"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Smile, 
  MoreVertical, 
  Send, 
  Cpu, 
  BrainCircuit, 
  Copy 
} from "lucide-react";

// --- 1. 타입 정의 ---
type EmotionData = {
  primary: string;
  intensity: number;
  underlying_need: string;
};

type AnalysisData = {
  importance_score: number;
  memory_type: string;
  topic_tags: string[];
  content_summary: string;
  user_emotion: EmotionData;
  entities: Record<string, string[]>;
  retention_policy: string;
  action_trigger: boolean;
};

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

// --- 2. Mock 데이터 (시뮬레이션용 DB) ---
// * 앞선 대화에서 추가된 '야근' 시나리오가 포함되었습니다.
const MOCK_DB: Record<string, AnalysisData> = {
  "default": {
    "importance_score": 3,
    "memory_type": "trivial",
    "topic_tags": ["daily_conversation"],
    "content_summary": "일상적인 대화를 나누고 있음",
    "user_emotion": { "primary": "neutral", "intensity": 1, "underlying_need": "connection" },
    "entities": {},
    "retention_policy": "temporary",
    "action_trigger": false
  },
  "졸려": {
    "importance_score": 4,
    "memory_type": "physical_state",
    "topic_tags": ["tiredness", "health"],
    "content_summary": "현재 졸음을 느끼며 피곤해함",
    "user_emotion": { "primary": "tired", "intensity": 2, "underlying_need": "rest" },
    "entities": {},
    "retention_policy": "temporary",
    "action_trigger": false
  },
  "초코": {
    "importance_score": 7,
    "memory_type": "relation",
    "topic_tags": ["pet", "daily_life"],
    "content_summary": "반려견 '초코'를 키우며, 산책 루틴이 있고 강한 애정을 느낌",
    "user_emotion": { "primary": "affection", "intensity": 4, "underlying_need": "sharing_joy" },
    "entities": { "pet": ["초코"] },
    "retention_policy": "permanent",
    "action_trigger": false
  },
  "배신": {
    "importance_score": 10,
    "memory_type": "emotional",
    "topic_tags": ["trauma", "values", "trust_issues"],
    "content_summary": "과거 친구의 배신으로 인한 트라우마 존재",
    "user_emotion": { "primary": "fear/sadness", "intensity": 5, "underlying_need": "safety_assurance" },
    "entities": {},
    "retention_policy": "permanent",
    "action_trigger": true
  },
  "결혼": {
     "importance_score": 9,
     "memory_type": "life_event",
     "topic_tags": ["wedding", "future_plan"],
     "content_summary": "결혼을 앞두고 있어 기대감과 긴장감을 동시에 느낌",
     "user_emotion": { "primary": "anticipation", "intensity": 4, "underlying_need": "celebration" },
     "entities": { "date": ["upcoming"] },
     "retention_policy": "permanent",
     "action_trigger": true
  },
  // [Update] 업무 및 카페인 섭취 시나리오
  "야근": {
    "importance_score": 6,
    "memory_type": "routine",
    "topic_tags": ["work", "habit", "health"],
    "content_summary": "낮잠으로 인해 저녁 업무를 해야 하며, 카페인(코코아/커피)으로 각성 상태를 유지하려 함",
    "user_emotion": { "primary": "determined", "intensity": 3, "underlying_need": "encouragement" },
    "entities": { "food": ["코코아", "커피"], "activity": ["저녁 업무", "낮잠"] },
    "retention_policy": "update_existing",
    "action_trigger": false
  }
};

// --- 3. 유틸리티 함수 (JSON Syntax Highlight) ---
const syntaxHighlight = (json: string) => {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-amber-500'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-violet-400'; // key
      } else {
        cls = 'text-emerald-400'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-red-400'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-red-400'; // null
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
};

export default function AIProtoTypePage() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 0, 
      text: "안녕하세요! 오늘 하루는 어떠셨나요?\n사소한 이야기라도 좋으니 편하게 말해주세요. 😊", 
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

  // Scroll to bottom effect
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

    // 3. 키워드 매칭 로직 (Update: 복합 키워드 매칭)
    let resultKey = "default";
    if (userText.includes("졸려") || userText.includes("피곤")) resultKey = "졸려";
    else if (userText.includes("초코") || userText.includes("강아지")) resultKey = "초코";
    else if (userText.includes("배신") || userText.includes("믿음") || userText.includes("상처")) resultKey = "배신";
    else if (userText.includes("결혼") || userText.includes("웨딩")) resultKey = "결혼";
    else if (userText.includes("일") || userText.includes("업무") || userText.includes("커피") || userText.includes("코코아") || userText.includes("야근")) {
        resultKey = "야근";
    }

    const result = { ...MOCK_DB[resultKey] };
    setAnalysisResult(result);
    setStatus('complete');

    // 4. 봇 응답 생성 (Update: 키워드 전달)
    setTimeout(() => {
      const botReply = generateBotReply(result, resultKey);
      setMessages(prev => [...prev, { 
        id: nextId.current++, 
        text: botReply, 
        sender: 'bot', 
        timestamp: new Date() 
      }]);
    }, 500);
  };

  const generateBotReply = (data: AnalysisData, key: string) => {
    // 시나리오별 맞춤형 응답
    if (key === '야근') return "아고, 낮잠 때문에 밤샘 각이군요... 😅 코코아에 커피까지 드신다니 속 버리지 않게 조심하세요! 제가 옆에서 응원할게요.";

    if (data.importance_score >= 9) return "저런... 말씀해주셔서 고마워요. 그 기억은 제가 소중히 간직할게요. 지금 기분은 좀 어때요?";
    if (data.memory_type === 'relation') return `아, ${data.content_summary.split(',')[0]} 이야기군요! 정말 소중한 존재인 것 같아요.`;
    if (data.user_emotion.primary === 'tired') return "오늘 많이 고단하셨군요. 따뜻한 차 한 잔 하면서 쉬는 건 어때요?";
    
    const replies = ["그렇군요!", "음, 더 자세히 이야기해 줄 수 있어요?", "흥미로운 이야기네요."];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans bg-slate-50 border-b border-slate-200">
      
      {/* --- 왼쪽: 채팅 인터페이스 --- */}
      <div className="w-full md:w-1/3 flex flex-col border-r border-slate-200 bg-white h-full relative z-10 shadow-2xl">
        
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
              <Smile className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">오손이</h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                온라인 • 공감 모드
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* 채팅 영역 */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}>
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-500 mt-1">
                  <Smile className="w-5 h-5" />
                </div>
              )}
              <div className={`p-3 rounded-2xl shadow-sm max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap
                ${msg.sender === 'user' 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* 입력 영역 */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-2 relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-100 text-slate-800 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all placeholder:text-slate-400"
              placeholder="메시지를 입력하세요..." 
              autoComplete="off"
            />
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors shadow-lg shadow-orange-200">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* --- 오른쪽: Memory Analyst 대시보드 --- */}
      <div className="flex-1 flex flex-col bg-slate-900 h-full relative">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 text-white" />
        </div>

        {/* 대시보드 헤더 */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/90 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">Memory Analyst v2.0</h2>
              <p className="text-xs text-slate-400">Real-time Context Extraction</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">JSON Mode</span>
            <div className={`px-2 py-1 rounded text-xs border flex items-center gap-1 transition-all
              ${status === 'analyzing' 
                ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
                : status === 'complete' 
                  ? 'bg-green-900/30 text-green-300 border-green-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'analyzing' ? 'bg-purple-500 animate-pulse' : status === 'complete' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              {status === 'idle' ? '대기중' : status === 'analyzing' ? '분석중...' : '분석 완료'}
            </div>
          </div>
        </div>

        {/* 분석 결과 뷰어 */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative z-0">
          
          {/* 중요도 시각화 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 1. Importance Score */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col">
              <span className="text-xs text-slate-400 mb-1">Importance Score</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{analysisResult ? analysisResult.importance_score : '-'}</span>
                <span className="text-sm text-slate-500 mb-1">/ 10</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out ${
                    (analysisResult?.importance_score || 0) >= 8 ? 'bg-red-500' :
                    (analysisResult?.importance_score || 0) >= 4 ? 'bg-purple-500' : 'bg-slate-500'
                  }`}
                  style={{ width: `${(analysisResult?.importance_score || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* 2. User Emotion */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col">
              <span className="text-xs text-slate-400 mb-1">User Emotion</span>
              <div className="flex flex-col h-full justify-center">
                <span className="text-lg font-medium text-white">
                  {analysisResult ? analysisResult.user_emotion.primary.toUpperCase() : 'Analysis Pending'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Intensity:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const isActive = analysisResult ? i <= analysisResult.user_emotion.intensity : false;
                      const colorClass = isActive 
                        ? (analysisResult!.user_emotion.intensity >= 4 ? 'bg-red-400' : 'bg-purple-400') 
                        : 'bg-slate-700';
                      return <div key={i} className={`w-1.5 h-4 ${colorClass} rounded-sm transition-colors`} />;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Underlying Need */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col">
              <span className="text-xs text-slate-400 mb-1">Underlying Need</span>
              <div className="flex items-center h-full">
                <p className="text-sm text-slate-300 italic">
                  {analysisResult ? `"${analysisResult.user_emotion.underlying_need}"` : '"발화 이면의 숨겨진 욕구를 분석합니다."'}
                </p>
              </div>
            </div>
          </div>

          {/* JSON 코드 뷰어 */}
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs leading-relaxed overflow-auto shadow-inner relative group min-h-[300px]">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded hover:bg-slate-700 flex items-center gap-1">
                <Copy className="w-3 h-3" /> Copy JSON
              </button>
            </div>
            <pre className="text-slate-400">
              {analysisResult ? (
                <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(analysisResult, null, 2)) }} />
              ) : (
                <span className="text-slate-600">
                  {`// 사용자의 메시지를 입력하면 \n// Memory Analyst v2.0 프롬프트의 분석 결과가 \n// 이곳에 실시간으로 표시됩니다.`}
                </span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}