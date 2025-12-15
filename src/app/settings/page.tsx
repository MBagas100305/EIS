"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useData } from "@/context/dataContext";
import UploadButton from "@/components/uploadButton";

export default function SettingsPage() {
  const { user, loading, uploadFiles } = useData();
  const router = useRouter();

  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Memuat pengaturan...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="text-blue-600 no-underline text-2xl mb-8 block"
        >
          &larr;
        </Link>

        {/* Header */}
        <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-500">
          <h1 className="text-3xl font-extrabold text-slate-800">
            Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengaturan akun dan manajemen data sistem EIS
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Section */}
          {user === "Direksi" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Manajemen Data
                </h2>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Direksi
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                Unggah file Excel terbaru untuk memperbarui seluruh data pada
                dashboard Executive Information System.
              </p>

              {/* Upload Box */}
              <div
                className={`
                  rounded-xl p-6 transition-all duration-300
                  ${
                    uploadSuccess
                      ? "bg-green-50 border border-green-400"
                      : "bg-slate-50 border border-dashed border-slate-300"
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
                  <div className="flex items-center gap-4 animate-[fadeIn_0.4s_ease-out]">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg animate-[scaleIn_0.3s_ease-out]">
                      ✓
                    </div>
                    <div>
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
            </div>
          )}

          {/* Admin Section */}
          {user === "Admin" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">
                Informasi
              </h2>
              <p className="text-sm text-slate-600">
                Saat ini tidak ada pengaturan khusus yang tersedia untuk peran
                Admin.
              </p>
            </div>
          )}

          {/* Profile Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Informasi Akun
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Role</span>
                <span className="font-medium text-slate-800">{user}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Akses</span>
                <span className="font-medium text-slate-800">
                  {user === "Direksi"
                    ? "Full Dashboard & Upload"
                    : "View Only"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center gap-2 text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Aktif
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
