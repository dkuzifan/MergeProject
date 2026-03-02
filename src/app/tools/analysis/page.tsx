"use client";

import { useState, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";

// ─── 타입 ────────────────────────────────────────────────────────────────────

type MetricTab = "sales" | "users" | "revenue";

type DataLine = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

type ParsedSalesData = {
  startDate: Date;
  endDate: Date;
  hasSegment: boolean;
  dateLabels: string[];
  lines: DataLine[];
  chartData: Record<string, string | number>[];
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

// ─── 날짜 유틸 ───────────────────────────────────────────────────────────────

function parseYMD(s: string): Date {
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10) - 1;
  const d = parseInt(s.slice(6, 8), 10);
  return new Date(y, m, d);
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

// ─── xlsx 파싱 ───────────────────────────────────────────────────────────────

function getCell(sheet: XLSX.WorkSheet, row: number, col: number): XLSX.CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })];
}

function parseSalesFile(buffer: ArrayBuffer): ParsedSalesData {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];

  // 1. 기간 (A4): "# YYYYMMDD-YYYYMMDD"
  const periodRaw = String(getCell(sheet, 4, 1)?.v ?? "");
  const periodStr = periodRaw.replace(/#/g, "").trim();
  const dashIdx   = periodStr.indexOf("-");
  if (dashIdx === -1) throw new Error("A4 셀에서 기간을 읽을 수 없습니다.");
  const startDate = parseYMD(periodStr.slice(0, dashIdx).trim());
  const endDate   = parseYMD(periodStr.slice(dashIdx + 1).trim());
  const sameYear  = startDate.getFullYear() === endDate.getFullYear();

  // 2. 세그먼트 여부 (B8)
  const b8Value    = String(getCell(sheet, 8, 2)?.v ?? "");
  const hasSegment = b8Value.trim() === "세그먼트";

  // 3. 날짜 행 시작 컬럼 (1-based): 세그먼트 있으면 C=3, 없으면 B=2
  const dataStartCol = hasSegment ? 3 : 2;

  // 4. 날짜 목록 (7행, N일차 → 실제 날짜 문자열)
  const dateLabels: string[] = [];
  for (let col = dataStartCol; col <= dataStartCol + 500; col++) {
    const cell = getCell(sheet, 7, col);
    if (cell === undefined || cell.v === undefined || cell.v === "") break;
    const dayN = Number(cell.v);
    dateLabels.push(formatDateLabel(addDays(startDate, dayN), sameYear));
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

    const values: number[] = [];
    for (let i = 0; i < numDays; i++) {
      const valCell = getCell(sheet, row, dataStartCol + i);
      values.push(valCell ? Number(valCell.v) : 0);
    }

    const id    = `line_${row}`;
    const label = segment ? `${eventLogName} - ${segment}` : eventLogName;
    lines.push({ id, label, color: LINE_COLORS[lines.length % LINE_COLORS.length], values });
  }

  // 6. Recharts용 chartData
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

// ─── 상품 판매 탭 ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 dark:text-gray-300 truncate max-w-[160px]">{entry.name}</span>
          <span className="font-bold text-gray-900 dark:text-white ml-auto pl-2">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function ProductSalesTab() {
  const [data, setData]       = useState<ParsedSalesData | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSalesFile(buffer);
      setData(parsed);
      setVisible(new Set(parsed.lines.map(l => l.id)));
    } catch (e) {
      setError("파일 파싱 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.");
      console.error(e);
    }
  }, []);

  const toggleLine = (id: string) =>
    setVisible(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () => {
    if (!data) return;
    setVisible(prev => prev.size === data.lines.length ? new Set() : new Set(data.lines.map(l => l.id)));
  };

  const xInterval = data ? Math.max(0, Math.ceil(data.dateLabels.length / 8) - 1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">상품 판매 분석</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">상품별 일자별 판매량을 선 그래프로 표시합니다.</p>
      </div>

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
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={data.chartData} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-gray-500 dark:text-gray-400"
                  interval={xInterval}
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-gray-200 dark:text-gray-700" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-gray-500 dark:text-gray-400"
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
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

          {/* 범례 (체크박스) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">항목</span>
              <button
                onClick={toggleAll}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {visible.size === data.lines.length ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              {data.lines.map(line => {
                const on = visible.has(line.id);
                return (
                  <label key={line.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleLine(line.id)}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                      style={{ accentColor: line.color }}
                    />
                    <div
                      className="w-5 h-0.5 rounded-full transition-colors"
                      style={{ backgroundColor: on ? line.color : "#d1d5db" }}
                    />
                    <span className={`text-xs font-medium transition-colors ${
                      on ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"
                    }`}>
                      {line.label}
                    </span>
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
  const [activeTab, setActiveTab] = useState<MetricTab>("sales");

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
        {activeTab === "sales"   && <ProductSalesTab />}
        {activeTab === "users"   && <PlaceholderTab label="유저 수" />}
        {activeTab === "revenue" && <PlaceholderTab label="매출" />}
      </main>

    </div>
  );
}
