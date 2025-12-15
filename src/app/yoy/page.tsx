"use client";

import Link from "next/link";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/chartCard";

type RawRow = Record<string, unknown>;

type CleanRow = {
  Period: string; // "Jan 2025"
  SortKey: string; // "2025-01"
  Year: number;
  Month: number;
  Indicator: string;
  ActualNumber: number | null; // tahun berjalan (current)
  RKAPNumber: number | null; // tahun lalu (last)
  Unit?: string;
};

type ChartItem = {
  month: string;
  currentYear: number | null;
  lastYear: number | null;
};

export default function YearOnYearPage(): React.ReactElement {
  const { data, setData } = useData();

  // Local UI state (samakan dengan SummaryPage)
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("");
  const [chartType, setChartType] = React.useState<"line" | "bar">("line");

  // Load dari localStorage jika context kosong
  React.useEffect(() => {
    if ((!data || (Array.isArray(data) && data.length === 0)) && typeof window !== "undefined") {
      const stored = localStorage.getItem("excelData");
      if (stored) setData(JSON.parse(stored));
    }
  }, [data, setData]);

  // Konversi serial Excel → Date JS
  const excelSerialToDate = (serial: number) =>
    new Date(Math.round((serial - 25569) * 86400 * 1000));

  // Normalisasi data Excel → CleanRow[]
  const typedData: CleanRow[] = React.useMemo(() => {
    try {
      return (data as RawRow[]).map((d) => {
        const clean: Record<string, any> = {};
        Object.keys(d).forEach((key) => (clean[key.trim()] = (d as any)[key]));

        const periodRaw = clean["Period"] ?? clean["Periode"] ?? "-";
        // defensif: jika periodRaw bukan number, coba parse as string date
        let dateObj: Date;
        if (!isNaN(Number(periodRaw))) {
          dateObj = excelSerialToDate(Number(periodRaw));
        } else {
          const parsed = new Date(String(periodRaw));
          dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
        }

        const monthLabel = dateObj.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
        const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

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
      // fallback: kosongkan
      return [];
    }
  }, [data]);

  // Daftar tahun yang ada di data (untuk filter tombol)
  const years = React.useMemo(() => {
    const set = new Set<string>();
    typedData.forEach((r) => {
      if (r.SortKey && r.SortKey.length >= 4) {
        set.add(r.SortKey.substring(0, 4));
      }
    });
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [typedData]);

  // Current month/year for cutoff
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Apply cut-off: jika row adalah bulan setelah bulan berjalan di tahun berjalan -> set ActualNumber = null
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

  // Indicators list (unique)
  const indicators = [
    "Laba",
    "Pendapatan",
    "Volume Penjualan",
    "Pajak Badan",
  ];

  // Filter indikator berdasarkan search + yearFilter (hanya indikator yg punya data sesuai filter)
  const filteredIndicators = React.useMemo(() => {
    return indicators.filter((ind) => {
      const matchSearch = ind.toLowerCase().includes(search.trim().toLowerCase());
      if (!matchSearch) return false;
      if (!yearFilter) return true;
      return typedData.some((r) => r.Indicator === ind && r.SortKey?.startsWith(yearFilter));
    });
  }, [indicators, typedData, search, yearFilter]);

  // --- KPI summary di bagian atas (hanya untuk indikator YoY subset atau seluruh data? ---
  // Kita akan gunakan semua indikator yang ada (consistent dengan SummaryPage)
  const cutoffData = applyCutoff(typedData);

  const totalActualAll = cutoffData.reduce((s, r) => s + (Number(r.ActualNumber || 0) || 0), 0);
  const totalLastAll = cutoffData.reduce((s, r) => s + (Number(r.RKAPNumber || 0) || 0), 0);
  const overallPct = totalLastAll > 0 ? Number(((totalActualAll / totalLastAll) * 100).toFixed(2)) : 0;
  
  // jika masih belum ada data

  // jika masih belum ada data
const noData = !data || (Array.isArray(data) && data.length === 0);

if (noData) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-gray-600 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-2">Belum ada data yang diunggah</h2>
        <p className="text-sm">Silakan kembali ke halaman utama untuk mengunggah file Excel.</p>
      </main>
    );
  }

  // Pilih 3 indikator teratas berdasarkan nominal actual (untuk ringkasan kecil)
  const topIndicators = React.useMemo(() => {
    return [...indicators]
      .map((ind) => {
        const rows = cutoffData.filter((r) => {
          const matchInd = r.Indicator === ind;
          const matchYear = !yearFilter || r.SortKey?.startsWith(yearFilter);
          return matchInd && matchYear;
        });
        const total = rows.reduce((s, r) => s + (Number(r.ActualNumber || 0) || 0), 0);
        return { ind, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [indicators, cutoffData, yearFilter]);

  // Utility: format angka (sama style dengan SummaryPage)
  const formatNumber = (v: any) => {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "-";

    const num = Number(v);
    const abs = Math.abs(num);

    if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + " Mil";
    if (abs >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, "") + " Jt";
    if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + " Rb";
    return num.toLocaleString("id-ID");
  };

  // Group/prepare chart data for a given indicator (like groupByYear)
  const buildChartDataForIndicator = React.useCallback(
    (indicator: string): ChartItem[] => {
      const rows = cutoffData
        .filter((r) => r.Indicator === indicator)
        .sort((a, b) => (a.SortKey > b.SortKey ? 1 : a.SortKey < b.SortKey ? -1 : 0));

      // If yearFilter specified, restrict to that year only (keep month order)
      const filteredRows = yearFilter ? rows.filter((r) => r.SortKey.startsWith(yearFilter)) : rows;

      // Map to chart items
      const chartMap: ChartItem[] = filteredRows.map((r) => ({
        month: r.Period,
        currentYear: r.ActualNumber === null ? null : Number(r.ActualNumber || 0),
        lastYear: r.RKAPNumber === undefined ? null : Number(r.RKAPNumber || 0),
      }));

      return chartMap;
    },
    [cutoffData, yearFilter]
  );

  // Label selectedYear for header
  const selectedYearLabel = yearFilter ? `(${yearFilter})` : "";

  return (
    <main className="min-h-screen bg-slate-50 p-10 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        <Link href="/" className="text-blue-600 no-underline text-2xl mb-8 block self-start">
          &larr;
        </Link>
      {/* Header */}
      <div
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8
  border-l-4 border-l-blue-500 border bg-white rounded-xl p-6 shadow-sm"
      >
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800">
            Year on Year (YoY) <span className="text-blue-600">{selectedYearLabel}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Perbandingan kinerja tahun berjalan dengan tahun sebelumnya.</p>
        </div>

        {/* Top KPIs */}
        <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total Tahun Berjalan</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalActualAll)}</div>
            <div className="text-xs text-slate-400 mt-1">Semua indikator</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total Tahun Lalu</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalLastAll)}</div>
            <div className="text-xs text-slate-400 mt-1">Semua indikator</div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl p-4 shadow-md border border-blue-700">
            <div className="text-xs opacity-90">Capaian Keseluruhan</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-3xl font-bold">{overallPct}%</div>
              <div className="text-sm text-white/80">YoY</div>
            </div>
            <div className="text-xs text-white/80 mt-2">
              {overallPct >= 100 ? "Melebihi tahun lalu" : overallPct >= 80 ? "Mendekati" : "Perlu perhatian"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter & Tampilan</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search indikator */}
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

          {/* Tahun - tombol */}
          <div>
            <label className="text-xs text-slate-500">Tahun</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setYearFilter("")}
                className={`px-3 py-1.5 rounded-xl text-sm border ${yearFilter === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"
                  }`}
              >
                Semua
              </button>

              {years.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setYearFilter(yr)}
                  className={`px-3 py-1.5 rounded-xl text-sm border ${yearFilter === yr ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"
                    }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Jenis grafik */}
          <div>
            <label className="text-xs text-slate-500">Jenis Grafik</label>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 rounded-xl text-sm border ${chartType === "line" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"
                  }`}
              >
                Line
              </button>

              <button
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 rounded-xl text-sm border ${chartType === "bar" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"
                  }`}
              >
                Bar
              </button>
            </div>
          </div>

          {/* Placeholder */}
          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              Hasil filter: <span className="font-semibold text-slate-800">{filteredIndicators.length}</span> indikator
            </div>
          </div>
        </div>
      </div>

      {/* Shortcut top indicators small */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topIndicators.map((t) => (
          <div
            key={t.ind}
            className="bg-white border-2 border-blue-400/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div>
              <div className="text-xs text-slate-500">Top</div>
              <div className="text-lg font-bold text-slate-800">{t.ind}</div>
            </div>
            <div className="text-lg font-semibold text-slate-700">{formatNumber(t.total)}</div>
          </div>
        ))}
      </div>

      {/* Card Grid: render per indikator yang terfilter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredIndicators.map((indicator) => {
          const chartData = buildChartDataForIndicator(indicator);
          if (!chartData || chartData.length === 0) return null;
          const totalActual = cutoffData
            .filter((r) => r.Indicator === indicator && (!yearFilter || r.SortKey.startsWith(yearFilter)))
            .reduce((s, r) => s + (r.ActualNumber || 0), 0);

          const totalRKAP = cutoffData
            .filter((r) => r.Indicator === indicator && (!yearFilter || r.SortKey.startsWith(yearFilter)))
            .reduce((s, r) => s + (r.RKAPNumber || 0), 0);

          // Warna berdasarkan capaian
          const isBelowTarget = totalActual < totalRKAP;
          const actualColor = isBelowTarget ? "#dc2626" : "#16a34a"; // merah/hijau
          const targetColor = "#475569"; // abu-abu gelap


          // compute growth using only months that have currentYear != null
          const usedMonths = chartData.filter((d) => d.currentYear !== null);
          const totalCurrent = usedMonths.reduce((s, d) => s + (d.currentYear || 0), 0);
          const totalLast = usedMonths.reduce((s, d) => s + (d.lastYear || 0), 0);
          const growthPct = totalLast > 0 ? (((totalCurrent - totalLast) / totalLast) * 100).toFixed(2) : "0";
          const growthPositive = Number(growthPct) >= 0;

          return (
            <Card
              key={indicator}
              className="border-2 border-blue-400/60 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{indicator}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Actual: <span className="font-medium">{formatNumber(totalCurrent)}</span> • Tahun Lalu:{" "}
                      <span className="font-medium">{formatNumber(totalLast)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-semibold ${growthPositive ? "text-green-600" : "text-red-600"}`}>
                      {growthPct}%{/* badge growth */}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">YoY (sampai bulan ini)</div>
                  </div>
                </CardTitle>

                {/* tambahan kecil */}
                <div className="mt-2 text-xs text-slate-600">
  <div>
    Total Tahun Berjalan: <span className="font-semibold">{formatNumber(totalActual)}</span>
  </div>
  <div>
    Total Tahun Lalu: <span className="font-semibold">{formatNumber(totalRKAP)}</span>
  </div>
</div>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto chart-box">
                  <div className="min-w-[640px] h-[260px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "line" ? (
                        <LineChart data={chartData} margin={{ top: 5, right: 24, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" />

                          <XAxis
                            dataKey="month"
                            label={{
                              value: "Periode (Bulan)",
                              position: "bottom",
                              offset: 0
                            }}
                            tick={{ fontSize: 12, fill: "#475569" }}
                          />

                          <YAxis
                            width={70}
                            tickFormatter={(v) => formatNumber(v)}
                            label={{
                              value: "Nilai (Actual / RKAP)",
                              angle: -90,
                              position: "insideLeft",
                              style: { textAnchor: "middle" }
                            }}
                            tick={{ fill: "#475569", fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(255, 255, 255, 0.96)",
                              backdropFilter: "blur(6px)",
                              borderRadius: 12,
                              border: "1px solid rgba(226,232,240,0.8)",
                              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)",
                              padding: "8px 10px",
                            }}
                            labelStyle={{ fontSize: 12, fontWeight: 600, color: "#334155" }}
                            itemStyle={{ fontSize: 12, color: "#1e293b" }}
                            formatter={(value: any, name: any) => [
                              typeof value === "number" ? formatNumber(value) : value,
                              name === "currentYear" ? "Tahun Berjalan" : name === "lastYear" ? "Tahun Lalu" : name,
                            ]}
                          />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />

                          <Line
                            type="monotone"
                            dataKey="currentYear"
                            name="Tahun Berjalan"
                            stroke={actualColor}
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="lastYear"
                            name="Tahun Lalu"
                            stroke={targetColor}
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={{ r: 2 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 5, right: 24, left: 10, bottom: 35 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" />

                          <XAxis
                            dataKey="month"
                            label={{
                              value: "Periode (Bulan)",
                              position: "bottom",
                              offset: 20
                            }}
                            tick={{ fontSize: 12, fill: "#475569" }}
                          />

                          <YAxis
                            width={70}
                            tickFormatter={(v) => formatNumber(v)}
                            label={{
                              value: "Nilai (Actual / RKAP)",
                              angle: -90,
                              position: "insideLeft",
                              style: { textAnchor: "middle" }
                            }}
                            tick={{ fill: "#475569", fontSize: 11 }}
                          />

                          <Tooltip
                            contentStyle={{
                              background: "rgba(255, 255, 255, 0.96)",
                              backdropFilter: "blur(6px)",
                              borderRadius: 12,
                              border: "1px solid rgba(226,232,240,0.8)",
                              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)",
                              padding: "8px 10px",
                            }}
                            labelStyle={{ fontSize: 12, fontWeight: 600, color: "#334155" }}
                            itemStyle={{ fontSize: 12, color: "#1e293b" }}
                            formatter={(value: any, name: any) => {
                              const label = name === "currentYear" ? "Tahun Berjalan" : name === "lastYear" ? "Tahun Lalu" : name;
                              return [typeof value === "number" ? formatNumber(value) : value, label];
                            }}
                          />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />

                          <Bar dataKey="currentYear" name="Tahun Berjalan" fill={actualColor} barSize={12} />
                          <Bar dataKey="lastYear" name="Tahun Lalu" fill={targetColor} barSize={8} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>

          
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </main>
  );
}
