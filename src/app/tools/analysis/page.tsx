"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
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

type LineStats = {
  totalCount:    number;
  totalRevenue:  number | null;
  beforeCount:   number | null;
  afterCount:    number | null;
  beforeRevenue: number | null;
  afterRevenue:  number | null;
};

type UserSeriesLine = {
  id:     string;
  label:  string;
  values: number[];
  color:  string;
};

type UserSheetData = {
  sheetKey:    string;
  displayName: string;
  startDate:   Date;
  endDate:     Date;
  dateLabels:  string[];
  series:      UserSeriesLine[];
  chartData:   Record<string, string | number>[];
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

function pctChange(before: number, after: number): string {
  if (before === 0) return after > 0 ? "+∞%" : "—";
  const pct = ((after - before) / before) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function formatRevenue(v: number): string {
  if (v >= 100_000_000) return `₩${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000)      return `₩${(v / 10_000).toFixed(0)}만`;
  return `₩${v.toLocaleString("ko-KR")}`;
}

// "YYYY-MM-DD" 문자열을 차트 레이블 형식으로 변환 (범위 내 없으면 null)
function resolveRefLabel(
  isoDate: string,
  dateLabels: string[],
  startDate: Date,
  endDate: Date,
): string | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const refDate = new Date(y, m - 1, d);
  const label = formatDateLabel(refDate, startDate.getFullYear() === endDate.getFullYear());
  return dateLabels.includes(label) ? label : null;
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

// ─── 유저 수 xlsx 파싱 ────────────────────────────────────────────────────────

const USER_SHEET_CONFIGS: Record<string, { displayName: string; series: { col: number; label: string }[] }> = {
  dau: {
    displayName: "DAU / 신규 유저",
    series: [
      { col: 2, label: "DAU" },
      { col: 3, label: "신규 유저" },
    ],
  },
  d1d7d30: {
    displayName: "D1 / D7 / D30",
    series: [
      { col: 2, label: "D30" },
      { col: 3, label: "D7" },
      { col: 4, label: "D1" },
    ],
  },
  dwmau: {
    displayName: "DAU / WAU / MAU 비율",
    series: [
      { col: 2, label: "DAU/MAU" },
      { col: 3, label: "DAU/WAU" },
      { col: 4, label: "WAU/MAU" },
    ],
  },
};

const USER_SHEET_ORDER = ["dau", "d1d7d30", "dwmau"];

function parseUserFile(buffer: ArrayBuffer): UserSheetData[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const results: UserSheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const key    = sheetName.toLowerCase().trim();
    const config = USER_SHEET_CONFIGS[key];
    if (!config) continue;

    const sheet = workbook.Sheets[sheetName];

    // A1: 시작일, A2: 종료일 (yyyymmdd)
    const startRaw  = String(getCell(sheet, 1, 1)?.v ?? "").replace(/\D/g, "");
    const endRaw    = String(getCell(sheet, 2, 1)?.v ?? "").replace(/\D/g, "");
    const startDate = parseYMD(startRaw);
    const endDate   = parseYMD(endRaw);
    const sameYear  = startDate.getFullYear() === endDate.getFullYear();
    const numDays   = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

    const dateLabels = Array.from({ length: numDays }, (_, i) =>
      formatDateLabel(addDays(startDate, i), sameYear)
    );

    const series: UserSeriesLine[] = config.series.map((s, idx) => {
      const values: number[] = [];
      for (let row = 4; row < 4 + numDays; row++) {
        const cell = getCell(sheet, row, s.col);
        values.push(cell ? Number(cell.v) : 0);
      }
      return { id: `${key}_${s.label}`, label: s.label, values, color: LINE_COLORS[idx % LINE_COLORS.length] };
    });

    const chartData = dateLabels.map((date, i) => {
      const point: Record<string, string | number> = { date };
      series.forEach(s => { point[s.id] = s.values[i] ?? 0; });
      return point;
    });

    results.push({ sheetKey: key, displayName: config.displayName, startDate, endDate, dateLabels, series, chartData });
  }

  results.sort((a, b) => USER_SHEET_ORDER.indexOf(a.sheetKey) - USER_SHEET_ORDER.indexOf(b.sheetKey));
  return results;
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
  const [viewMode, setViewMode]     = useState<"count" | "revenue">("count");
  const [topN, setTopN]             = useState<number | null>(null);
  const [refDateInput, setRefDateInput] = useState("");
  const [yAxisFixed, setYAxisFixed] = useState(true);

  const refLabel = useMemo(() =>
    data ? resolveRefLabel(refDateInput, data.dateLabels, data.startDate, data.endDate) : null,
    [refDateInput, data]
  );

  // 라인별 통계 (전체 / 구분선 기준 이전·이후)
  const lineStats = useMemo((): Map<string, LineStats> => {
    if (!data) return new Map();
    const refIdx = refLabel ? data.dateLabels.indexOf(refLabel) : -1;
    const map = new Map<string, LineStats>();
    data.lines.forEach(line => {
      const price = line.aosPrice ?? line.gemPrice ?? null;
      const totalCount   = line.values.reduce((s, v) => s + v, 0);
      const totalRevenue = price !== null ? totalCount * price : null;
      let beforeCount: number | null = null, afterCount: number | null = null;
      let beforeRevenue:  number | null = null, afterRevenue:  number | null = null;
      if (refIdx >= 0) {
        beforeCount   = line.values.slice(0, refIdx).reduce((s, v) => s + v, 0);
        afterCount    = line.values.slice(refIdx).reduce((s, v) => s + v, 0);
        beforeRevenue = price !== null ? beforeCount * price : null;
        afterRevenue  = price !== null ? afterCount  * price : null;
      }
      map.set(line.id, { totalCount, totalRevenue, beforeCount, afterCount, beforeRevenue, afterRevenue });
    });
    return map;
  }, [data, refLabel]);

  // 매출 모드 전체 합계 (visible 항목만)
  const totalVisibleRevenue = useMemo(() => {
    if (!data || viewMode !== "revenue") return null;
    return data.lines
      .filter(l => visible.has(l.id))
      .reduce((sum, line) => {
        const price = line.aosPrice ?? line.gemPrice ?? null;
        if (price === null) return sum;
        return sum + line.values.reduce((s, v) => s + v, 0) * price;
      }, 0);
  }, [data, viewMode, visible]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setTopN(null);
    setViewMode("count");
    setRefDateInput("");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSalesFile(buffer, goodsMap);

      // goodsMap에 있지만 xlsx에 없는 상품 → 0값 라인으로 추가
      const existingNames = new Set(parsed.lines.map(l => l.eventLogName));
      const zeroLines: DataLine[] = [];
      goodsMap.forEach((good, logName) => {
        if (existingNames.has(logName)) return;
        zeroLines.push({
          id:           `zero_${logName}`,
          eventLogName: logName,
          label:        good.index_dev ?? logName,
          color:        LINE_COLORS[(parsed.lines.length + zeroLines.length) % LINE_COLORS.length],
          values:       new Array(parsed.dateLabels.length).fill(0),
          gemPrice:     good.gem_price  ?? null,
          aosPrice:     good.aos_price  ?? null,
        });
      });

      if (zeroLines.length > 0) {
        const allLines = [...parsed.lines, ...zeroLines];
        parsed.lines = allLines;
        parsed.chartData = parsed.dateLabels.map((date, i) => {
          const point: Record<string, string | number> = { date };
          allLines.forEach(line => { point[line.id] = line.values[i] ?? 0; });
          return point;
        });
      }

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

  // Y축 최댓값 고정 (전체 라인 기준, 표시 여부 무관)
  const yAxisMax = useMemo(() => {
    if (!data || displayChartData.length === 0) return undefined;
    let max = 0;
    for (const point of displayChartData) {
      for (const line of data.lines) {
        const v = (point[line.id] as number) ?? 0;
        if (v > max) max = v;
      }
    }
    return max > 0 ? max : undefined;
  }, [data, displayChartData]);

  // 그룹화: eventLogName 마지막 _숫자 제거 → 동일 base끼리 묶음
  const groupedLines = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, { key: string; displayName: string; lines: DataLine[] }>();
    for (const line of data.lines) {
      const key = line.eventLogName.replace(/_\d+$/, "");
      if (!groups.has(key)) {
        const labelBase = line.label.includes(" - ")
          ? line.label.split(" - ")[0]
          : line.label;
        const displayName = labelBase.replace(/_\d+$/, "");
        groups.set(key, { key, displayName, lines: [] });
      }
      groups.get(key)!.lines.push(line);
    }
    return Array.from(groups.values());
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

  const toggleGroup = (ids: string[], allOn: boolean) => {
    setTopN(null);
    setVisible(prev => {
      const s = new Set(prev);
      if (allOn) ids.forEach(id => s.delete(id));
      else ids.forEach(id => s.add(id));
      return s;
    });
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
            {/* 뷰 모드 토글 + 전체 매출 + 구분선 날짜 */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
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
              {totalVisibleRevenue !== null && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg">
                  전체 {formatRevenue(totalVisibleRevenue)}
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setYAxisFixed(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    yAxisFixed
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  Y축 고정
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500">구분선</span>
                <input
                  type="date"
                  value={refDateInput}
                  onChange={(e) => setRefDateInput(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                {refDateInput && (
                  <button onClick={() => setRefDateInput("")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                )}
                {refDateInput && !refLabel && (
                  <span className="text-[11px] text-amber-500">범위 밖</span>
                )}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={displayChartData} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
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
                  domain={yAxisFixed ? [0, yAxisMax ?? "auto"] : [0, "auto"]}
                />
                <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="plainline"
                  iconSize={16}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  formatter={(value) => (
                    <span style={{ color: "inherit" }}>{value}</span>
                  )}
                />
                {refLabel && (
                  <ReferenceLine x={refLabel} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} />
                )}
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

            {/* 수직 목록 (그룹별) */}
            <div className="flex flex-col max-h-96 overflow-y-auto pr-1">
              {groupedLines.map(({ key: groupKey, displayName, lines: groupLines }) => {
                const groupIds = groupLines.map(l => l.id);
                const allOn = groupIds.every(id => visible.has(id));
                return (
                  <div key={groupKey} className="mb-3">
                    {/* 그룹 헤더 */}
                    <div className="flex items-center gap-2 px-1 py-1 border-b border-gray-100 dark:border-gray-700 mb-1">
                      <button
                        onClick={() => toggleGroup(groupIds, allOn)}
                        className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:underline flex-shrink-0"
                      >
                        {allOn ? "해제" : "선택"}
                      </button>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">{displayName}</span>
                      {groupLines.length > 1 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">({groupLines.length})</span>
                      )}
                    </div>
                    {/* 그룹 항목 */}
                    {groupLines.map(line => {
                      const on = visible.has(line.id);
                      return (
                        <label key={line.id} className="flex items-center gap-2 cursor-pointer py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 px-1 pl-4">
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
                          <div className={`min-w-0 transition-colors ${on ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"}`}>
                            <div className="flex items-baseline gap-1.5">
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
                            {(() => {
                              const st = lineStats.get(line.id);
                              if (!st) return null;
                              if (!refLabel) {
                                return (
                                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                    {st.totalCount.toLocaleString()}개
                                    {st.totalRevenue !== null && ` · ${formatRevenue(st.totalRevenue)}`}
                                  </div>
                                );
                              }
                              const bc = st.beforeCount!, ac = st.afterCount!;
                              const br = st.beforeRevenue, ar = st.afterRevenue;
                              const cntPct = pctChange(bc, ac);
                              const cntColor = ac >= bc ? "text-green-500" : "text-red-500";
                              return (
                                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 space-y-0.5">
                                  <div>
                                    판매: {bc.toLocaleString()} → {ac.toLocaleString()}개
                                    <span className={`ml-1 font-medium ${cntColor}`}>{cntPct}</span>
                                  </div>
                                  {br !== null && ar !== null && (
                                    <div>
                                      매출: {formatRevenue(br)} → {formatRevenue(ar)}
                                      <span className={`ml-1 font-medium ${cntColor}`}>{pctChange(br, ar)}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 유저 시트 차트 ───────────────────────────────────────────────────────────

function UserSheetChart({
  sheet, visible, onToggle, onSet, refDateInput,
}: {
  sheet:        UserSheetData;
  visible:      Set<string>;
  onToggle:     (id: string) => void;
  onSet:        (ids: Set<string>) => void;
  refDateInput: string;
}) {
  const xInterval = Math.max(0, Math.ceil(sheet.dateLabels.length / 8) - 1);
  const allOn = sheet.series.every(s => visible.has(s.id));
  const refLabel = resolveRefLabel(refDateInput, sheet.dateLabels, sheet.startDate, sheet.endDate);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{sheet.displayName}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatFullDate(sheet.startDate)} ~ {formatFullDate(sheet.endDate)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={sheet.chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
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
            width={56}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip viewMode="count" />} />
          {refLabel && (
            <ReferenceLine x={refLabel} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          {sheet.series
            .filter(s => visible.has(s.id))
            .map(s => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                name={s.label}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {sheet.series.map(s => {
          const on = visible.has(s.id);
          return (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(s.id)}
                className="w-3.5 h-3.5 rounded cursor-pointer"
                style={{ accentColor: s.color }}
              />
              <div className="w-5 h-0.5 rounded-full transition-colors" style={{ backgroundColor: on ? s.color : "#d1d5db" }} />
              <span className={`text-xs font-medium transition-colors ${on ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"}`}>
                {s.label}
              </span>
            </label>
          );
        })}
        <button
          onClick={() => onSet(allOn ? new Set() : new Set(sheet.series.map(s => s.id)))}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-auto"
        >
          {allOn ? "전체 해제" : "전체 선택"}
        </button>
      </div>
    </div>
  );
}

// ─── 유저 수 탭 ───────────────────────────────────────────────────────────────

function UserCountTab() {
  const [sheets, setSheets]   = useState<UserSheetData[]>([]);
  const [visible, setVisible] = useState<Record<string, Set<string>>>({});
  const [error, setError]     = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [refDateInput, setRefDateInput] = useState("");

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setRefDateInput("");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseUserFile(buffer);
      if (parsed.length === 0) throw new Error("인식된 시트가 없습니다.");
      setSheets(parsed);
      const vis: Record<string, Set<string>> = {};
      parsed.forEach(s => { vis[s.sheetKey] = new Set(s.series.map(sr => sr.id)); });
      setVisible(vis);
    } catch (e) {
      setError("파일 파싱 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.");
      console.error(e);
    }
  }, []);

  const handleToggle = (sheetKey: string, seriesId: string) =>
    setVisible(prev => {
      const s = new Set(prev[sheetKey]);
      s.has(seriesId) ? s.delete(seriesId) : s.add(seriesId);
      return { ...prev, [sheetKey]: s };
    });

  const handleSet = (sheetKey: string, ids: Set<string>) =>
    setVisible(prev => ({ ...prev, [sheetKey]: ids }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">유저 수 분석</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">DAU, 신규 유저, 리텐션, WAU/MAU 비율을 시트별로 표시합니다.</p>
      </div>

      <UploadArea onFile={handleFile} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {sheets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
          <span>📋 {fileName} · {sheets.length}개 시트 로드됨</span>
          <div className="flex items-center gap-2 ml-auto">
            <span>구분선</span>
            <input
              type="date"
              value={refDateInput}
              onChange={(e) => setRefDateInput(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {refDateInput && (
              <button onClick={() => setRefDateInput("")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            )}
          </div>
        </div>
      )}

      {sheets.map(sheet => (
        <UserSheetChart
          key={sheet.sheetKey}
          sheet={sheet}
          visible={visible[sheet.sheetKey] ?? new Set()}
          onToggle={(id) => handleToggle(sheet.sheetKey, id)}
          onSet={(ids) => handleSet(sheet.sheetKey, ids)}
          refDateInput={refDateInput}
        />
      ))}
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
            {activeTab === "users"   && <UserCountTab />}
            {activeTab === "revenue" && <PlaceholderTab label="매출" />}
          </>
        )}
      </main>

    </div>
  );
}
