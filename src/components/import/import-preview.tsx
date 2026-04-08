"use client";

import { useState, useMemo } from "react";
import { CATEGORIES } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

type MappableField = "amount" | "date" | "category" | "merchant" | "note";

const FIELDS: { key: MappableField; label: string; required: boolean }[] = [
  { key: "amount", label: "Amount", required: true },
  { key: "date", label: "Date", required: false },
  { key: "category", label: "Category", required: false },
  { key: "merchant", label: "Merchant", required: false },
  { key: "note", label: "Note", required: false },
];

export interface MappedRow {
  type: "expense" | "income";
  amount: number;
  expense_date?: string;
  category?: string;
  merchant?: string;
  note?: string;
  source_label?: string;
}

interface ImportPreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  onConfirm: (mappedRows: MappedRow[]) => void;
}

function guessMapping(
  headers: string[]
): Record<MappableField, string> {
  const mapping: Record<MappableField, string> = {
    amount: "",
    date: "",
    category: "",
    merchant: "",
    note: "",
  };

  const lower = headers.map((h) => h.toLowerCase().trim());

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (
      !mapping.amount &&
      (h.includes("amount") || h.includes("sum") || h.includes("kwota") || h.includes("value"))
    ) {
      mapping.amount = headers[i];
    } else if (
      !mapping.date &&
      (h.includes("date") || h.includes("data") || h.includes("time"))
    ) {
      mapping.date = headers[i];
    } else if (
      !mapping.category &&
      (h.includes("category") || h.includes("kategoria") || h.includes("type"))
    ) {
      mapping.category = headers[i];
    } else if (
      !mapping.merchant &&
      (h.includes("merchant") || h.includes("store") ||
        h.includes("vendor") || h.includes("sklep") || h.includes("name"))
    ) {
      mapping.merchant = headers[i];
    } else if (
      !mapping.note &&
      (h.includes("note") || h.includes("description") ||
        h.includes("opis") || h.includes("comment") || h.includes("memo"))
    ) {
      mapping.note = headers[i];
    }
  }

  return mapping;
}

function normalizeDate(value: string): string {
  if (!value) return "";
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  // Try DD/MM/YYYY or DD.MM.YYYY
  const dmy = value.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  // Try MM/DD/YYYY
  const mdy = value.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  }
  // Fallback: let Date parse it
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return "";
}

function normalizeCategory(value: string): ExpenseCategory {
  if (!value) return "Other";
  const lower = value.toLowerCase().trim();
  const match = CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match ?? "Other";
}

function parseRawAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export default function ImportPreview({
  headers,
  rows,
  onConfirm,
}: ImportPreviewProps) {
  const [mapping, setMapping] = useState<Record<MappableField, string>>(
    () => guessMapping(headers)
  );

  const updateMapping = (field: MappableField, header: string) => {
    setMapping((prev) => ({ ...prev, [field]: header }));
  };

  const previewRows = useMemo(() => {
    return rows.slice(0, 10).map((row) => {
      const raw = mapping.amount ? parseRawAmount(row[mapping.amount]) : 0;
      const isIncome = raw > 0;
      return {
        type: isIncome ? ("income" as const) : ("expense" as const),
        amount: Math.abs(raw),
        date: mapping.date ? normalizeDate(row[mapping.date]) : "",
        category: !isIncome && mapping.category
          ? normalizeCategory(row[mapping.category])
          : isIncome ? "Income" : "Other",
        merchant: mapping.merchant ? row[mapping.merchant]?.trim() ?? "" : "",
        note: mapping.note ? row[mapping.note]?.trim() ?? "" : "",
      };
    });
  }, [rows, mapping]);

  const handleConfirm = () => {
    const mapped: MappedRow[] = rows.map((row) => {
      const raw = mapping.amount ? parseRawAmount(row[mapping.amount]) : 0;
      const isIncome = raw > 0;
      const merchant = mapping.merchant ? row[mapping.merchant]?.trim() || undefined : undefined;
      const note = mapping.note ? row[mapping.note]?.trim() || undefined : undefined;
      return {
        type: isIncome ? ("income" as const) : ("expense" as const),
        amount: Math.abs(raw),
        expense_date: mapping.date
          ? normalizeDate(row[mapping.date]) || undefined
          : undefined,
        category: !isIncome && mapping.category
          ? normalizeCategory(row[mapping.category])
          : undefined,
        merchant: !isIncome ? merchant : undefined,
        note,
        source_label: isIncome ? (merchant || note || "Import") : undefined,
      };
    });
    onConfirm(mapped);
  };

  const hasAmount = !!mapping.amount;

  return (
    <div className="space-y-6">
      {/* Column Mapping */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-light">Map Columns</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-ink-light">
                {field.label}
                {field.required && (
                  <span className="ml-1 text-terracotta">*</span>
                )}
              </label>
              <select
                value={mapping[field.key]}
                onChange={(e) => updateMapping(field.key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-3 py-2.5 text-sm text-ink focus:border-sage focus:outline-none"
              >
                <option value="">-- Skip --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Table */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-light">
          Preview{" "}
          <span className="text-sm text-ink-light">
            (first {Math.min(10, rows.length)} of {rows.length} rows)
          </span>
        </h3>
        <div className="overflow-x-auto rounded-xl border border-sand/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand/30 bg-mist/30">
                <th className="px-3 py-2 text-left font-medium text-ink-light">
                  Type
                </th>
                <th className="px-3 py-2 text-left font-medium text-ink-light">
                  Amount
                </th>
                <th className="px-3 py-2 text-left font-medium text-ink-light">
                  Date
                </th>
                <th className="px-3 py-2 text-left font-medium text-ink-light">
                  Category
                </th>
                <th className="px-3 py-2 text-left font-medium text-ink-light">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-sand/10 last:border-0"
                >
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                      row.type === "income"
                        ? "bg-sage/10 text-sage"
                        : "bg-mist text-ink-light"
                    }`}>
                      {row.type === "income" ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-medium ${row.type === "income" ? "text-sage" : ""}`}>
                    {row.amount > 0
                      ? `${row.type === "income" ? "+" : ""}${row.amount.toFixed(2)} PLN`
                      : <span className="text-terracotta">--</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-ink-light">
                    {row.date || "--"}
                  </td>
                  <td className="px-3 py-2">
                    {row.type === "income" ? <span className="text-ink-light">--</span> : row.category}
                  </td>
                  <td className="px-3 py-2 text-ink-light truncate max-w-[120px]">
                    {row.note || row.merchant || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!hasAmount}
        className="w-full rounded-xl bg-ink py-3 text-cream transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
      >
        Import {rows.length} Rows
      </button>
      {!hasAmount && (
        <p className="text-center text-sm text-terracotta">
          Please map the Amount column to continue.
        </p>
      )}
    </div>
  );
}
