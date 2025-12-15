"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UploadButton from "../components/uploadButton";
import { parseExcel } from "@/lib/excelParser";
import { useData } from "@/context/dataContext";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const {
    user,
    loading,
    setData,
    fileNames,
    setFileNames,
    uploadFiles,
  } = useData();
  const router = useRouter();

  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (loading) {
      return; // Wait until the loading is complete
    }
    if (!user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleDownload = (fileName: string) => {
    const stored = localStorage.getItem("uploadedFilesSupabase");
    if (!stored) return;

    const files = JSON.parse(stored);
    const file = files.find((f: any) => f.name === fileName);
    if (!file) return;

    window.open(file.url, "_blank");
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const navItems = [
    {
      href: "/summary",
      title: "Executive Summary",
      desc: "Laporan utama dan grafik umum",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      href: "/yoy",
      title: "Year On Year",
      desc: "Perbandingan antar tahun",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3M3.75 14.25v-1.5c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v1.5m-3.75 0h3.75m-3.75 0h3.75m9.75 0v-1.5c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v1.5m-3.75 0h3.75M14.25 3.75h3.75m-3.75 0h.008v.008h-.008V3.75Zm-3.75 0h.008v.008h-.008V3.75Zm-3.75 0h.008v.008h-.008V3.75Z" />
        </svg>
      ),
    },
    {
      href: "/bebanUsaha",
      title: "Beban Usaha",
      desc: "Analisis beban dan pengeluaran",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0h1.5m-1.5 0h.75m0 0v7.5m0 0h7.5m0 0v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m.75 0v-7.5m0 0h-7.5m-1.5 16.5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h1.5a3 3 0 0 1 3 3v.75m0 0v-1.5a.75.75 0 0 0-.75-.75H3.75m15 15a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h1.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-1.5Zm-6.75-9a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75h-3Z" />
        </svg>
      ),
    },
    {
      href: "/ringkasanKinerja",
      title: "Ringkasan Kinerja Operasi",
      desc: "Perbandingan indikator operasional",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75H9.008v.008H9v-.008Zm.75 0H10.5v.008h-.75V12.75Zm.75 0H12v.008h-.75V12.75Zm.75 0H13.5v.008h-.75V12.75Zm.75 0H15v.008h-.75V12.75Zm3-3H18v.008h-.75V9.75Zm.75 0h.75v.008h-.75V9.75Zm-.75 0H18v.008h-.75V9.75Zm.75 0h.75v.008h-.75V9.75Zm-3 3h.75v.008h-.75V12.75Zm-9 3.75h.75v.008H6v-.008Zm.75 0h.75v.008H6.75v-.008Zm.75 0h.75v.008H7.5v-.008Zm.75 0h.75v.008H8.25v-.008Zm.75 0h.75v.008H9v-.008Zm.75 0h.75v.008h-.75V16.5Zm-6-9h.75v.008H6V7.5Zm.75 0h.75v.008H6.75V7.5Zm.75 0h.75v.008H7.5V7.5Zm.75 0h.75v.008H8.25V7.5Zm.75 0h.75v.008H9V7.5Zm.75 0h.75v.008h-.75V7.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h15.75c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 19.875v-6.75ZM19.5 3.75v6.75a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V3.75m15 0a1.125 1.125 0 0 0-1.125-1.125H5.25A1.125 1.125 0 0 0 4.125 3.75m15 0v-.375c0-.621-.504-1.125-1.125-1.125H5.25A1.125 1.125 0 0 0 4.125 3.375v.375" />
        </svg>
      ),
    },
    {
      href: "/finance",
      title: "Finance",
      desc: "Rasio dan kinerja keuangan",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0h1.5m-1.5 0h.75m0 0v7.5m0 0h7.5m0 0v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m.75 0v-7.5m0 0h-7.5m-1.5 16.5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h1.5a3 3 0 0 1 3 3v.75m0 0v-1.5a.75.75 0 0 0-.75-.75H3.75m15 15a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h1.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-1.5Zm-6.75-9a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75h-3Z" />
        </svg>
      ),
    },
  ];

  if (user === "Direksi") {
    navItems.push({
      href: "/settings",
      title: "Settings",
      desc: "Pengaturan dan upload data",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226l.05-.022c.557-.236 1.287-.09 1.745.385l.058.073a.75.75 0 0 0 .886.403l.068-.02a1.875 1.875 0 0 1 1.985 1.985l-.02.068a.75.75 0 0 0 .403.886l.073.058c.475.457.62 1.17.385 1.745l-.022.05c-.223.55-.684 1.02-1.226 1.11a.751.751 0 0 0-.445.445c-.09.542-.56 1.003-1.11 1.226l-.05.022c-.557.236-1.287.09-1.745-.385l-.058-.073a.75.75 0 0 0-.886-.403l-.068.02a1.875 1.875 0 0 1-1.985-1.985l.02-.068a.75.75 0 0 0-.403-.886l-.073-.058c-.475-.457-.62-1.17-.385-1.745l.022-.05c.223-.55.684-1.02 1.226-1.11a.751.751 0 0 0 .445-.445ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
        </svg>
      ),
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-10 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center mb-6">
  <Image
    src="/logo.png"
    alt="Logo Perusahaan"
    width={220}
    height={220}
    className="mb-4 ml-12"
    priority
  />

  <h1 className="text-4xl font-extrabold text-center text-slate-900">
    Executive Information System Dashboard
  </h1>
</div>

      {user === "Admin" && (
  <div
    className={`
      mt-4 rounded-xl p-6 transition-all duration-300
      ${
        uploadSuccess
          ? "bg-green-50 border border-green-400"
          : "bg-white border border-dashed border-slate-300"
      }
    `}
  >
    {!uploadSuccess ? (
      <UploadButton
        onUpload={async (files) => {
          await uploadFiles(files);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 4000);
        }}
      />
    ) : (
      <div className="flex items-center justify-center gap-4 animate-[fadeIn_0.4s_ease-out]">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg animate-[scaleIn_0.3s_ease-out]">
          ✓
        </div>
        <div className="text-left">
          <p className="font-semibold text-green-700">
            Upload berhasil
          </p>
          <p className="text-sm text-green-600">
            Data dashboard telah diperbarui
          </p>
        </div>
      </div>
    )}
  </div>
)}

      {fileNames.length > 0 && (
        <div className="mt-4 text-sm text-slate-600 text-center">
          <p className="font-medium mb-1">File berhasil terunggah:</p>
          <ul className="list-disc list-inside">
            {(fileNames || []).slice(0, 2).map((name, i) => (
              <li key={i}>
                {name}
                <button
                  onClick={() => handleDownload(name)}
                  className="text-blue-600 underline ml-2"
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid navigasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 w-full max-w-5xl">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-blue-200 rounded-2xl shadow-md p-6 flex flex-col items-center text-center transition transform hover:scale-105 hover:shadow-lg"
          >
            {item.icon}
            <h2 className="font-semibold text-lg text-slate-900 mb-2">{item.title}</h2>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
