"use client";

import React from "react";
import { useData } from "@/context/dataContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/chartCard";

type RawRow = Record<string, unknown>;

type CleanRow = {
  Period: string; // "Jan 2025"
  SortKey: string; // "2025-01"
  Year: number;
  Month: number;
  Indicator: string;
  ActualNumber: number | null; // Realisasi
  RKAPNumber: number | null; // Target
  Unit?: string;
};

type ChartItem = {
  month: string;
  currentYear: number | null;
  lastYear: number | null;
};

export default function FinancePage(): React.ReactElement {
  const { data, setData } = useData();

  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("");
  const [chartType, setChartType] = React.useState<"line" | "bar">("line");

  // Ambil data dari localStorage kalau context kosong
  React.useEffect(() => {
    if ((!data || data.length === 0) && typeof window !== "undefined") {
      const stored = localStorage.getItem("excelData");
      if (stored) setData(JSON.parse(stored));
    }
  }, [data, setData]);

  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
        <h2 className="text-xl font-semibold mb-2">
          Belum ada data yang diunggah
        </h2>
        <p>Silakan kembali ke halaman utama untuk mengunggah file Excel.</p>
      </div>
    );
  }

  // Daftar indikator finance
  const indicators = [
    "EBITDA Margin",
    "Net Profit Margin",
    "Return on Equity (ROE)",
    "Rasio Kas (Cash Ratio)",
    "Rasio Lancar (Current Ratio)",
    "Collection Periods",
  ];

  const formatNumber = (v: any) => {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "-";
    const num = Number(v);
    const abs = Math.abs(num);
    if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "%";
    return num.toLocaleString("id-ID");
  };


  // Konversi Excel/Date ke CleanRow[]
  const typedData: CleanRow[] = React.useMemo(() => {
    const excelSerialToDate = (serial: number) =>
      new Date(Math.round((serial - 25569) * 86400 * 1000));

    try {
      return (data as RawRow[]).map((d) => {
        const clean: Record<string, any> = {};
        Object.keys(d).forEach((key) => (clean[key.trim()] = (d as any)[key]));

        const periodRaw = clean["Period"] ?? clean["Periode"] ?? "-";
        let dateObj: Date;
        if (!isNaN(Number(periodRaw))) {
          dateObj = excelSerialToDate(Number(periodRaw));
        } else {
          const parsed = new Date(String(periodRaw));
          dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
        }

        const monthLabel = dateObj.toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        });
        const sortKey = `${dateObj.getFullYear()}-${String(
          dateObj.getMonth() + 1
        ).padStart(2, "0")}`;

        return {
          Period: monthLabel,
          SortKey: sortKey,
          Year: dateObj.getFullYear(),
          Month: dateObj.getMonth() + 1,
          Indicator: String(clean["Indicator"] ?? clean["Indikator"] ?? "-"),
          ActualNumber:
            clean["ActualNumber"] ?? clean["Actual Number"] ?? clean["Actual"] ?? null
              ? Number(clean["ActualNumber"] ?? clean["Actual Number"] ?? clean["Actual"] ?? 0)
              : 0,
          RKAPNumber:
            clean["RKAPNumber"] ?? clean["RKAP Number"] ?? clean["LastYear"] ?? null
              ? Number(clean["RKAPNumber"] ?? clean["RKAP Number"] ?? clean["LastYear"] ?? 0)
              : 0,
          Unit: clean["Unit"] ?? clean["Satuan"] ?? "",
        } as CleanRow;
      });
    } catch (err) {
      return [];
    }
  }, [data]);

  // Daftar tahun
  const years = React.useMemo(() => {
    const set = new Set<string>();
    typedData.forEach((r) => {
      if (r.SortKey && r.SortKey.length >= 4) {
        set.add(r.SortKey.substring(0, 4));
      }
    });
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [typedData]);

  // Current year/month untuk cutoff
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const applyCutoff = React.useCallback(
    (rows: CleanRow[]) =>
      rows.map((r) => {
        if (r.Year === currentYear && r.Month > currentMonth) {
          return { ...r, ActualNumber: null };
        }
        return r;
      }),
    [currentYear, currentMonth]
  );

  const cutoffData = applyCutoff(typedData);

  const filteredIndicators = React.useMemo(
    () =>
      indicators.filter((ind) => {
        const matchSearch = ind.toLowerCase().includes(search.trim().toLowerCase());
        if (!matchSearch) return false;
        if (!yearFilter) return true;
        return typedData.some(
          (r) => r.Indicator === ind && r.SortKey?.startsWith(yearFilter)
        );
      }),
    [indicators, typedData, search, yearFilter]
  );

  // Setelah deklarasi typedData, cutoffData, filteredIndicators
  const filteredCutoffData = React.useMemo(() => {
    // filter cutoffData sesuai indikator yang tampil dan tahun
    return cutoffData.filter(
      (r) =>
        filteredIndicators.includes(r.Indicator) &&
        (!yearFilter || r.SortKey.startsWith(yearFilter))
    );
  }, [cutoffData, filteredIndicators, yearFilter]);

  // ✅ KPI summary
  const totalActualAll = filteredCutoffData.reduce(
    (s, r) => s + (Number(r.ActualNumber || 0) || 0),
    0
  );
  const totalRKAPAll = filteredCutoffData.reduce(
    (s, r) => s + (Number(r.RKAPNumber || 0) || 0),
    0
  );
  const overallPct =
    totalRKAPAll > 0 ? Number(((totalActualAll / totalRKAPAll) * 100).toFixed(2)) : 0;


  const buildChartDataForIndicator = React.useCallback(
    (indicator: string): ChartItem[] => {
      const rows = cutoffData
        .filter((r) => r.Indicator === indicator)
        .sort((a, b) => (a.SortKey > b.SortKey ? 1 : a.SortKey < b.SortKey ? -1 : 0));
      const filteredRows = yearFilter ? rows.filter((r) => r.SortKey.startsWith(yearFilter)) : rows;
      return filteredRows.map((r) => ({
        month: r.Period,
        currentYear: r.ActualNumber === null ? null : Number(r.ActualNumber || 0),
        lastYear: r.RKAPNumber === undefined ? null : Number(r.RKAPNumber || 0),
      }));
    },
    [cutoffData, yearFilter]
  );

  const selectedYearLabel = yearFilter ? `(${yearFilter})` : "";

  return (
    <main className="min-h-screen bg-slate-50 p-10">
      {/* Header + KPI */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8 border-l-4 border-l-blue-500 border bg-white rounded-xl p-6 shadow-sm">
        {/* Judul */}
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-slate-800">
            Ringkasan Finance <span className="text-blue-600">{selectedYearLabel}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Perbandingan realisasi vs RKAP (Target) bulanan.
          </p>
        </div>

        {/* KPI di kanan */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-w-[150px]">
            <div className="text-xs text-slate-500">Total Realisasi</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalActualAll)}</div>
            <div className="text-xs text-slate-400 mt-1">Semua indikator</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-w-[150px]">
            <div className="text-xs text-slate-500">Total RKAP</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalRKAPAll)}</div>
            <div className="text-xs text-slate-400 mt-1">Semua indikator</div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl p-4 shadow-md border border-blue-700 min-w-[150px]">
            <div className="text-xs opacity-90">Capaian Keseluruhan</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-3xl font-bold">{overallPct}%</div>
              <div className="text-sm text-white/80">dari target</div>
            </div>
            <div className="text-xs text-white/80 mt-2">
              {overallPct >= 100 ? "Melebihi target" : overallPct >= 80 ? "Mendekati target" : "Perlu perhatian"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter & Tampilan</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500">Cari Indikator</label>
            <input
              type="text"
              placeholder="Ketik nama indikator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2 text-sm bg-white text-slate-800
               focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500
               hover:bg-slate-100 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Tahun</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setYearFilter("")}
                className={`px-3 py-1.5 rounded-xl text-sm border ${yearFilter === ""
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                  }`}
              >
                Semua
              </button>
              {years.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setYearFilter(yr)}
                  className={`px-3 py-1.5 rounded-xl text-sm border ${yearFilter === yr
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300"
                    }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Jenis Grafik</label>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 rounded-xl text-sm border ${chartType === "line"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                  }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 rounded-xl text-sm border ${chartType === "bar"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                  }`}
              >
                Bar
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              Hasil filter:{" "}
              <span className="font-semibold text-slate-800">
                {filteredIndicators.length}
              </span>{" "}
              indikator
            </div>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredIndicators.map((indicator) => {
          const chartData = buildChartDataForIndicator(indicator);
          if (!chartData || chartData.length === 0) return null;

          // --- Tambahkan ini ---
          const totalActual = chartData.reduce((sum, d) => sum + (d.currentYear || 0), 0);
          const totalRKAP = chartData.reduce((sum, d) => sum + (d.lastYear || 0), 0);
          const capaianPct = totalRKAP > 0 ? ((totalActual / totalRKAP) * 100).toFixed(2) : "0";
          const isBelowTarget = totalActual < totalRKAP;
          // -----------------------

          return (
            <Card key={indicator} className="border-2 border-blue-400/60 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{indicator}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Satuan: {typedData.find((r) => r.Indicator === indicator)?.Unit ?? "Rp"}
                    </div>
                  </div>

                  {/* Tambahkan capaian % di kanan */}
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${isBelowTarget ? "text-red-600" : "text-green-600"}`}>
                      {capaianPct}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Capaian vs RKAP</div>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="w-full overflow-x-auto chart-box">
                  <div className="min-w-[640px] h-[260px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "line" ? (
                        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" />
                          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#475569" }} />
                          <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
                          <Tooltip
                            formatter={(value, name) => [
                              value,
                              name === "currentYear" ? "Realisasi" : "RKAP (Target)",
                            ]}
                          />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="currentYear"
                            name="Realisasi"
                            stroke={isBelowTarget ? "#dc2626" : "#16a34a"} // merah/hijau
                            strokeWidth={3}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="lastYear"
                            name="RKAP (Target)"
                            stroke="#0ea5e9"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 2 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" />
                          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#475569" }} />
                          <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
                          <Tooltip
                            formatter={(value, name) => [
                              value,
                              name === "currentYear" ? "Realisasi" : "RKAP (Target)",
                            ]}
                          />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                          <Bar
                            dataKey="currentYear"
                            name="Realisasi"
                            fill={isBelowTarget ? "#dc2626" : "#16a34a"} // merah/hijau
                            barSize={12}
                          />
                          <Bar
                            dataKey="lastYear"
                            name="RKAP (Target)"
                            fill="#0ea5e9"
                            barSize={8}
                          />

                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center text-xs text-slate-500 mt-2">Sumbu X: Periode • Sumbu Y: Nilai</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
