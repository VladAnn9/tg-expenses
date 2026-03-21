import { Bot, Context, InlineKeyboard } from "grammy";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, ExpenseCategory } from "@/types/database";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import {
  parseTextExpense,
  parseVoiceExpense,
  parseReceiptImage,
  isParseError,
} from "@/lib/ai/gemini";
import { nanoid } from "nanoid";

type TelegramLinkRequest =
  Database["public"]["Tables"]["telegram_link_requests"]["Row"];

// Pending expense store (in-memory, per-process)
interface PendingExpense {
  amount: number;
  category: ExpenseCategory;
  merchant: string | null;
  note: string | null;
  expense_date: string;
  source: "text" | "voice" | "receipt";
  transcript: string | null;
  userId: string;
  accountId: string;
}

const pendingExpenses = new Map<string, PendingExpense>();

// ---- Helpers ----

async function findUserByTelegramId(telegramId: number) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();
  return data;
}

async function getUserDefaultAccount(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data;
}

function formatConfirmation(expense: PendingExpense): string {
  const emoji = CATEGORY_EMOJI[expense.category];
  let text = `💰 New expense parsed:\n\n`;
  text += `Amount: ${expense.amount.toFixed(2)} PLN\n`;
  text += `Category: ${emoji} ${expense.category}\n`;
  if (expense.merchant) text += `Merchant: ${expense.merchant}\n`;
  text += `Date: ${expense.expense_date}\n`;
  if (expense.note) text += `Note: ${expense.note}\n`;
  return text;
}

function confirmationKeyboard(pendingId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", `confirm:${pendingId}`)
    .text("✏️ Edit", `edit:${pendingId}`)
    .text("❌ Cancel", `cancel:${pendingId}`);
}

// ---- Register handlers ----

export function registerHandlers(bot: Bot) {
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

    // Link the account
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ telegram_id: ctx.from!.id })
      .eq("id", linkReq.user_id);

    if (updateError) {
      return ctx.reply(
        "Something went wrong linking your account. Please try again.",
      );
    }

    // Mark token as used
    await supabase
      .from("telegram_link_requests")
      .update({ used_at: new Date().toISOString() })
      .eq("id", linkReq.id);

    return ctx.reply(
      '✅ Account linked! You can now send expenses here.\n\nTry: "15 coffee" or send a voice memo.',
    );
  });

  // Handle unlinked users for all message types
  bot.use(async (ctx, next) => {
    // Skip for /start command (handled above)
    if (ctx.message?.text?.startsWith("/start")) return;
    // Skip callback queries (handled separately)
    if (ctx.callbackQuery) return next();

    if (!ctx.from) return;

    const user = await findUserByTelegramId(ctx.from.id);
    if (!user) {
      return ctx.reply(
        'You need to link your Telegram account first.\n\nVisit the Zen Finance web app and click "Link Telegram" to get started.',
      );
    }

    // Attach user info to context for downstream handlers
    (ctx as Context & { userId?: string }).userId = user.id;
    return next();
  });

  // Callback query handler (confirm / edit / cancel)
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, pendingId] = data.split(":");

    if (action === "confirm") {
      const pending = pendingExpenses.get(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({
          text: "Expense expired. Send a new one.",
        });
      }

      const supabase = createAdminClient();
      const { error } = await supabase.from("expenses").insert({
        account_id: pending.accountId,
        amount: pending.amount,
        currency: "PLN",
        category: pending.category,
        merchant: pending.merchant,
        note: pending.note,
        source: pending.source,
        transcript: pending.transcript,
        telegram_message_id: ctx.callbackQuery.message?.message_id ?? null,
        expense_date: pending.expense_date,
        created_by: pending.userId,
      });

      pendingExpenses.delete(pendingId);

      if (error) {
        await ctx.answerCallbackQuery({ text: "Failed to save. Try again." });
        return;
      }

      await ctx.answerCallbackQuery({ text: "Saved!" });
      await ctx.editMessageText(
        `✅ Saved: ${pending.amount.toFixed(2)} PLN — ${CATEGORY_EMOJI[pending.category]} ${pending.category}${pending.merchant ? ` at ${pending.merchant}` : ""}`,
      );
      return;
    }

    if (action === "cancel") {
      pendingExpenses.delete(pendingId);
      await ctx.answerCallbackQuery({ text: "Cancelled" });
      await ctx.editMessageText("❌ Expense cancelled.");
      return;
    }

    if (action === "edit") {
      const pending = pendingExpenses.get(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expense expired." });
      }

      await ctx.answerCallbackQuery();
      const keyboard = new InlineKeyboard()
        .text("Amount", `edit_amount:${pendingId}`)
        .text("Category", `edit_category:${pendingId}`)
        .text("Date", `edit_date:${pendingId}`)
        .row()
        .text("Merchant", `edit_merchant:${pendingId}`)
        .text("Note", `edit_note:${pendingId}`)
        .text("🔙 Back", `back:${pendingId}`);

      await ctx.editMessageText("What would you like to change?", {
        reply_markup: keyboard,
      });
      return;
    }

    if (action === "back") {
      const pending = pendingExpenses.get(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expense expired." });
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
      const pending = pendingExpenses.get(pid);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expense expired." });
      }
      pending.category = category as ExpenseCategory;
      await ctx.answerCallbackQuery({ text: `Category: ${category}` });
      await ctx.editMessageText(formatConfirmation(pending), {
        reply_markup: confirmationKeyboard(pid),
      });
      return;
    }

    // For edit_amount, edit_merchant, edit_note, edit_date — prompt text reply
    if (
      action === "edit_amount" ||
      action === "edit_merchant" ||
      action === "edit_note" ||
      action === "edit_date"
    ) {
      const field = action.replace("edit_", "");
      const pending = pendingExpenses.get(pendingId);
      if (!pending) {
        return ctx.answerCallbackQuery({ text: "Expense expired." });
      }
      // Store edit state
      pendingExpenses.set(`editing_${ctx.from!.id}`, {
        ...pending,
        // Use note field to temporarily store the edit target
      } as PendingExpense);
      // Store which field is being edited
      editStates.set(ctx.from!.id, { pendingId, field });

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `Type the new ${field}:${field === "amount" ? " (number)" : field === "date" ? " (YYYY-MM-DD)" : ""}`,
      );
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // Handle text replies for field editing
  const editStates = new Map<number, { pendingId: string; field: string }>();

  // Text message handler (expense parsing) — will be expanded in Phase 4
  bot.on("message:text", async (ctx) => {
    const userId = (ctx as Context & { userId?: string }).userId;
    if (!userId) return;

    // Check if this is a reply to an edit prompt
    const editState = editStates.get(ctx.from.id);
    if (editState) {
      const pending = pendingExpenses.get(editState.pendingId);
      editStates.delete(ctx.from.id);
      pendingExpenses.delete(`editing_${ctx.from.id}`);

      if (!pending) {
        return ctx.reply("That expense has expired. Send a new one.");
      }

      const { field, pendingId } = editState;
      const value = ctx.message.text.trim();

      if (field === "amount") {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          return ctx.reply("Please enter a valid positive number.");
        }
        pending.amount = num;
      } else if (field === "merchant") {
        pending.merchant = value;
      } else if (field === "note") {
        pending.note = value;
      } else if (field === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return ctx.reply("Please use YYYY-MM-DD format.");
        }
        pending.expense_date = value;
      }

      return ctx.reply(formatConfirmation(pending), {
        reply_markup: confirmationKeyboard(pendingId),
      });
    }

    // AI text expense parsing
    const account = await getUserDefaultAccount(userId);
    if (!account) {
      return ctx.reply(
        "No account found. Please set up your account on the web app first.",
      );
    }

    console.log("[text] Input:", ctx.message.text);
    const result = await parseTextExpense(ctx.message.text);
    console.log("[text] Parse result:", JSON.stringify(result));
    if (isParseError(result)) {
      return ctx.reply(
        'I couldn\'t parse that as an expense.\n\nTry something like:\n• "15 coffee"\n• "Groceries 120 at Biedronka"\n• "Uber 25"',
      );
    }

    const pendingId = nanoid(8);
    const today = new Date().toISOString().split("T")[0];
    pendingExpenses.set(pendingId, {
      amount: result.amount,
      category: result.category,
      merchant: result.merchant,
      note: result.note,
      expense_date: today,
      source: "text",
      transcript: ctx.message.text,
      userId,
      accountId: account.id,
    });

    return ctx.reply(formatConfirmation(pendingExpenses.get(pendingId)!), {
      reply_markup: confirmationKeyboard(pendingId),
    });
  });

  // Voice message handler
  bot.on("message:voice", async (ctx) => {
    const userId = (ctx as Context & { userId?: string }).userId;
    if (!userId) return;

    const account = await getUserDefaultAccount(userId);
    if (!account) {
      return ctx.reply(
        "No account found. Please set up your account on the web app first.",
      );
    }

    await ctx.reply("🎙 Transcribing...");

    try {
      // Download voice file
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Transcribe via Groq
      const { transcribe } = await import("@/lib/ai/groq");
      const transcript = await transcribe(buffer);

      if (!transcript) {
        return ctx.reply(
          "I couldn't understand the audio. Try again or type your expense instead.",
        );
      }

      console.log("[voice] Transcript:", transcript);

      // Parse via Gemini
      const result = await parseVoiceExpense(transcript);
      console.log("[voice] Parse result:", JSON.stringify(result));
      if (isParseError(result)) {
        return ctx.reply(
          `I heard: "${transcript}"\n\nBut I couldn't identify an expense. Try something like "Spent 40 zloty on gas".`,
        );
      }

      const pendingId = nanoid(8);
      const today = new Date().toISOString().split("T")[0];
      pendingExpenses.set(pendingId, {
        amount: result.amount,
        category: result.category,
        merchant: result.merchant,
        note: result.note,
        expense_date: result.date || today,
        source: "voice",
        transcript,
        userId,
        accountId: account.id,
      });

      return ctx.reply(formatConfirmation(pendingExpenses.get(pendingId)!), {
        reply_markup: confirmationKeyboard(pendingId),
      });
    } catch (error) {
      console.error("Voice processing error:", error);
      return ctx.reply(
        "Something went wrong processing your voice message. Try typing your expense instead.",
      );
    }
  });

  // Photo message handler (receipt)
  bot.on("message:photo", async (ctx) => {
    const userId = (ctx as Context & { userId?: string }).userId;
    if (!userId) return;

    const account = await getUserDefaultAccount(userId);
    if (!account) {
      return ctx.reply(
        "No account found. Please set up your account on the web app first.",
      );
    }

    await ctx.reply("📸 Reading receipt...");

    try {
      // Get largest photo
      const photos = ctx.message.photo;
      const photo = photos[photos.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString("base64");

      const result = await parseReceiptImage(base64, "image/jpeg");
      if (isParseError(result)) {
        return ctx.reply(
          "I couldn't read this as a receipt. Make sure the image is clear, or type the expense instead.",
        );
      }

      const pendingId = nanoid(8);
      const today = new Date().toISOString().split("T")[0];
      pendingExpenses.set(pendingId, {
        amount: result.amount,
        category: result.category,
        merchant: result.merchant,
        note: result.note,
        expense_date: result.date || today,
        source: "receipt",
        transcript: `Amount: ${result.amount}, Merchant: ${result.merchant || "unknown"}`,
        userId,
        accountId: account.id,
      });

      return ctx.reply(formatConfirmation(pendingExpenses.get(pendingId)!), {
        reply_markup: confirmationKeyboard(pendingId),
      });
    } catch (error) {
      console.error("Receipt processing error:", error);
      return ctx.reply(
        "Something went wrong reading the receipt. Try typing the expense instead.",
      );
    }
  });

  // Document handler — reject non-image files
  bot.on("message:document", async (ctx) => {
    return ctx.reply(
      "Only photo images are supported for receipt parsing. Please send a photo instead.",
    );
  });
}

// Export for use in handlers
export {
  pendingExpenses,
  formatConfirmation,
  confirmationKeyboard,
  findUserByTelegramId,
  getUserDefaultAccount,
};
export type { PendingExpense };
