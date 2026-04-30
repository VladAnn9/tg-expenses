import type { ExpenseCategory } from "@/types/database";

export const CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Dining",
  "Housing",
  "Bills",
  "Transport",
  "Travel",
  "Sport",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  Food: "🛒",
  Dining: "🍽️",
  Housing: "🏠",
  Bills: "📄",
  Transport: "🚗",
  Travel: "✈️",
  Sport: "🏃",
  Shopping: "🛍️",
  Health: "💊",
  Entertainment: "🎬",
  Other: "📦",
};

export function isValidCategory(value: string): value is ExpenseCategory {
  return CATEGORIES.includes(value as ExpenseCategory);
}
