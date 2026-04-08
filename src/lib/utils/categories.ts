import type { ExpenseCategory } from "@/types/database";

export const CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Dining",
  "Housing",
  "Bills",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Other",
];

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  Food: "🛒",
  Dining: "🍽️",
  Housing: "🏠",
  Bills: "📄",
  Transport: "🚗",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Health: "💊",
  Other: "📦",
};

export function isValidCategory(value: string): value is ExpenseCategory {
  return CATEGORIES.includes(value as ExpenseCategory);
}
