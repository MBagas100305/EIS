import * as XLSX from "xlsx";

export const parseExcel = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const allSheets = workbook.SheetNames.flatMap((sheetName) => {
          const sheet = workbook.Sheets[sheetName];

          // ➜ sheet_to_json() harus diberi type ANY agar bisa di-spread
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

          return rows.map((row) => ({
            ...row,            // ← sudah aman, tidak error lagi
            SheetName: sheetName,
          }));
        });

        resolve(allSheets);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
