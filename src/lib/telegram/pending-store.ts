import { createAdminClient } from "@/lib/supabase/admin";
import type { ExpenseCategory } from "@/types/database";

export interface PendingExpense {
  type: "expense";
  amount: number;
  category: ExpenseCategory;
  subcategory: string | null;
  merchant: string | null;
  originalMerchant: string | null;
  note: string | null;
  expense_date: string;
  source: "text" | "voice" | "receipt";
  transcript: string | null;
  userId: string;
  accountId: string;
}

export interface PendingIncome {
  type: "income";
  amount: number;
  source_label: string | null;
  note: string | null;
  income_date: string;
  source: "text" | "voice";
  userId: string;
  accountId: string;
}

export type PendingItem = PendingExpense | PendingIncome;

const nowIso = () => new Date().toISOString();

// ---- Pending CRUD ----

export async function createPending(
  id: string,
  telegramUserId: number,
  payload: PendingItem,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("telegram_pending_items").insert({
    id,
    telegram_user_id: telegramUserId,
    payload: payload as unknown as never,
  });
  if (error) throw error;
}

export async function getPending(id: string): Promise<PendingItem | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_pending_items")
    .select("payload")
    .eq("id", id)
    .gt("expires_at", nowIso())
    .maybeSingle();
  return (data?.payload as unknown as PendingItem | undefined) ?? null;
}

export async function updatePending(
  id: string,
  payload: PendingItem,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("telegram_pending_items")
    .update({ payload: payload as unknown as never })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePending(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("telegram_pending_items").delete().eq("id", id);
}

// ---- Awaiting-field state (replaces editStates Map) ----

export async function setAwaitingField(
  id: string,
  field: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("telegram_pending_items")
    .update({ awaiting_field: field })
    .eq("id", id);
  if (error) throw error;
}

export async function findAwaitingByTelegramUser(
  telegramUserId: number,
): Promise<{ id: string; field: string; payload: PendingItem } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_pending_items")
    .select("id, awaiting_field, payload")
    .eq("telegram_user_id", telegramUserId)
    .not("awaiting_field", "is", null)
    .gt("expires_at", nowIso())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !data.awaiting_field) return null;
  return {
    id: data.id,
    field: data.awaiting_field,
    payload: data.payload as unknown as PendingItem,
  };
}

export async function clearAwaiting(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("telegram_pending_items")
    .update({ awaiting_field: null })
    .eq("id", id);
}

// ---- Undo CRUD ----

export async function createUndo(
  id: string,
  expenseId: string,
  telegramUserId: number,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("telegram_undo_intents").insert({
    id,
    expense_id: expenseId,
    telegram_user_id: telegramUserId,
  });
  if (error) throw error;
}

export async function getUndo(
  id: string,
): Promise<{ expenseId: string } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_undo_intents")
    .select("expense_id")
    .eq("id", id)
    .gt("expires_at", nowIso())
    .maybeSingle();
  return data ? { expenseId: data.expense_id } : null;
}

export async function deleteUndo(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("telegram_undo_intents").delete().eq("id", id);
}
