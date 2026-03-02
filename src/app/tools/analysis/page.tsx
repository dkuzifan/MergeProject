"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import { createClient } from "@/utils/supabase/client";

// ─── 타입 ────────────────────────────────────────────────────────────────────

type MetricTab = "sales" | "users" | "revenue";

type SellingGood = {
  log_name_a: string;
  index_a:    string | null;
  index_dev:  string | null;
  aos_id_a:   string | null;
  ios_id_a:   string | null;
  gem_price:  number | null;
  aos_price:  number | null;
  ios_price:  number | null;
};

type DataLine = {
  id:           string;
  eventLogName: string;       // xlsx A열 원본값
  label:        string;       // index_dev 또는 eventLogName (fallback)
  segment?:     string;
  color:        string;
  values:       number[];
  gemPrice:     number | null;
  aosPrice:     number | null;
};

type ParsedSalesData = {
  startDate:  Date;
  endDate:    Date;
  hasSegment: boolean;
  dateLabels: string[];
  lines:      DataLine[];
  chartData:  Record<string, string | number>[];
};

// ─── 상수 ────────────────────────────────────────────────────────────────────

const LINE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#8b5cf6", "#f97316", "#06b6d4",
  "#84cc16", "#ec4899", "#14b8a6", "#f43f5e",
];

const METRICS: { id: MetricTab; label: string; icon: string }[] = [
  { id: "sales",   label: "상품 판매", icon: "📦" },
  { id: "users",   label: "유저 수",   icon: "👥" },
  { id: "revenue", label: "매출",      icon: "💰" },
];

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function mostFrequent<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v === null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: T | null = null;
  let bestCount = 0;
  counts.forEach((count, val) => { if (count > bestCount) { bestCount = count; best = val; } });
  return best;
}

// ─── 날짜 유틸 ───────────────────────────────────────────────────────────────

function parseYMD(s: string): Date {
  return new Date(
    parseInt(s.slice(0, 4), 10),
    parseInt(s.slice(4, 6), 10) - 1,
    parseInt(s.slice(6, 8), 10),
  );
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDateLabel(date: Date, sameYear: boolean): string {
  const yy = String(date.getFullYear()).slice(2);
  const m  = date.getMonth() + 1;
  const d  = date.getDate();
  return sameYear ? `${m}월 ${d}일` : `${yy}년 ${m}월 ${d}일`;
}

function formatFullDate(date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const m  = date.getMonth() + 1;
  const d  = date.getDate();
  return `${yy}년 ${m}월 ${d}일`;
}

function formatPrice(price: number | null): string {
  if (price === null) return "";
  return `₩${price.toLocaleString("ko-KR")}`;
}

// ─── xlsx 파싱 ───────────────────────────────────────────────────────────────

function getCell(sheet: XLSX.WorkSheet, row: number, col: number): XLSX.CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })];
}

function parseSalesFile(
  buffer: ArrayBuffer,
  goodsMap: Map<string, SellingGood>,
): ParsedSalesData {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];

  // 1. 기간 (A4)
  const periodRaw = String(getCell(sheet, 4, 1)?.v ?? "");
  const periodStr = periodRaw.replace(/#/g, "").trim();
  const dashIdx   = periodStr.indexOf("-");
  if (dashIdx === -1) throw new Error("A4 셀에서 기간을 읽을 수 없습니다.");
  const startDate = parseYMD(periodStr.slice(0, dashIdx).trim());
  const endDate   = parseYMD(periodStr.slice(dashIdx + 1).trim());
  const sameYear  = startDate.getFullYear() === endDate.getFullYear();

  // 2. 세그먼트 여부 (B8)
  const hasSegment = String(getCell(sheet, 8, 2)?.v ?? "").trim() === "세그먼트";

  // 3. 데이터 시작 컬럼 (1-based): 세그먼트 있으면 C=3, 없으면 B=2
  const dataStartCol = hasSegment ? 3 : 2;

  // 4. 날짜 목록 (7행, N일차 → 실제 날짜)
  const dateLabels: string[] = [];
  for (let col = dataStartCol; col <= dataStartCol + 500; col++) {
    const cell = getCell(sheet, 7, col);
    if (!cell || cell.v === undefined || cell.v === "") break;
    dateLabels.push(formatDateLabel(addDays(startDate, Number(cell.v)), sameYear));
  }
  const numDays = dateLabels.length;

  // 5. 데이터 행 (9행~)
  const lines: DataLine[] = [];
  for (let row = 9; row <= 9 + 500; row++) {
    const nameCell = getCell(sheet, row, 1);
    if (!nameCell || nameCell.v === undefined || nameCell.v === "") break;

    const eventLogName = String(nameCell.v);
    const segment      = hasSegment
      ? String(getCell(sheet, row, 2)?.v ?? "")
      : undefined;

    // selling_goods 매핑
    const good     = goodsMap.get(eventLogName);
    const baseName = good?.index_dev ?? eventLogName;
    const label    = segment ? `${baseName} - ${segment}` : baseName;

    const values: number[] = [];
    for (let i = 0; i < numDays; i++) {
      const valCell = getCell(sheet, row, dataStartCol + i);
      values.push(valCell ? Number(valCell.v) : 0);
    }

    lines.push({
      id: `line_${row}`,
      eventLogName,
      label,
      segment,
      color:    LINE_COLORS[lines.length % LINE_COLORS.length],
      values,
      gemPrice:  good?.gem_price  ?? null,
      aosPrice:  good?.aos_price  ?? null,
    });
  }

  // 6. Recharts 차트 데이터
  const chartData = dateLabels.map((date, i) => {
    const point: Record<string, string | number> = { date };
    lines.forEach(line => { point[line.id] = line.values[i] ?? 0; });
    return point;
  });

  return { startDate, endDate, hasSegment, dateLabels, lines, chartData };
}

// ─── 업로드 영역 ─────────────────────────────────────────────────────────────

function UploadArea({ onFile }: { onFile: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    if (!file.name.endsWith(".xlsx")) { alert(".xlsx 파일만 업로드할 수 있습니다."); return; }
    onFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        isDragging
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
          : "border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
    >
      <div className="text-4xl mb-3">📂</div>
      <p className="text-sm font-bold text-gray-600 dark:text-gray-300">xlsx 파일을 드래그하거나 클릭하여 업로드</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">.xlsx 형식만 지원</p>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
    </div>
  );
}

// ─── 커스텀 툴팁 ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, viewMode }: any) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) =>
    viewMode === "revenue" ? `₩${v.toLocaleString("ko-KR")}` : v.toLocaleString();
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 dark:text-gray-300 truncate">{entry.name}</span>
          <span className="font-bold text-gray-900 dark:text-white ml-auto pl-3">
            {fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 상품 판매 탭 ────────────────────────────────────────────────────────────

const TOP_N_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

function ProductSalesTab({ goodsMap }: { goodsMap: Map<string, SellingGood> }) {
  const [data, setData]           = useState<ParsedSalesData | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [visible, setVisible]     = useState<Set<string>>(new Set());
  const [fileName, setFileName]   = useState("");
  const [viewMode, setViewMode]   = useState<"count" | "revenue">("count");
  const [topN, setTopN]           = useState<number | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setTopN(null);
    setViewMode("count");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSalesFile(buffer, goodsMap);
      setData(parsed);
      setVisible(new Set(parsed.lines.map(l => l.id)));
    } catch (e) {
      setError("파일 파싱 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.");
      console.error(e);
    }
  }, [goodsMap]);

  // 전체 합계 기준 내림차순 정렬
  const sortedLines = useMemo(() => {
    if (!data) return [];
    return [...data.lines].sort(
      (a, b) => b.values.reduce((s, v) => s + v, 0) - a.values.reduce((s, v) => s + v, 0)
    );
  }, [data]);

  // 뷰 모드에 따라 차트 데이터 변환 (revenue = count × price)
  const displayChartData = useMemo(() => {
    if (!data) return [];
    if (viewMode === "count") return data.chartData;
    return data.chartData.map(point => {
      const p: Record<string, string | number> = { date: point.date as string };
      data.lines.forEach(line => {
        const price = line.aosPrice ?? line.gemPrice ?? null;
        const count = (point[line.id] as number) ?? 0;
        p[line.id] = price !== null ? count * price : 0;
      });
      return p;
    });
  }, [data, viewMode]);

  const toggleLine = (id: string) => {
    setTopN(null);
    setVisible(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleTopN = (n: number) => {
    if (!data) return;
    setTopN(n);
    setVisible(new Set(sortedLines.slice(0, n).map(l => l.id)));
  };

  const toggleAll = () => {
    if (!data) return;
    setTopN(null);
    setVisible(prev =>
      prev.size === data.lines.length ? new Set() : new Set(data.lines.map(l => l.id))
    );
  };

  const xInterval = data ? Math.max(0, Math.ceil(data.dateLabels.length / 8) - 1) : 0;

  const yTickFormatter = viewMode === "revenue"
    ? (v: number) => {
        if (v >= 100_000_000) return `₩${(v / 100_000_000).toFixed(1)}억`;
        if (v >= 10_000)      return `₩${(v / 10_000).toFixed(0)}만`;
        return `₩${v.toLocaleString("ko-KR")}`;
      }
    : (v: number) => v.toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">상품 판매 분석</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">상품별 일자별 판매량을 선 그래프로 표시합니다.</p>
      </div>

      {goodsMap.size === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ Supabase에 selling_goods 데이터가 없습니다. 이벤트 로그명이 그대로 표시됩니다.
        </div>
      )}
      {goodsMap.size > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-4 py-3 text-xs text-green-700 dark:text-green-400">
          ✅ 상품 기준 데이터 {goodsMap.size}개 로드됨
        </div>
      )}

      <UploadArea onFile={handleFile} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* 정보 바 */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
            <span>📅 {formatFullDate(data.startDate)} ~ {formatFullDate(data.endDate)}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>📋 {fileName}</span>
            {data.hasSegment && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-indigo-500 dark:text-indigo-400 font-medium">세그먼트 포함</span>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{data.lines.length}개 항목 · {data.dateLabels.length}일</span>
          </div>

          {/* 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            {/* 뷰 모드 토글 */}
            <div className="flex gap-2 mb-4">
              {(["count", "revenue"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === mode
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {mode === "count" ? "이벤트 카운트" : "발생 매출"}
                </button>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={displayChartData} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-gray-500 dark:text-gray-400"
                  interval={xInterval}
                  tickLine={false}
                  axisLine={{ stroke: "currentColor" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-gray-500 dark:text-gray-400"
                  tickLine={false}
                  axisLine={false}
                  width={viewMode === "revenue" ? 68 : 52}
                  tickFormatter={yTickFormatter}
                />
                <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                {data.lines
                  .filter(l => visible.has(l.id))
                  .map(line => (
                    <Line
                      key={line.id}
                      type="monotone"
                      dataKey={line.id}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={false}
                      name={line.label}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 범례 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            {/* 상위 N개 + 전체 선택/해제 */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">상위</span>
              {TOP_N_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => handleTopN(n)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    topN === n
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {n}개
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
              <button
                onClick={toggleAll}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {visible.size === data.lines.length ? "전체 해제" : "전체 선택"}
              </button>
            </div>

            {/* 수직 목록 */}
            <div className="flex flex-col gap-y-1 max-h-96 overflow-y-auto pr-1">
              {data.lines.map(line => {
                const on = visible.has(line.id);
                return (
                  <label key={line.id} className="flex items-center gap-2 cursor-pointer py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 px-1">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleLine(line.id)}
                      className="w-3.5 h-3.5 rounded cursor-pointer flex-shrink-0"
                      style={{ accentColor: line.color }}
                    />
                    <div
                      className="w-5 h-0.5 rounded-full flex-shrink-0 transition-colors"
                      style={{ backgroundColor: on ? line.color : "#d1d5db" }}
                    />
                    <div className={`flex items-baseline gap-1.5 min-w-0 transition-colors ${on ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"}`}>
                      <span className="text-xs font-medium truncate">{line.label}</span>
                      {line.gemPrice !== null && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {line.gemPrice.toLocaleString()}젬
                        </span>
                      )}
                      {line.aosPrice !== null && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {formatPrice(line.aosPrice)}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 준비 중 탭 ──────────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
      <div className="text-5xl mb-4">🚧</div>
      <p className="text-lg font-bold">{label}</p>
      <p className="text-sm mt-1">준비 중입니다.</p>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [activeTab, setActiveTab]   = useState<MetricTab>("sales");
  const [goodsMap, setGoodsMap]     = useState<Map<string, SellingGood>>(new Map());
  const [goodsLoading, setGoodsLoading] = useState(true);

  // Supabase에서 selling_goods 한 번만 로드
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("selling_goods")
      .select("log_name_a, index_a, index_dev, aos_id_a, ios_id_a, gem_price, aos_price, ios_price")
      .then(({ data, error }) => {
        if (error) { console.error("selling_goods 로드 실패:", error); }
        if (data) {
          // 중복 log_name_a를 그룹핑 후 각 필드의 최빈값으로 병합
          const groups = new Map<string, SellingGood[]>();
          data.forEach((row: SellingGood) => {
            const arr = groups.get(row.log_name_a) ?? [];
            arr.push(row);
            groups.set(row.log_name_a, arr);
          });
          const map = new Map<string, SellingGood>();
          groups.forEach((rows, log_name_a) => {
            map.set(log_name_a, {
              log_name_a,
              index_a:   mostFrequent(rows.map(r => r.index_a)),
              index_dev: mostFrequent(rows.map(r => r.index_dev)),
              aos_id_a:  mostFrequent(rows.map(r => r.aos_id_a)),
              ios_id_a:  mostFrequent(rows.map(r => r.ios_id_a)),
              gem_price: mostFrequent(rows.map(r => r.gem_price)),
              aos_price: mostFrequent(rows.map(r => r.aos_price)),
              ios_price: mostFrequent(rows.map(r => r.ios_price)),
            });
          });
          setGoodsMap(map);
        }
        setGoodsLoading(false);
      });
  }, []);

  return (
    <div className="flex h-[calc(100vh-65px)] bg-gray-50 dark:bg-gray-900">

      {/* 사이드바 */}
      <aside className="w-52 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-2">지표</h2>
        <nav className="space-y-1">
          {METRICS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === m.id
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-8">
        {goodsLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-600">
            기준 데이터 로드 중...
          </div>
        ) : (
          <>
            {activeTab === "sales"   && <ProductSalesTab goodsMap={goodsMap} />}
            {activeTab === "users"   && <PlaceholderTab label="유저 수" />}
            {activeTab === "revenue" && <PlaceholderTab label="매출" />}
          </>
        )}
      </main>

    </div>
  );
}
