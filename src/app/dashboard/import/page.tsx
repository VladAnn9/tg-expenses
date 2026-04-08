"use client";

import { useState } from "react";
import CSVUpload from "@/components/import/csv-upload";
import ImportPreview, { type MappedRow } from "@/components/import/import-preview";
import AnimatedSection from "@/components/ui/animated-section";

type Step = "upload" | "map" | "importing" | "done";

interface ImportResult {
  imported: number;
  imported_expenses?: number;
  imported_income?: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParsed = (h: string[], r: Record<string, string>[]) => {
    setHeaders(h);
    setRows(r);
    setStep("map");
  };

  const handleConfirm = async (mappedRows: MappedRow[]) => {
    setStep("importing");
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("map");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <h1 className="font-display text-2xl font-light">Import Expenses</h1>
        <p className="mt-1 text-sm text-ink-light">
          Upload a CSV file to bulk import expenses from another app or bank export.
        </p>
      </AnimatedSection>

      {error && (
        <AnimatedSection delay={0.05}>
          <p className="rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta">
            {error}
          </p>
        </AnimatedSection>
      )}

      {step === "upload" && (
        <AnimatedSection delay={0.1}>
          <CSVUpload onParsed={handleParsed} />
        </AnimatedSection>
      )}

      {step === "map" && (
        <AnimatedSection delay={0.05}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-light">
                {rows.length} rows detected
              </p>
              <button
                onClick={handleReset}
                className="text-sm text-ink-light transition-colors hover:text-ink"
              >
                Upload different file
              </button>
            </div>
            <ImportPreview
              headers={headers}
              rows={rows}
              onConfirm={handleConfirm}
            />
          </div>
        </AnimatedSection>
      )}

      {step === "importing" && (
        <AnimatedSection delay={0.05}>
          <div className="rounded-2xl border border-sand/50 bg-cream p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sand border-t-sage" />
            <p className="mt-4 text-sm text-ink-light">
              Importing {rows.length} rows...
            </p>
          </div>
        </AnimatedSection>
      )}

      {step === "done" && result && (
        <AnimatedSection delay={0.05}>
          <div className="rounded-2xl border border-sand/50 bg-cream p-6 space-y-4">
            <div className="text-center">
              <p className="text-3xl">✅</p>
              <p className="mt-2 font-display text-xl font-light">
                Import Complete
              </p>
            </div>

            <div className="flex justify-center gap-6 text-center">
              {(result.imported_expenses ?? 0) > 0 && (
                <div>
                  <p className="font-display text-2xl font-light text-ink">
                    {result.imported_expenses}
                  </p>
                  <p className="text-xs text-ink-light">Expenses</p>
                </div>
              )}
              {(result.imported_income ?? 0) > 0 && (
                <div>
                  <p className="font-display text-2xl font-light text-sage">
                    {result.imported_income}
                  </p>
                  <p className="text-xs text-ink-light">Income</p>
                </div>
              )}
              {result.skipped > 0 && (
                <div>
                  <p className="font-display text-2xl font-light text-terracotta">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-ink-light">Skipped</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 p-4">
                <p className="text-xs font-medium text-terracotta mb-2">
                  Skipped rows:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-ink-light">
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full rounded-xl border border-sand py-3 text-sm text-ink-light transition-colors hover:bg-mist/50 hover:text-ink"
            >
              Import Another File
            </button>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
