"use client";
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseExcel } from "@/lib/excelParser";

interface DataContextType {
  data: any;
  setData: (data: any) => void;
  user: string | null;
  setUser: (user: string | null) => void;
  loading: boolean;
  fileNames: string[];
  setFileNames: (names: string[]) => void;
  uploadFiles: (files: File[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileNames, setFileNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("userRole");
      if (storedUser) {
        setUser(storedUser);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;

      const { data: files, error: listError } = await supabase.storage
        .from("Uploads")
        .list();

      if (listError || !files || files.length === 0) {
        console.error("Could not list files or no files found:", listError);
        return;
      }

      const sortedFiles = [...files].sort((a, b) =>
        b.name.localeCompare(a.name)
      );
      
      setFileNames(sortedFiles.map((f) => f.name));

      const filesToLoad = sortedFiles.slice(0, 2);
      const allExcelData: any[] = [];

      for (const file of filesToLoad) {
        const { data: blob, error: downloadError } = await supabase.storage
          .from("Uploads")
          .download(file.name);

        if (downloadError || !blob) {
          console.error(`Could not download file ${file.name}:`, downloadError);
          continue;
        }

        const fileObject = new File([blob], file.name);
        try {
          const excelJson = (await parseExcel(fileObject)) as any[];
          allExcelData.push(...excelJson);
        } catch (parseError) {
          console.error(`Error parsing file ${file.name}:`, parseError);
        }
      }
      
      setData(allExcelData);
      localStorage.setItem("excelData", JSON.stringify(allExcelData));
    };

    loadInitialData();
  }, [user, setData, setFileNames]);

  const handleSetUser = useCallback((role: string | null) => {
    setUser(role);
    if (role) {
      localStorage.setItem("userRole", role);
    } else {
      localStorage.removeItem("userRole");
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    const names: string[] = [];
    const uploadedFiles: any[] = [];
    const allExcelData: any[] = [];

    for (const file of files) {
      const newName = `${Date.now()}-${file.name}`;
      names.push(newName);

      const { data: uploadData, error } = await supabase.storage
        .from("Uploads")
        .upload(newName, file);

      if (error) {
        console.error(error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("Uploads")
        .getPublicUrl(newName);

      uploadedFiles.push({
        name: newName,
        url: urlData.publicUrl,
      });

      try {
        const excelJson = (await parseExcel(file)) as any[];
        allExcelData.push(...excelJson);
      } catch (parseError) {
        console.error(`Error parsing file ${file.name}:`, parseError);
      }
    }

    setData(allExcelData);
    localStorage.setItem("excelData", JSON.stringify(allExcelData));

    setFileNames(uploadedFiles.map((f) => f.name));
    localStorage.setItem(
      "uploadedFilesSupabase",
      JSON.stringify(uploadedFiles)
    );
  }, [setData, setFileNames]);

  return (
    <DataContext.Provider
      value={{
        data,
        setData,
        user,
        setUser: handleSetUser,
        loading,
        fileNames,
        setFileNames,
        uploadFiles,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
