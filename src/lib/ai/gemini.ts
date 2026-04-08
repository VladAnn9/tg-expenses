import { GoogleGenAI } from "@google/genai";
import {
  TEXT_EXPENSE_PROMPT,
  VOICE_EXPENSE_PROMPT,
  RECEIPT_PARSING_PROMPT,
  MERCHANT_NORMALIZATION_PROMPT,
  ROAST_PROMPT,
} from "./prompts";
import type { ExpenseCategory } from "@/types/database";
import { isValidCategory } from "@/lib/utils/categories";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ParsedExpense {
  type: "expense";
  amount: number;
  category: ExpenseCategory;
  subcategory: string | null;
  merchant: string | null;
  note: string | null;
  date?: string;
}

export interface ParsedIncome {
  type: "income";
  amount: number;
  source_label: string | null;
  note: string | null;
}

export interface ParseError {
  error: string;
}

export type ParseResult = ParsedExpense | ParsedIncome | ParseError;

function isParseError(result: ParseResult): result is ParseError {
  return "error" in result;
}

function isParsedIncome(result: ParseResult): result is ParsedIncome {
  return "type" in result && result.type === "income";
}

function sanitizeJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned.trim();
}

function validateParsedResult(data: Record<string, unknown>): ParseResult {
  if (data.error) {
    return { error: String(data.error) };
  }

  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "invalid_amount" };
  }

  // Income path
  if (data.type === "income") {
    return {
      type: "income",
      amount,
      source_label: data.source_label ? String(data.source_label) : null,
      note: data.note ? String(data.note) : null,
    };
  }

  // Expense path
  const category = String(data.category || "Other");
  const validCategory = isValidCategory(category) ? category : "Other";

  return {
    type: "expense",
    amount,
    category: validCategory,
    subcategory: data.subcategory ? String(data.subcategory) : null,
    merchant: data.merchant ? String(data.merchant) : null,
    note: data.note ? String(data.note) : null,
    date: data.date ? String(data.date) : undefined,
  };
}

export async function parseTextExpense(
  text: string,
  userSubcategories: string[] = []
): Promise<ParseResult> {
  try {
    const prompt = TEXT_EXPENSE_PROMPT.replace(
      "{user_subcategories}",
      userSubcategories.length > 0 ? JSON.stringify(userSubcategories) : "[]"
    );
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n\nUser message: "${text}"`,
    });

    const responseText = response.text ?? "";
    console.log("[gemini] text raw response:", responseText);
    const json = JSON.parse(sanitizeJsonResponse(responseText));
    return validateParsedResult(json);
  } catch (error) {
    console.error("[gemini] text parse error:", error);
    return { error: "parse_failed" };
  }
}

export async function parseVoiceExpense(
  transcript: string,
  userSubcategories: string[] = []
): Promise<ParseResult> {
  try {
    const prompt = VOICE_EXPENSE_PROMPT.replace(
      "{user_subcategories}",
      userSubcategories.length > 0 ? JSON.stringify(userSubcategories) : "[]"
    );
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n\nTranscription: "${transcript}"`,
    });

    const responseText = response.text ?? "";
    console.log("[gemini] voice raw response:", responseText);
    const json = JSON.parse(sanitizeJsonResponse(responseText));
    return validateParsedResult(json);
  } catch (error) {
    console.error("[gemini] voice parse error:", error);
    return { error: "parse_failed" };
  }
}

export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string
): Promise<ParseResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: RECEIPT_PARSING_PROMPT },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const responseText = response.text ?? "";
    const json = JSON.parse(sanitizeJsonResponse(responseText));

    if (json.error) {
      return { error: String(json.error) };
    }

    const result = validateParsedResult(json);
    if (!isParseError(result) && !isParsedIncome(result) && json.items) {
      result.note = String(json.items);
    }
    return result;
  } catch {
    return { error: "parse_failed" };
  }
}

export async function normalizeMerchant(
  rawMerchant: string,
  knownMerchants: string[]
): Promise<{ canonical: string; wasNormalized: boolean }> {
  // Exact match (case-insensitive) — skip AI
  const exactMatch = knownMerchants.find(
    (m) => m.toLowerCase() === rawMerchant.toLowerCase()
  );
  if (exactMatch) {
    return { canonical: exactMatch, wasNormalized: exactMatch !== rawMerchant };
  }

  if (knownMerchants.length === 0) {
    return { canonical: rawMerchant, wasNormalized: false };
  }

  try {
    const prompt = MERCHANT_NORMALIZATION_PROMPT
      .replace("{known_merchants}", JSON.stringify(knownMerchants))
      .replace("{raw_merchant}", rawMerchant);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text ?? "";
    const json = JSON.parse(sanitizeJsonResponse(responseText));

    if (json.match && json.canonical) {
      return { canonical: String(json.canonical), wasNormalized: true };
    }
    return {
      canonical: json.canonical ? String(json.canonical) : rawMerchant,
      wasNormalized: false,
    };
  } catch (error) {
    console.error("[gemini] merchant normalization error:", error);
    return { canonical: rawMerchant, wasNormalized: false };
  }
}

export async function generateRoast(context: {
  amount: number;
  category: string;
  subcategory: string | null;
  merchant: string | null;
  monthCategoryTotal: number;
  avgCategory: number;
}): Promise<string | null> {
  try {
    const prompt = ROAST_PROMPT
      .replace("{amount}", String(context.amount))
      .replace("{category}", context.category)
      .replace("{subcategory}", context.subcategory || "General")
      .replace("{merchant}", context.merchant || "unknown")
      .replace("{month_category_total}", String(context.monthCategoryTotal))
      .replace("{avg_category}", String(context.avgCategory));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = (response.text ?? "").trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    console.error("[gemini] roast generation error:", error);
    return null;
  }
}

export { isParseError, isParsedIncome };
