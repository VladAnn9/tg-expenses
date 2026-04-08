"use client";

import { useState, useRef } from "react";
import { parseCSV } from "@/lib/utils/csv-parser";

interface CSVUploadProps {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void;
}

export default function CSVUpload({ onParsed }: CSVUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setParsing(true);

    try {
      const { headers, rows } = await parseCSV(file);

      if (headers.length === 0) {
        setError("No columns detected in the CSV file.");
        return;
      }

      if (rows.length === 0) {
        setError("The CSV file has no data rows.");
        return;
      }

      onParsed(headers, rows);
    } catch {
      setError("Failed to parse CSV file. Please check the format.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-sand py-12 text-center transition-colors hover:border-sage"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleChange}
          className="hidden"
        />
        <div className="space-y-2">
          <p className="text-3xl">&#128203;</p>
          <p className="text-sm font-medium">
            {parsing
              ? "Parsing..."
              : fileName
                ? fileName
                : "Click to upload CSV"}
          </p>
          <p className="text-xs text-ink-light">
            CSV or TSV files. Delimiter auto-detected.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-terracotta">{error}</p>}
    </div>
  );
}
