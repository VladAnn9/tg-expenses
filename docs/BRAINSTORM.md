# Brainstorm Summary: Zen Finance PRD

This document captures corrections, proposed changes, and additional ideas from the PRD drafting session. Use it to review decisions before locking the PRD.

---

## Corrections & Proposed Changes

### 1. Charts: Recharts (Confirmed)

**Decision:** Use **Recharts** directly (not Tremor).

**Why:** More popular, easier to style, full control for zen dashboard. Tremor adds a layer; Recharts gives flexibility for custom design.

---

### 2. "Bot per user or shared" → One Bot, User-Scoped Data

**Original:** "A Telegram bot per telegram user or shared"  
**Proposed:** **One bot instance.** Each user is identified by `telegram_id`. Data is scoped per user. "Shared" = household linking (two users, one household, both see combined data).

**Why:** Running multiple bots adds ops and config. One bot with user-scoped data is simpler. Shared mode is a data model change (household + members), not a new bot.

---

### 3. Telegram Bot Library: Grammy

**Original:** Not specified  
**Proposed:** **Grammy** (grammY)

**Why:** Modern, good docs, actively maintained. Supabase’s own Telegram bot example uses Grammy. Telegraf is older and heavier. Both work with Next.js webhooks; Grammy is a better fit for a new project.

---

### 4. Auth: Google SSO + Telegram Linking (Deep Link)

**Decision:** **Google SSO** (primary) via Supabase Auth; then link Telegram via **deep link**.

Flow:
1. User signs up on web via Google SSO (Supabase supports this natively).
2. **Link Telegram** button is visible immediately (Dashboard, header)—not in Settings.
3. User clicks → web generates token, returns `https://t.me/YourBotName?start=zen_XXXXX`.
4. User taps link → Telegram opens bot with token; bot receives `/start zen_XXXXX`.
5. Bot validates token, stores `telegram_id` in `profiles`, confirms.

**Why:** One tap instead of copy-paste; mobile-friendly; familiar Telegram pattern. Supabase has no native Telegram auth.

---

### 5. Cron Jobs on Free Tier

**Original:** Not discussed  
**Proposed:** Vercel Hobby = **1 cron per day**. Use it for subscription detection / "Safe to Spend" refresh. For more frequent jobs, use [cron-job.org](https://cron-job.org) (free) to ping your API.

**Why:** Keeps the stack at $0. Daily refresh is enough for subscription detection.

---

### 6. Supabase Project Pause

**Original:** Not discussed  
**Proposed:** Document that **Supabase free projects pause after 1 week of inactivity**.

**Why:** For 2 active users, this is unlikely. If it happens, a simple weekly ping (cron-job.org) can keep the project warm. Worth noting in the PRD.

---

### 7. Mobile-First (v0.2)

**Decision:** Web app is **mobile-first from the beginning**; desktop is a scaled-up layout.

**Why:** Primary users check spending on the go. Avoids costly mobile retrofit later.

---

### 8. Edit Any Entry + Add from Web (v0.2)

**Decision:** P0: **Edit any expense** (amount, category, merchant, note, date); **Add new expense** from web.

**Why:** AI will make mistakes; users must correct. Manual entry needed when not using Telegram.

---

### 9. Receipt Images: Transcript Only (v0.2)

**Decision:** **No receipt image storage in v1.** Store transcript only. Optional in future.

**Why:** Saves Supabase Storage; simpler data model; fewer privacy concerns. Trade-off: no audit trail if parsing was wrong.

---

## Additional Features Brainstormed

### High Value, Consider for P1

| Feature | Description |
|--------|-------------|
| **Quick stats in bot** | User sends "stats" or "summary" → bot replies "This week: $X spent, top category: Food" |
| **Monthly digest** | Weekly or monthly summary sent via Telegram (cron + bot) |
| **Category trends** | "You spent 20% more on dining this month" on dashboard |
| **Receipt search** | Search expenses by merchant or date from web |

### Medium Value, Consider for P2

| Feature | Description |
|--------|-------------|
| **PWA** | Install web app on home screen for app-like experience |
| **Bulk edit** | Select multiple expenses, add same note or recategorize |
| **Offline support** | Cache recent expenses for offline view (Service Worker) |

### Lower Priority / Future

| Feature | Description |
|--------|-------------|
| **Voice reply from bot** | Bot sends voice memo back (complex; maybe v2) |
| **Export to PDF** | Monthly report as PDF |
| **Budget vs actual alerts** | Push when category exceeds budget |

---

## Resolved Decisions (v0.2)

| Topic | Decision |
|-------|----------|
| **Categories** | Fixed list + AI-suggested on confirmation (hybrid) |
| **Currency** | PLN default |
| **Receipt images** | Not stored in v1; transcript only. Optional in future. |
| **Shared invite** | Invite-by-link |
| **Telegram link** | Deep link (t.me/bot?start=token); button on Dashboard/header, not Settings |
| **Mobile-first** | Design for mobile from day one; desktop scaled-up |
| **Edit/add from web** | P0: Edit any expense; add new expense manually |
| **Charts** | Category breakdown (P0); month-over-month + trends (P1) |

---

## Tech Stack Summary (Final)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 + Tailwind CSS (mobile-first) |
| Charts | Recharts |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google SSO) + custom Telegram link |
| Storage | Supabase Storage (optional; no receipt images in v1) |
| Voice | Groq (Whisper Large V3 Turbo) |
| Receipt + AI | Google Gemini (Flash or Flash-Lite) |
| Hosting | Vercel (Hobby) |
| Telegram | Grammy |

---

## Next Steps

1. ~~Review PRD and this brainstorm.~~ ✓
2. ~~Resolve open questions.~~ ✓ (v0.2)
3. Lock P0 scope and start Phase 1.
4. Create `.cursor/rules/project-overview.mdc` that references `docs/PRD.md`.
