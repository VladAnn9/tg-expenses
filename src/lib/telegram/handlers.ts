import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import type { AppContext } from "./bot";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, ExpenseCategory } from "@/types/database";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import {
  parseTextExpense,
  parseVoiceExpense,
  parseReceiptImage,
  isParseError,
  isParsedIncome,
  normalizeMerchant,
  generateRoast,
} from "@/lib/ai/gemini";
import { nanoid } from "nanoid";
import {
  createPending,
  getPending,
  updatePending,
  deletePending,
  setAwaitingField,
  findAwaitingByTelegramUser,
  clearAwaiting,
  createUndo,
  getUndo,
  deleteUndo,
  tryRecordUpdate,
  type PendingItem,
} from "./pending-store";

type TelegramLinkRequest =
  Database["public"]["Tables"]["telegram_link_requests"]["Row"];

// ---- Helpers ----

async function findUserByTelegramId(telegramId: number) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, household_id, roast_enabled")
    .eq("telegram_id", telegramId)
    .single();
  return data;
}

async function getUserPrimaryAccount(
  userId: string,
  householdId?: string | null,
) {
  const supabase = createAdminClient();

  // Household members share accounts — query by household, not user
  const filterCol = householdId ? "household_id" : "user_id";
  const filterVal = householdId ?? userId;

  const { data } = await supabase
    .from("accounts")
    .select("id, name")
    .eq(filterCol, filterVal)
    .eq("is_primary", true)
    .limit(1)
    .single();
  if (data) return data;
  // Fallback to first account
  const { data: fallback } = await supabase
    .from("accounts")
    .select("id, name")
    .eq(filterCol, filterVal)
    .order("created_at")
    .limit(1)
    .single();
  return fallback;
}

async function getUserSubcategories(
  userId: string,
  householdId?: string | null,
): Promise<string[]> {
  const supabase = createAdminClient();
  const query = householdId
    ? supabase
        .from("subcategories")
        .select("name")
        .eq("household_id", householdId)
    : supabase.from("subcategories").select("name").eq("created_by", userId);
  const { data } = await query;
  return (data ?? []).map((s) => s.name);
}

async function getFrequentSubcategories(
  parentCategory: ExpenseCategory,
  userId: string,
  householdId: string | null,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = createAdminClient();
  const query = householdId
    ? supabase
        .from("subcategories")
        .select("id, name")
        .eq("parent_category", parentCategory)
        .eq("household_id", householdId)
    : supabase
        .from("subcategories")
        .select("id, name")
        .eq("parent_category", parentCategory)
        .eq("created_by", userId);
  const { data: subs } = await query;
  if (!subs || subs.length === 0) return [];

  const withCounts = await Promise.all(
    subs.map(async (sub) => {
      const { count } = await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("subcategory_id", sub.id);
      return { id: sub.id, name: sub.name, count: count ?? 0 };
    }),
  );
  return withCounts
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ id, name }) => ({ id, name }));
}

async function findExistingSubcategory(
  name: string,
  parentCategory: ExpenseCategory,
  userId: string,
  householdId: string | null,
): Promise<string | null> {
  const supabase = createAdminClient();
  const query = householdId
    ? supabase
        .from("subcategories")
        .select("name")
        .eq("parent_category", parentCategory)
        .eq("household_id", householdId)
        .ilike("name", name)
    : supabase
        .from("subcategories")
        .select("name")
        .eq("parent_category", parentCategory)
        .eq("created_by", userId)
        .ilike("name", name);
  const { data } = await query.limit(1).single();
  return data?.name ?? null;
}

async function getKnownMerchants(
  householdId: string | null,
): Promise<string[]> {
  const supabase = createAdminClient();
  if (householdId) {
    const { data } = await supabase
      .from("merchant_aliases")
      .select("canonical_name")
      .eq("household_id", householdId);
    return [...new Set((data ?? []).map((m) => m.canonical_name))];
  }
  return [];
}

async function storeMerchantAlias(
  variant: string,
  canonical: string,
  householdId: string | null,
) {
  if (variant.toLowerCase() === canonical.toLowerCase()) return;
  const supabase = createAdminClient();
  await supabase
    .from("merchant_aliases")
    .upsert(
      {
        variant: variant.toLowerCase(),
        canonical_name: canonical,
        household_id: householdId,
      },
      { onConflict: "variant,household_id" },
    );
}

async function ensureSubcategory(
  name: string,
  parentCategory: ExpenseCategory,
  userId: string,
  householdId: string | null,
): Promise<string | null> {
  if (!name) return null;
  const supabase = createAdminClient();
  // Check existing
  const { data: existing } = await supabase
    .from("subcategories")
    .select("id")
    .eq("name", name)
    .eq("parent_category", parentCategory)
    .limit(1)
    .single();
  if (existing) return existing.id;
  // Create new
  const { data: created } = await supabase
    .from("subcategories")
    .insert({
      name,
      parent_category: parentCategory,
      household_id: householdId,
      created_by: userId,
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

function formatConfirmation(item: PendingItem): string {
  if (item.type === "income") {
    return `💰 Income: ${item.amount.toFixed(2)} PLN — ${item.source_label || "Income"}`;
  }
  const emoji = CATEGORY_EMOJI[item.category];
  const subcat = item.subcategory ? ` > ${item.subcategory}` : "";
  let line1 = `💰 ${item.amount.toFixed(2)} PLN — ${emoji} ${item.category}${subcat}`;
  const parts: string[] = [];
  if (item.merchant) {
    let merchantText = `📍 ${item.merchant}`;
    if (item.originalMerchant && item.originalMerchant !== item.merchant) {
      merchantText += ` (you typed '${item.originalMerchant}')`;
    }
    parts.push(merchantText);
  }
  parts.push(`📅 ${item.expense_date}`);
  if (parts.length > 0) {
    line1 += `\n${parts.join(" | ")}`;
  }
  return line1;
}

function confirmationKeyboard(pendingId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", `confirm:${pendingId}`)
    .text("✏️ Edit", `edit:${pendingId}`)
    .text("❌ Cancel", `cancel:${pendingId}`);
}

// ---- Register handlers ----

export function registerHandlers(bot: Bot<AppContext>) {
  // Global error handler — log only, never auto-reply (likely fails too).
  bot.catch((err) => {
    const updateId = err.ctx.update.update_id;
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error(
        `[bot] update=${updateId} GrammyError ${e.error_code}: ${e.description}`,
      );
      return;
    }
    if (e instanceof HttpError) {
      console.error(`[bot] update=${updateId} HttpError:`, e);
      return;
    }
    console.error(`[bot] update=${updateId} Unknown error:`, e);
  });

  // /start command — handle deep link tokens
  bot.command("start", async (ctx) => {
    const token = ctx.match;

    if (!token || !token.startsWith("zen_")) {
      const user = await findUserByTelegramId(ctx.from!.id);
      if (user) {
        return ctx.reply(
          "👋 Welcome back to Zen Finance!\n\n" +
            "Log an expense by:\n" +
            "• Typing: `15 coffee` or `Biedronka 87`\n" +
            "• Sending a 🎙 voice memo\n" +
            "• Sending a 📸 receipt photo",
          { parse_mode: "Markdown" },
        );
      }
      return ctx.reply(
        "Welcome! Link your account first at the Zen Finance web app to start tracking expenses.",
      );
    }

    // Deep link token flow
    const supabase = createAdminClient();
    const { data: linkReq } = await supabase
      .from("telegram_link_requests")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single<TelegramLinkRequest>();

    if (!linkReq) {
      return ctx.reply(
        "This link is invalid or has already been used. Generate a new one from the web app.",
      );
    }

    if (new Date(linkReq.expires_at) < new Date()) {
      return ctx.reply(
        "This link has expired. Generate a new one from the web app.",
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ telegram_id: ctx.from!.id })
      .eq("id", linkReq.user_id);

    if (updateError) {
      return ctx.reply(
        "Something went wrong linking your account. Please try again.",
      );
    }

    await supabase
      .from("telegram_link_requests")
      .update({ used_at: new Date().toISOString() })
      .eq("id", linkReq.id);

    return ctx.reply(
      '✅ Account linked! You can now send expenses here.\n\nTry: "15 coffee" or send a voice memo.',
    );
  });

  // Update-id dedup — must run before any side-effectful middleware so
  // Telegram retries (slow handlers, network blips, function timeouts) can't
  // double-process. Pre-check rather than post-success: if the function
  // crashes mid-handler, the update is recorded as processed; the next retry
  // would also be hopeless, so the user re-sends. Standard at-most-once.
  bot.use(async (ctx, next) => {
    const fresh = await tryRecordUpdate(
      ctx.update.update_id,
      ctx.chat?.id ?? null,
    );
    if (!fresh) {
      console.warn(`[bot] duplicate update ${ctx.update.update_id}, skipping`);
      return;
    }
    return next();
  });

  // Profile attach + unlinked-user gate. Now runs for callback_query too so
  // confirm/edit_sub handlers don't have to refetch findUserByTelegramId.
  // /start has its own bot.command handler that runs first; the explicit
  // null branch there handles the unlinked-deep-link case.
  bot.use(async (ctx, next) => {
    if (ctx.message?.text?.startsWith("/start")) return;
    if (!ctx.from) return;

    const user = await findUserByTelegramId(ctx.from.id);
    if (!user) {
      if (ctx.callbackQuery) {
        // Stale buttons after unlink: ack so the spinner clears, do nothing.
        return ctx.answerCallbackQuery({
          text: "Account no longer linked.",
        });
      }
      return ctx.reply(
        'You need to link your Telegram account first.\n\nVisit the Zen Finance web app and click "Link Telegram" to get started.',
      );
    }

    ctx.userProfile = user;
    return next();
  });

  // Callback query handler
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, pendingId] = data.split(":");

    // ---- Undo handler ----
    if (action === "undo") {
      const undoInfo = await getUndo(pendingId);
      if (!undoInfo) {
        return ctx.answerCallbackQuery({
          text: "Nothing to undo or window expired.",
        });
      }
      await ctx.answerCallbackQuery();
      const supabase = createAdminClient();
      await supabase.from("expenses").delete().eq("id", undoInfo.expenseId);
      await deleteUndo(pendingId);
      await ctx.editMessageText("↩️ Expense undone.");
      return;
    }

    if (action === "confirm") {
      const pending = await getPending(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expired. Send a new one." });
      }

      // Ack immediately so the spinner clears, then do the heavy work.
      await ctx.answerCallbackQuery();

      const supabase = createAdminClient();

      if (pending.type === "income") {
        const { error } = await supabase.from("income_entries").insert({
          account_id: pending.accountId,
          amount: pending.amount,
          currency: "PLN",
          source_label: pending.source_label,
          note: pending.note,
          income_date: pending.income_date,
          created_by: pending.userId,
        });
        await deletePending(pendingId);
        if (error) {
          await ctx.editMessageText("⚠️ Couldn't save income — try again.");
          return;
        }
        await ctx.editMessageText(
          `✅ Saved: 💰 ${pending.amount.toFixed(2)} PLN — ${pending.source_label || "Income"}`,
        );
        return;
      }

      // Expense path — userProfile attached by middleware.
      const userProfile = ctx.userProfile!;

      // Ensure subcategory exists
      let subcategoryId: string | null = null;
      if (pending.subcategory) {
        subcategoryId = await ensureSubcategory(
          pending.subcategory,
          pending.category,
          pending.userId,
          userProfile.household_id,
        );
      }

      const { data: savedExpense, error } = await supabase
        .from("expenses")
        .insert({
          account_id: pending.accountId,
          amount: pending.amount,
          currency: "PLN",
          category: pending.category,
          subcategory_id: subcategoryId,
          merchant: pending.merchant,
          note: pending.note,
          source: pending.source,
          transcript: pending.transcript,
          telegram_message_id: ctx.callbackQuery.message?.message_id ?? null,
          expense_date: pending.expense_date,
          created_by: pending.userId,
        })
        .select("id")
        .single();

      await deletePending(pendingId);

      if (error || !savedExpense) {
        await ctx.editMessageText("⚠️ Couldn't save expense — try again.");
        return;
      }

      // Build confirmation message (without roast — roast is async)
      const subcat = pending.subcategory ? ` > ${pending.subcategory}` : "";
      const confirmMsg = `✅ Saved: ${pending.amount.toFixed(2)} PLN — ${CATEGORY_EMOJI[pending.category]} ${pending.category}${subcat}${pending.merchant ? ` at ${pending.merchant}` : ""}`;

      // Store undo intent
      const undoId = nanoid(8);
      await createUndo(undoId, savedExpense.id, ctx.from!.id);

      const undoKeyboard = new InlineKeyboard().text(
        "↩️ Undo (30s)",
        `undo:${undoId}`,
      );

      // Show the saved confirmation immediately so the user can move on.
      const chatId = ctx.chat!.id;
      const messageId = ctx.callbackQuery.message!.message_id;
      await ctx.editMessageText(confirmMsg, { reply_markup: undoKeyboard });

      // Roast is best-effort and runs after the response is flushed —
      // it must NOT block the user from sending the next expense.
      if (userProfile.roast_enabled) {
        const expensePayload = {
          amount: pending.amount,
          category: pending.category,
          subcategory: pending.subcategory,
          merchant: pending.merchant,
          userId: pending.userId,
        };
        after(async () => {
          try {
            const now = new Date();
            const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
            const supabaseAfter = createAdminClient();
            const { data: catExpenses } = await supabaseAfter
              .from("expenses")
              .select("amount")
              .eq("created_by", expensePayload.userId)
              .eq("category", expensePayload.category)
              .gte("expense_date", startDate);
            const monthTotal = (catExpenses ?? []).reduce(
              (s, e) => s + Number(e.amount),
              0,
            );
            const roast = await generateRoast({
              amount: expensePayload.amount,
              category: expensePayload.category,
              subcategory: expensePayload.subcategory,
              merchant: expensePayload.merchant,
              monthCategoryTotal: monthTotal,
              avgCategory: monthTotal,
            });
            if (!roast) return;
            await ctx.api.editMessageText(
              chatId,
              messageId,
              `${confirmMsg}\n"${roast}"`,
              { reply_markup: undoKeyboard },
            );
          } catch (err) {
            console.error("roast generation failed", err);
          }
        });
      }
      return;
    }

    if (action === "cancel") {
      await ctx.answerCallbackQuery();
      await deletePending(pendingId);
      await ctx.editMessageText("❌ Cancelled.");
      return;
    }

    if (action === "edit") {
      const pending = await getPending(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }

      await ctx.answerCallbackQuery();
      const keyboard = new InlineKeyboard()
        .text("Amount", `edit_amount:${pendingId}`)
        .text("Category", `edit_category:${pendingId}`)
        .text("Date", `edit_date:${pendingId}`)
        .row()
        .text("Merchant", `edit_merchant:${pendingId}`)
        .text("Note", `edit_note:${pendingId}`);
      if (pending.type === "expense") {
        const subLabel = pending.subcategory
          ? `Subcategory (${pending.subcategory})`
          : "Subcategory";
        keyboard.row().text(subLabel, `edit_sub:${pendingId}`);
      }
      keyboard.row().text("🔙 Back", `back:${pendingId}`);

      await ctx.editMessageText("What would you like to change?", {
        reply_markup: keyboard,
      });
      return;
    }

    if (action === "back") {
      const pending = await getPending(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(formatConfirmation(pending), {
        reply_markup: confirmationKeyboard(pendingId),
      });
      return;
    }

    if (action === "edit_category") {
      await ctx.answerCallbackQuery();
      const keyboard = new InlineKeyboard();
      for (let i = 0; i < CATEGORIES.length; i++) {
        const cat = CATEGORIES[i];
        keyboard.text(
          `${CATEGORY_EMOJI[cat]} ${cat}`,
          `set_category:${pendingId}:${cat}`,
        );
        if (i % 3 === 2) keyboard.row();
      }
      await ctx.editMessageText("Select category:", {
        reply_markup: keyboard,
      });
      return;
    }

    if (action === "set_category") {
      const [, pid, category] = data.split(":");
      const pending = await getPending(pid);
      if (!pending || pending.type !== "expense") {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }
      await ctx.answerCallbackQuery();
      const oldCategory = pending.category;
      pending.category = category as ExpenseCategory;
      if (oldCategory !== category) {
        pending.subcategory = null;
      }
      await updatePending(pid, pending);
      await ctx.editMessageText(formatConfirmation(pending), {
        reply_markup: confirmationKeyboard(pid),
      });
      return;
    }

    // Subcategory picker
    if (action === "edit_sub") {
      const pending = await getPending(pendingId);
      if (!pending || pending.type !== "expense") {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }
      await ctx.answerCallbackQuery();
      const userProfile = ctx.userProfile!;
      const frequent = await getFrequentSubcategories(
        pending.category,
        pending.userId,
        userProfile.household_id,
      );
      const keyboard = new InlineKeyboard();
      for (let i = 0; i < frequent.length; i++) {
        keyboard.text(
          frequent[i].name,
          `set_sub:${pendingId}:${frequent[i].id}`,
        );
        if (i % 2 === 1) keyboard.row();
      }
      if (frequent.length % 2 === 1) keyboard.row();
      keyboard
        .text("🚫 None", `set_sub:${pendingId}:none`)
        .text("✏️ Type custom", `sub_custom:${pendingId}`)
        .row()
        .text("🔙 Back", `edit:${pendingId}`);
      await ctx.editMessageText("Select subcategory:", {
        reply_markup: keyboard,
      });
      return;
    }

    if (action === "set_sub") {
      const [, pid, subId] = data.split(":");
      const pending = await getPending(pid);
      if (!pending || pending.type !== "expense") {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }
      await ctx.answerCallbackQuery();
      if (subId === "none") {
        pending.subcategory = null;
      } else {
        const supabase = createAdminClient();
        const { data: sub } = await supabase
          .from("subcategories")
          .select("name")
          .eq("id", subId)
          .single();
        pending.subcategory = sub?.name ?? null;
      }
      await updatePending(pid, pending);
      await ctx.editMessageText(formatConfirmation(pending), {
        reply_markup: confirmationKeyboard(pid),
      });
      return;
    }

    if (action === "sub_custom") {
      const pending = await getPending(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }
      await ctx.answerCallbackQuery();
      await setAwaitingField(pendingId, "subcategory");
      await ctx.editMessageText("Type the subcategory name:");
      return;
    }

    // Field editing via text reply
    if (
      action === "edit_amount" ||
      action === "edit_merchant" ||
      action === "edit_note" ||
      action === "edit_date"
    ) {
      const field = action.replace("edit_", "");
      const pending = await getPending(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expired." });
      }
      await ctx.answerCallbackQuery();
      await setAwaitingField(pendingId, field);
      await ctx.editMessageText(
        `Type the new ${field}:${field === "amount" ? " (number)" : field === "date" ? " (YYYY-MM-DD)" : ""}`,
      );
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // Text message handler
  bot.on("message:text", async (ctx) => {
    const userProfile = ctx.userProfile;
    if (!userProfile) return;
    const userId = userProfile.id;

    // Check if this is a reply to an edit prompt
    const editState = await findAwaitingByTelegramUser(ctx.from.id);
    if (editState) {
      const { id: pendingId, field, payload: pending } = editState;
      const value = ctx.message.text.trim();

      if (field === "amount") {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          return ctx.reply("Please enter a valid positive number.");
        }
        pending.amount = num;
      } else if (field === "merchant" && pending.type === "expense") {
        pending.merchant = value;
      } else if (field === "note") {
        pending.note = value;
      } else if (field === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return ctx.reply("Please use YYYY-MM-DD format.");
        }
        if (pending.type === "expense") pending.expense_date = value;
        else pending.income_date = value;
      } else if (field === "subcategory" && pending.type === "expense") {
        if (value.length === 0) {
          return ctx.reply("Please enter a subcategory name.");
        }
        const existing = await findExistingSubcategory(
          value,
          pending.category,
          pending.userId,
          userProfile.household_id ?? null,
        );
        pending.subcategory = existing ?? value;
      }

      await updatePending(pendingId, pending);
      await clearAwaiting(pendingId);

      return ctx.reply(formatConfirmation(pending), {
        reply_markup: confirmationKeyboard(pendingId),
      });
    }

    // AI text parsing
    const account = await getUserPrimaryAccount(
      userId,
      userProfile.household_id,
    );
    if (!account) {
      return ctx.reply(
        "No account found. Please set up your account on the web app first.",
      );
    }

    const subcategories = await getUserSubcategories(
      userId,
      userProfile.household_id,
    );
    const result = await parseTextExpense(ctx.message.text, subcategories);
    if (isParseError(result)) {
      return ctx.reply(
        'I couldn\'t parse that.\n\nTry:\n• "15 coffee"\n• "Groceries 120 at Biedronka"\n• "Salary 8000"',
      );
    }

    const pendingId = nanoid(8);
    const today = new Date().toISOString().split("T")[0];

    let item: PendingItem;
    if (isParsedIncome(result)) {
      item = {
        type: "income",
        amount: result.amount,
        source_label: result.source_label,
        note: result.note,
        income_date: today,
        source: "text",
        userId,
        accountId: account.id,
      };
    } else {
      // Merchant normalization
      let merchant = result.merchant;
      let originalMerchant: string | null = null;
      if (merchant) {
        const knownMerchants = await getKnownMerchants(
          userProfile.household_id,
        );
        const normalized = await normalizeMerchant(merchant, knownMerchants);
        if (normalized.wasNormalized) {
          originalMerchant = merchant;
          merchant = normalized.canonical;
          await storeMerchantAlias(
            originalMerchant,
            normalized.canonical,
            userProfile.household_id,
          );
        }
      }

      item = {
        type: "expense",
        amount: result.amount,
        category: result.category,
        subcategory: result.subcategory,
        merchant,
        originalMerchant,
        note: result.note,
        expense_date: result.date || today,
        source: "text",
        transcript: ctx.message.text,
        userId,
        accountId: account.id,
      };
    }

    await createPending(pendingId, ctx.from.id, item);
    return ctx.reply(formatConfirmation(item), {
      reply_markup: confirmationKeyboard(pendingId),
    });
  });

  // Voice message handler
  bot.on("message:voice", async (ctx) => {
    const userProfile = ctx.userProfile;
    if (!userProfile) return;
    const userId = userProfile.id;

    const account = await getUserPrimaryAccount(
      userId,
      userProfile.household_id,
    );
    if (!account) {
      return ctx.reply("No account found. Set up on the web app first.");
    }

    await ctx.reply("🎙 Transcribing...");

    try {
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const { transcribe } = await import("@/lib/ai/groq");
      const transcript = await transcribe(buffer);

      if (!transcript) {
        return ctx.reply("Couldn't understand the audio. Try typing instead.");
      }

      const subcategories = await getUserSubcategories(
        userId,
        userProfile.household_id,
      );
      const result = await parseVoiceExpense(transcript, subcategories);
      if (isParseError(result)) {
        return ctx.reply(
          `I heard: "${transcript}"\n\nBut couldn't identify an expense or income.`,
        );
      }

      const pendingId = nanoid(8);
      const today = new Date().toISOString().split("T")[0];

      let item: PendingItem;
      if (isParsedIncome(result)) {
        item = {
          type: "income",
          amount: result.amount,
          source_label: result.source_label,
          note: result.note,
          income_date: today,
          source: "voice",
          userId,
          accountId: account.id,
        };
      } else {
        let merchant = result.merchant;
        let originalMerchant: string | null = null;
        if (merchant) {
          const knownMerchants = await getKnownMerchants(
            userProfile.household_id,
          );
          const normalized = await normalizeMerchant(merchant, knownMerchants);
          if (normalized.wasNormalized) {
            originalMerchant = merchant;
            merchant = normalized.canonical;
            await storeMerchantAlias(
              originalMerchant,
              normalized.canonical,
              userProfile.household_id,
            );
          }
        }

        item = {
          type: "expense",
          amount: result.amount,
          category: result.category,
          subcategory: result.subcategory,
          merchant,
          originalMerchant,
          note: result.note,
          expense_date: result.date || today,
          source: "voice",
          transcript,
          userId,
          accountId: account.id,
        };
      }

      await createPending(pendingId, ctx.from.id, item);
      return ctx.reply(formatConfirmation(item), {
        reply_markup: confirmationKeyboard(pendingId),
      });
    } catch (error) {
      console.error("Voice processing error:", error);
      return ctx.reply("Something went wrong. Try typing instead.");
    }
  });

  // Photo message handler (receipt)
  bot.on("message:photo", async (ctx) => {
    const userProfile = ctx.userProfile;
    if (!userProfile) return;
    const userId = userProfile.id;

    const account = await getUserPrimaryAccount(
      userId,
      userProfile.household_id,
    );
    if (!account) {
      return ctx.reply("No account found. Set up on the web app first.");
    }

    await ctx.reply("📸 Reading receipt...");

    try {
      const photos = ctx.message.photo;
      const photo = photos[photos.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString("base64");

      const result = await parseReceiptImage(base64, "image/jpeg");
      if (isParseError(result) || isParsedIncome(result)) {
        return ctx.reply(
          "Couldn't read this as a receipt. Try typing instead.",
        );
      }

      const pendingId = nanoid(8);
      const item: PendingItem = {
        type: "expense",
        amount: result.amount,
        category: result.category,
        subcategory: result.subcategory,
        merchant: result.merchant,
        originalMerchant: null,
        note: result.note,
        expense_date: result.date || new Date().toISOString().split("T")[0],
        source: "receipt",
        transcript: `Amount: ${result.amount}, Merchant: ${result.merchant || "unknown"}`,
        userId,
        accountId: account.id,
      };

      await createPending(pendingId, ctx.from.id, item);
      return ctx.reply(formatConfirmation(item), {
        reply_markup: confirmationKeyboard(pendingId),
      });
    } catch (error) {
      console.error("Receipt processing error:", error);
      return ctx.reply("Something went wrong. Try typing instead.");
    }
  });

  bot.on("message:document", async (ctx) => {
    return ctx.reply("Only photo images are supported for receipts.");
  });
}
