import type { ExpenseCategory } from "@/types/database";

export const CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Other",
];

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  Food: "🍕",
  Transport: "🚗",
  Shopping: "🛍",
  Bills: "📄",
  Entertainment: "🎬",
  Health: "💊",
  Other: "📦",
};

export function isValidCategory(value: string): value is ExpenseCategory {
  return CATEGORIES.includes(value as ExpenseCategory);
}
