"use client";
import React from "react";

interface UploadButtonProps {
  onUpload?: (files: File[]) => void; // menerima array of files
}

const UploadButton: React.FC<UploadButtonProps> = ({ onUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files; // ini FileList | null
    if (fileList && onUpload) {
      const filesArray = Array.from(fileList); // konversi FileList → File[]
      onUpload(filesArray);
    }
  };

  return (
    <div>
      <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700 transition">
        Upload Excel
        <input
          type="file"
          accept=".xlsx, .xls"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
};

export default UploadButton;
