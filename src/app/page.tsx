"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UploadButton from "../components/uploadButton";
import { parseExcel } from "@/lib/excelParser";
import { useData } from "@/context/dataContext";

export default function Home() {
  const { setData } = useData();
  const [fileNames, setFileNames] = useState<string[]>([]);
  const router = useRouter();

  // Load fileNames dari localStorage saat mount
  useEffect(() => {
    const storedFiles = localStorage.getItem("uploadedFiles");
    if (storedFiles) {
      setFileNames(JSON.parse(storedFiles));
    }
  }, []);

  const handleUpload = async (files: File[]) => {
    // Reset fileNames, replace file lama
    const newFileNames = files.map((file) => file.name);
    setFileNames(newFileNames);

    try {
      const allData: any[] = [];

      for (const file of files) {
        const json = (await parseExcel(file)) as any[];
        allData.push(...json);
      }

      // Simpan ke context & localStorage (replace)
      setData(allData);
      localStorage.setItem("excelData", JSON.stringify(allData));
      localStorage.setItem("uploadedFiles", JSON.stringify(newFileNames));

      console.log("Data saved:", allData);
    } catch (error) {
      console.error("Error parsing Excel:", error);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-10 bg-gradient-to-br from-slate-50 to-slate-100">
      <h1 className="text-4xl font-extrabold mb-6 text-center text-slate-900">
        Executive Information System Dashboard
      </h1>

      <UploadButton onUpload={handleUpload} />

      {fileNames.length > 0 && (
        <div className="mt-4 text-sm text-slate-500 text-center">
          <p className="font-medium mb-1">File berhasil terunggah:</p>
          <ul className="list-disc list-inside">
            {fileNames.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid navigasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 w-full max-w-5xl">
        {[
          { href: "/summary", title: "Executive Summary", desc: "Laporan utama dan grafik umum" },
          { href: "/yoy", title: "Year On Year", desc: "Perbandingan antar tahun" },
          { href: "/bebanUsaha", title: "Beban Usaha", desc: "Analisis beban dan pengeluaran" },
          { href: "/ringkasanKinerja", title: "Ringkasan Kinerja Operasi", desc: "Perbandingan indikator operasional" },
          { href: "/finance", title: "Finance", desc: "Rasio dan kinerja keuangan" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-blue-200 rounded-2xl shadow-md p-6 text-center transition transform hover:scale-105 hover:shadow-lg"
          >
            <h2 className="font-semibold text-lg text-slate-900 mb-2">{item.title}</h2>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
