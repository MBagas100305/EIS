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

type DataRow = {
  Period: string;
  SortKey: string;
  Indicator: string;
  ActualNumber: number | null;
  RKAPNumber: number | null;
  Unit?: string;
  SheetName?: string;
  Year?: number;
  Month?: number;
};

export default function BebanUsahaPage(): React.ReactElement {
  const { data, setData } = useData();

  // UI state
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("");
  const [chartType, setChartType] = React.useState<"line" | "bar">("line");

  // Load dari localStorage jika context kosong
  React.useEffect(() => {
    if ((!data || data.length === 0) && typeof window !== "undefined") {
      const stored = localStorage.getItem("excelData");
      if (stored) setData(JSON.parse(stored));
    }
  }, [data, setData]);

  const excelSerialToDate = (serial: number) =>
    new Date(Math.round((serial - 25569) * 86400 * 1000));

  // Normalisasi data
  const typedData: DataRow[] = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    return data.map((d: any) => {
      const clean: Record<string, any> = {};
      Object.keys(d).forEach((key) => (clean[key.trim()] = d[key]));

      let periodRaw = clean["Period"] ?? clean["Periode"] ?? "-";
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
      } as DataRow;
    });
  }, [data]);

  // Tahun dinamis untuk filter tombol
  const years = React.useMemo(() => {
    const set = new Set<string>();
    typedData.forEach((r) => {
      if (r.SortKey && r.SortKey.length >= 4) set.add(r.SortKey.substring(0, 4));
    });
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [typedData]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Apply cut-off untuk ActualNumber bulan setelah bulan berjalan
  const applyCutoff = React.useCallback(
    (rows: DataRow[]) =>
      rows.map((r) => {
        if (r.Year === currentYear && r.Month && r.Month > currentMonth) {
          return { ...r, ActualNumber: null };
        }
        return r;
      }),
    [currentYear, currentMonth]
  );

  const cutoffData = applyCutoff(typedData);

  // Daftar indikator unik
  const indicators = [
    "Beban Pokok Pendapatan",
    "Beban Variable",
    "Beban Tetap Langsung",
    "Pendapatan Tahun Berjalan",
    "Variable Tahun Berjalan",
    "beban Tetap Langsung Berjalan",
  ];

  // Filter indikator berdasarkan search + yearFilter
  const filteredIndicators = React.useMemo(() => {
    return indicators.filter((ind) => {
      const matchSearch = ind.toLowerCase().includes(search.trim().toLowerCase());
      if (!matchSearch) return false;
      if (!yearFilter) return true;
      return typedData.some((r) => r.Indicator === ind && r.SortKey?.startsWith(yearFilter));
    });
  }, [indicators, typedData, search, yearFilter]);

  // KPI summary
  const totalActualAll = cutoffData.reduce((s, r) => s + (Number(r.ActualNumber || 0) || 0), 0);
  const totalRKAPAll = cutoffData.reduce((s, r) => s + (Number(r.RKAPNumber || 0) || 0), 0);
  const overallPct = totalRKAPAll > 0 ? Number(((totalActualAll / totalRKAPAll) * 100).toFixed(2)) : 0;

  // Top 3 indikator
  const topIndicators = React.useMemo(() => {
    return [...indicators]
      .map((ind) => {
        const rows = cutoffData.filter((r) => r.Indicator === ind && (!yearFilter || r.SortKey?.startsWith(yearFilter)));
        const total = rows.reduce((s, r) => s + (Number(r.ActualNumber || 0) || 0), 0);
        return { ind, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [indicators, cutoffData, yearFilter]);

  const formatNumber = (v: any) => {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "-";
    const num = Number(v);
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + " Mil";
    if (abs >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, "") + " Jt";
    if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + " Rb";
    return num.toLocaleString("id-ID");
  };

  // Build chart data
  const buildChartData = React.useCallback(
    (indicator: string) => {
      const rows = cutoffData
        .filter((r) => r.Indicator === indicator)
        .sort((a, b) => (a.SortKey > b.SortKey ? 1 : a.SortKey < b.SortKey ? -1 : 0));
      const filtered = yearFilter ? rows.filter((r) => r.SortKey?.startsWith(yearFilter)) : rows;
      return filtered.map((r) => ({
        month: r.Period,
        current: r.ActualNumber,
        rkap: r.RKAPNumber,
      }));
    },
    [cutoffData, yearFilter]
  );

  const selectedYearLabel = yearFilter ? `(${yearFilter})` : "";

  return (
    <main className="min-h-screen bg-slate-50 p-10 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        <Link href="/" className="text-blue-600 no-underline text-2xl mb-8 block self-start">
          &larr;
        </Link>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 border-l-4 border-l-blue-500 border bg-white rounded-xl p-6 shadow-sm">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800">
            Beban Usaha <span className="text-blue-600">{selectedYearLabel}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ringkasan performa realisasi & RKAP untuk seluruh indikator beban usaha.</p>
        </div>

        {/* KPI */}
        <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total Realisasi</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalActualAll)}</div>
            <div className="text-xs text-slate-400 mt-1">Semua indikator</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total RKAP</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalRKAPAll)}</div>
            <div className="text-xs text-slate-400 mt-1">Semua indikator</div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl p-4 shadow-md border border-blue-700">
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
          {/* Search */}
          <div>
            <label className="text-xs text-slate-500">Cari Indikator</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama indikator..."
              className="mt-1 w-full rounded-xl border p-2 text-sm bg-white text-slate-800
               focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 hover:bg-slate-100 transition-all"
            />
          </div>

          {/* Tahun */}
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

          {/* Chart type */}
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

          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              Hasil filter: <span className="font-semibold text-slate-800">{filteredIndicators.length}</span> indikator
            </div>
          </div>
        </div>
      </div>

      {/* Top indikator */}
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

      {/* Chart per indikator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredIndicators.map((ind) => {
          const chartData = buildChartData(ind);
          if (!chartData || chartData.length === 0) return null;

          const usedMonths = chartData.filter((d) => d.current !== null);
          const totalCurrent = usedMonths.reduce((s, d) => s + (d.current || 0), 0);
          const totalRKAP = usedMonths.reduce((s, d) => s + (d.rkap || 0), 0);
          const capaianPct = totalRKAP > 0 ? ((totalCurrent / totalRKAP) * 100).toFixed(2) : "0";
          // Logic warna sama seperti YoY
          const isBelowTarget = totalCurrent < totalRKAP;
          const actualColor = isBelowTarget ? "#dc2626" : "#16a34a"; // merah/hijau
          const targetColor = "#475569"; // RKAP selalu abu-abu gelap


          return (
            <Card key={ind} className="border-2 border-blue-400/60 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{ind}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Actual: <span className="font-medium">{formatNumber(totalCurrent)}</span> • RKAP: <span className="font-medium">{formatNumber(totalRKAP)}</span>
                    </div>
                  </div>
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
                            tickFormatter={formatNumber}
                            label={{
                              value: "Nilai (Actual / RKAP)",
                              angle: -90,
                              position: "insideLeft",
                              style: { textAnchor: "middle" }
                            }}
                            tick={{ fontSize: 11, fill: "#475569" }}
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
                            formatter={(value, name) => [
                              typeof value === "number" ? formatNumber(value) : value,
                              name === "current" ? "Realisasi" : "RKAP",
                            ]}
                          />

                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />

                          <Line
                            type="monotone"
                            dataKey="current"
                            name="Realisasi"
                            stroke={actualColor}
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />

                          <Line
                            type="monotone"
                            dataKey="rkap"
                            name="RKAP"
                            stroke="#0b60b8"
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
                            tickFormatter={formatNumber}
                            label={{
                              value: "Nilai (Actual / RKAP)",
                              angle: -90,
                              position: "insideLeft",
                              style: { textAnchor: "middle" }
                            }}
                            tick={{ fontSize: 11, fill: "#475569" }}
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
                            formatter={(value, name) => [
                              typeof value === "number" ? formatNumber(value) : value,
                              name === "current" ? "Realisasi" : "RKAP",
                            ]}
                          />

                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />

                          <Bar dataKey="current" name="Realisasi" fill={actualColor} barSize={12} />
                          <Bar dataKey="rkap" name="RKAP" fill="#0b60b8" barSize={8} />
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
