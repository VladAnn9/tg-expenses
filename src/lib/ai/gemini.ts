import { GoogleGenAI } from "@google/genai";
import {
  TEXT_EXPENSE_PROMPT,
  VOICE_EXPENSE_PROMPT,
  RECEIPT_PARSING_PROMPT,
} from "./prompts";
import type { ExpenseCategory } from "@/types/database";
import { isValidCategory } from "@/lib/utils/categories";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  merchant: string | null;
  note: string | null;
  date?: string;
}

export interface ParseError {
  error: string;
}

export type ParseResult = ParsedExpense | ParseError;

function isParseError(result: ParseResult): result is ParseError {
  return "error" in result;
}

function sanitizeJsonResponse(text: string): string {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned.trim();
}

function validateParsedExpense(data: Record<string, unknown>): ParseResult {
  if (data.error) {
    return { error: String(data.error) };
  }

  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "invalid_amount" };
  }

  const category = String(data.category || "Other");
  const validCategory = isValidCategory(category) ? category : "Other";

  return {
    amount,
    category: validCategory,
    merchant: data.merchant ? String(data.merchant) : null,
    note: data.note ? String(data.note) : null,
    date: data.date ? String(data.date) : undefined,
  };
}

export async function parseTextExpense(text: string): Promise<ParseResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${TEXT_EXPENSE_PROMPT}\n\nUser message: "${text}"`,
    });

    const responseText = response.text ?? "";
    console.log("[gemini] text raw response:", responseText);
    const json = JSON.parse(sanitizeJsonResponse(responseText));
    return validateParsedExpense(json);
  } catch (error) {
    console.error("[gemini] text parse error:", error);
    return { error: "parse_failed" };
  }
}

export async function parseVoiceExpense(
  transcript: string,
): Promise<ParseResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${VOICE_EXPENSE_PROMPT}\n\nTranscription: "${transcript}"`,
    });

    const responseText = response.text ?? "";
    console.log("[gemini] voice raw response:", responseText);
    const json = JSON.parse(sanitizeJsonResponse(responseText));
    return validateParsedExpense(json);
  } catch (error) {
    console.error("[gemini] voice parse error:", error);
    return { error: "parse_failed" };
  }
}

export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string,
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

    const result = validateParsedExpense(json);
    if (!isParseError(result) && json.items) {
      result.note = String(json.items);
    }
    return result;
  } catch {
    return { error: "parse_failed" };
  }
}

export { isParseError };
