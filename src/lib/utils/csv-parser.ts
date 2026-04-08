import Papa from "papaparse";

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const rows = (results.data as Record<string, string>[]).filter(
          (row) => Object.values(row).some((v) => v && v.trim() !== "")
        );
        resolve({ headers, rows });
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}
