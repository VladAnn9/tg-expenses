# Product Requirements Document: Zen Finance (Expense Tracker)

**Working Title:** Zen Finance (Expense Tracker)  
**Version:** 0.2  
**Last Updated:** March 2025  
**Status:** Draft — Aligned with product decisions

---

## 1. Overview

| Field | Value |
|-------|-------|
| **Product Name** | Zen Finance (working title) |
| **One-Line Description** | AI-driven expense tracking via Telegram (voice + receipts) with an ultra-minimalist web dashboard. |
| **Target Launch** | MVP — Personal use (2 users) — Q2 2025 |
| **Scale Path** | Personal MVP → Polish → Potential SaaS (no bank integrations in v1) |

---

## 2. Problem Statement

Manual expense tracking fails because of friction: opening apps, typing amounts, categorizing. By the time you remember to log, the moment has passed. Receipts pile up in wallets and photos. Voice memos and receipt photos are natural capture methods—but most tools force manual transcription and categorization.

**Who has this problem:** Individuals and couples who want visibility into spending without the overhead of traditional budgeting apps.

**Why now:** AI can reliably transcribe voice and parse receipts. Telegram is already where people chat and share; using it as the input layer removes app-switching friction. A $0 tech stack makes it feasible to build and run personally before considering commercialization.

---

## 3. Target Users

### Persona 1: The Busy Professional (Primary)
- Logs 5–15 expenses/week
- Forwards voice memos like "Spent $40 on gas" or "Lunch $18"
- Takes photos of receipts at restaurants, grocery stores
- Wants a quick glance at spending without opening spreadsheets
- **Pain:** Forgets to log; hates manual entry

### Persona 2: The Couple / Shared Finances (Secondary)
- Two people sharing one or more accounts (checking, savings)
- Both log via the same bot or separate bots linked to shared household
- Wants to see combined view + who spent what
- **Pain:** "Did you log that?" — no single source of truth

### Persona 3: The Goal-Setter (Future)
- Has savings goals (vacation, emergency fund)
- Wants visual progress and "safe to spend" clarity
- **Pain:** Abstract numbers don't feel motivating

---

## 4. Goals & Success Metrics

| Metric | MVP (Month 1) | v1 (Month 3) |
|--------|---------------|--------------|
| **Expenses logged via voice** | 80%+ accuracy on transcription | 90%+ |
| **Receipts parsed successfully** | 70%+ (amount + merchant) | 85%+ |
| **Time to log one expense** | <30 seconds (voice) or <10 sec (photo) | Same or better |
| **Dashboard load time** | <2s on 3G | <1.5s |
| **User satisfaction** | Both primary users use daily | NPS-style "would recommend" |

---

## 5. User Stories

### Account Setup
- **US-00:** As a user, I want to link my Telegram account with one tap from the Dashboard (or header) so that I can start logging expenses via the bot—without digging into Settings.

### Input (Telegram Bot)
- **US-01:** As a user, I want to forward a voice memo (e.g., "Spent $40 on gas") so that it’s transcribed and logged without typing.
- **US-02:** As a user, I want to send a photo of a receipt so that the amount and merchant are extracted and logged automatically.
- **US-03:** As a user, I want to type a quick expense (e.g., "15 coffee") so that I can log when voice/photo isn’t convenient.
- **US-04:** As a user, I want the bot to confirm what it parsed so that I can correct mistakes before saving.
- **US-05:** As a user, I want to receive a friendly AI reply (roast or praise) based on my budget so that tracking feels engaging.

### Web Dashboard
- **US-06:** As a user, I want to see a zen-themed dashboard with spending by category and time so that I understand where money goes.
- **US-07:** As a user, I want to track multiple accounts (e.g., checking, savings) so that I can see balances and flows per account.
- **US-08:** As a user, I want to add notes to individual expenses so that I can remember context later.
- **US-09:** As a user, I want to add notes to accounts so that I can label them (e.g., "Main checking", "Vacation fund").
- **US-10:** As a user, I want rich charts (category breakdown, month-over-month) and summaries so that I can spot trends at a glance.
- **US-10a:** As a user, I want to edit any expense (amount, category, merchant, note, date) from the web so that I can correct AI mistakes.
- **US-10b:** As a user, I want to add a new expense from the web so that I can log when not using Telegram.

### Shared & Goals (v1+)
- **US-11:** As a shared user, I want to see who logged each expense so that we have accountability.
- **US-12:** As a goal-setter, I want visual savings buckets that fill as I log income and allocate percentages so that goals feel tangible.
- **US-13:** As a user, I want the AI to detect recurring subscriptions and show "Safe to Spend" so that I know what’s truly discretionary.

---

## 6. Functional Requirements

### P0 — Must Have (MVP)

| ID | Feature | Notes |
|----|---------|------|
| P0-1 | **Telegram bot** | Single bot instance; each user identified by `telegram_id` |
| P0-2 | **Voice memo → expense** | Groq Whisper transcription → Gemini extraction (amount, category, optional note) |
| P0-3 | **Receipt photo → expense** | Gemini vision: extract amount, merchant, date; transcript only (no image storage in v1) |
| P0-4 | **Text expense** | Simple parsing: "15 coffee" → amount + category |
| P0-5 | **Confirmation flow** | Bot replies with parsed data; user confirms or edits before save |
| P0-6 | **Supabase auth + user linking** | Web: Google SSO; Link Telegram via deep link (t.me/bot?start=token); button on Dashboard/header |
| P0-7 | **Single-account view** | One default account per user for MVP |
| P0-8 | **Dashboard** | List of expenses; category breakdown chart (current month) |
| P0-9 | **Notes on expenses** | Add/edit note on any expense from web |
| P0-10 | **Edit any expense** | Edit amount, category, merchant, note, date from web (AI correction) |
| P0-11 | **Add expense from web** | Manual entry when not using Telegram |

### P1 — Should Have (v1)

| ID | Feature | Notes |
|----|---------|------|
| P1-1 | **Multiple accounts** | Checking, savings, etc.; assign expenses to account |
| P1-2 | **Account notes** | Label/describe accounts |
| P1-3 | **Friendly Financial Roast** | AI personality: reply with humor/praise based on budget vs actual |
| P1-4 | **Smart subscription prediction** | Detect recurring expenses; compute "Safe to Spend" |
| P1-5 | **Shared household** | Two users, one household; invite-by-link; both see combined data |
| P1-6 | **Income logging** | Log income (voice/text) to support "Safe to Spend" and savings goals |
| P1-7 | **Month-over-month comparison** | Charts: compare current month vs previous month |
| P1-8 | **Category trends insights** | e.g. "You spent 20% more on dining this month" |

### P2 — Nice to Have (v1.x+)

| ID | Feature | Notes |
|----|---------|------|
| P2-1 | **Gamified savings buckets** | Visual buckets (e.g., "Vacation Fund"); allocate % of income |
| P2-2 | **Export (CSV)** | Download expenses for tax/analysis |
| P2-3 | **Budget alerts** | Notify when category exceeds budget |
| P2-4 | **Dark/light theme toggle** | Zen theme supports both |
| P2-5 | **Recurring expense templates** | Pre-fill known subscriptions |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard loads in <2s on 3G. API responses <500ms p95. |
| **Security** | All data encrypted at rest (Supabase default). HTTPS only. No sensitive data in logs. |
| **Availability** | Best-effort for personal MVP. Supabase free tier may pause after 1 week inactivity. |
| **Accessibility** | WCAG 2.1 AA for web dashboard. Keyboard navigation for core flows. |
| **Cost** | $0/month target: Vercel Hobby + Supabase Free + Groq Free + Gemini Free. |

---

## 8. Technical Considerations

### 8.1 Stack (Confirmed)

| Layer | Technology | Rationale |
|------|-------------|-----------|
| **Frontend** | Next.js 16 (App Router) + Tailwind CSS | SSR, API routes, Vercel-native; Turbopack default |
| **Charts** | Recharts | Popular, flexible styling; full control for zen dashboard |
| **Backend** | Next.js API Routes | Webhook + CRUD; single codebase |
| **Database** | Supabase (PostgreSQL) | Free tier: 500MB DB, 1GB storage |
| **Auth** | Supabase Auth | Google SSO (primary); custom link to Telegram |
| **Storage** | Supabase Storage | Optional for future; v1: no receipt image storage (transcript only) |
| **Voice** | Groq API (Whisper Large V3 Turbo) | Fast, free tier: 20 RPM, 2000 RPD |
| **Receipt + AI** | Google Gemini (Flash or Flash-Lite) | Vision + text; free tier: 15 RPM, 1000 RPD |
| **Hosting** | Vercel (Hobby) | Free; serverless; automatic deploys |
| **Telegram** | Grammy (Node.js) | Modern, good docs; works in Next.js API route |

### 8.2 Proposed Corrections & Alternatives

| Original | Correction / Alternative | Reason |
|----------|--------------------------|--------|
| — | **Recharts** | Popular, easy to style; full control for zen dashboard |
| "Bot per user or shared" | **One bot, user-scoped data** | One bot instance; `telegram_id` → `user_id`; shared mode = household linking |
| — | **Grammy over Telegraf** | Better maintained, Supabase examples use it; Telegraf is older |
| — | **Auth:** Google SSO; Telegram link via deep link (see 8.2a) | Supabase supports Google OAuth; one-click login; no native Telegram auth |

### 8.2a Telegram Account Linking (Deep Link)

**Flow:** Web generates token → user taps link → Telegram opens bot with token → bot links account.

1. User signs up on web via Google SSO.
2. **Link Telegram** button is visible immediately (Dashboard, header, or post-login CTA)—not buried in Settings.
3. User clicks "Link Telegram" → web generates unique token (e.g. `zen_a1b2c3d4`), stores in `telegram_link_requests` (user_id, token, expires_at).
4. Web shows button/link: `https://t.me/YourBotName?start=zen_a1b2c3d4`.
5. User taps → Telegram opens bot; bot receives `/start zen_a1b2c3d4`.
6. Bot validates token, updates `profiles.telegram_id`, confirms in chat.
7. Token expires in ~10–15 minutes; one-time use.

**Unlinked users:** If Telegram user messages bot before linking, bot replies: "Link your account first: [web app URL]".

**Schema addition:** `telegram_link_requests: id, user_id, token, expires_at, used_at`

### 8.3 Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Telegram User  │────▶│  Vercel: /api/webhooks/telegram          │
│  (voice/photo/  │     │  → Grammy handler                          │
│   text)         │     │  → Groq (voice) / Gemini (receipt/text)   │
└─────────────────┘     │  → Supabase (insert expense)              │
                         └──────────────────────────────────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────────────────┐
                         │  Supabase                                │
                         │  - PostgreSQL (users, accounts, expenses)│
                         │  - Auth (Google SSO)                     │
                         └──────────────────────────────────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────────────────┐
                         │  Next.js Web App (mobile-first)          │
                         │  - Dashboard (Recharts)                  │
                         │  - Expense list, edit, add               │
                         │  - Account management                   │
                         └──────────────────────────────────────────┘
```

### 8.4 Database Schema (Core)

```sql
-- users: Supabase Auth handles this; we extend with telegram_id
-- profiles (extends auth.users)
profiles: id, telegram_id, display_name, created_at

-- accounts
accounts: id, user_id, name, type (checking|savings), balance, currency (default PLN), notes, created_at

-- expenses
expenses: id, account_id, amount, currency (default PLN), category, merchant, note,
          source (voice|receipt|text), transcript (from receipt; no image in v1),
          telegram_message_id, created_at, created_by (user_id)

-- telegram_link_requests (for deep link flow)
telegram_link_requests: id, user_id, token, expires_at, used_at

-- households (for shared mode, P1)
households: id, name, created_at
household_members: household_id, user_id, role
```

### 8.5 Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhooks/telegram` | Telegram webhook; handles message, voice, photo, /start |
| POST | `/api/telegram/link` | Generate link token; return t.me/bot?start=token URL |
| GET | `/api/expenses` | List expenses (filter by account, date range) |
| POST | `/api/expenses` | Create expense (from bot or web) |
| PATCH | `/api/expenses/:id` | Update expense (e.g., note) |
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/summary` | Aggregated data for charts |

### 8.6 Cron & Background Jobs

| Job | Frequency | Solution (Free Tier) |
|-----|------------|----------------------|
| Subscription detection | Daily | Vercel cron (free: 1x/day) or cron-job.org → ping API |
| "Safe to Spend" refresh | Daily | Same as above |
| Friendly Roast | Real-time | No cron; on each expense message |

**Note:** Vercel Hobby allows 1 cron per day. For MVP, daily subscription detection is sufficient.

---

## 9. UI/UX Requirements

### 9.1 Design Principles

- **Mobile-first:** Design for mobile from day one; desktop is a scaled-up layout. Primary users check on the go.
- **Zen, minimalist:** Plenty of whitespace; calm colors; no clutter
- **Link Telegram upfront:** Button visible immediately (Dashboard, header, or post-login)—not in Settings; core functionality, easy access
- **Fast:** Skeleton loaders; optimistic updates where possible

### 9.2 Key Screens

| Screen | Purpose |
|--------|---------|
| **Login** | Google SSO; minimal flow |
| **Dashboard** | **Link Telegram** CTA prominent when not linked; summary cards; category chart; recent expenses |
| **Expenses** | List with filters (date, account, category); edit any field; add new expense; inline note edit |
| **Accounts** | List of accounts; add/edit; notes |
| **Settings** | Currency (PLN default); notification prefs (future) |

### 9.3 Design System (Suggested)

- **Typography:** Geist Sans or similar clean sans-serif; 14px base
- **Colors:** Neutral (zinc/slate); accent: soft green (growth) or blue (trust); avoid harsh red for negative
- **Charts:** Recharts; muted palette; category summaries; month-over-month comparison (P1); avoid chart junk

---

## 10. Out of Scope (Explicit)

- **Bank integrations** (Plaid, etc.) — Paused; manual entry only
- **Multi-currency** — Single currency (PLN) for MVP
- **Receipt image storage** — Not in v1; transcript only. Optional in future.
- **White-label / B2B** — Personal/couple use only for now
- **Mobile native apps** — Web-only; PWA possible later
- **Jira/Linear-style integrations** — N/A
- **AI-generated task descriptions** — N/A

---

## 11. Timeline & Milestones

| Phase | Deliverables | Timeline |
|-------|--------------|----------|
| **Phase 1: Foundation** | Next.js 16 + Supabase setup; auth; DB schema; Telegram webhook (echo only) | Week 1 |
| **Phase 2: Input** | Voice transcription (Groq); receipt parsing (Gemini); text parsing; confirmation flow | Week 2 |
| **Phase 3: Dashboard** | Expense list; Recharts (category breakdown); edit/add; notes | Week 3 |
| **Phase 4: Polish** | Link Telegram (deep link); button on Dashboard/header; multi-account (P1); Friendly Roast (P1) | Week 4–5 |
| **Phase 5: Shared & Goals** | Household linking; income logging; subscription detection; savings buckets (P2) | Week 6+ |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Groq/Gemini rate limits hit | Low (2 users) | Monitor; add retry with backoff; consider caching repeated receipts |
| Supabase project pauses (1 week inactive) | Medium | Use weekly; or cron-job.org ping to keep warm |
| Receipt parsing accuracy low | Medium | Start with "amount + merchant"; allow easy correction; improve prompts over time |
| Telegram user ↔ web user linking friction | Low | Deep link: one-tap "Link Telegram" → opens t.me/bot?start=token; button visible on Dashboard/header |
| Scope creep | High | Strict P0 → P1 → P2; refer to this section when tempted |

---

## 13. Resolved Decisions

| Topic | Decision |
|-------|----------|
| **Bot** | One bot; user identified by `telegram_id` |
| **Shared mode** | Invite-by-link to join household |
| **Categories** | Fixed list + AI-suggested on confirmation (hybrid) |
| **Currency** | PLN default |
| **Receipt images** | Not stored in v1; transcript only. Optional in future. |

### Categories (Fixed List + AI-Suggested)

- **Fixed list:** Food, Transport, Shopping, Bills, Entertainment, Health, Other
- **Flow:** AI suggests category on parse; user confirms or changes before save

---

## 14. Brainstormed Additions (Not Yet Prioritized)

Ideas captured during PRD drafting; to be triaged into P0/P1/P2:

- **Quick stats in bot:** Reply with "This week: $X spent" on demand
- **Category trends:** "You spent 20% more on dining this month" (→ P1-8)
- **Receipt search:** Find expense by merchant or date from web
- **Bulk edit:** Select multiple expenses, add same note or recategorize
- **Monthly digest:** Weekly/monthly summary via Telegram (cron + bot)
- **PWA:** Install web app on home screen for app-like feel
- **Offline support:** Cache recent expenses for offline view (Service Worker)
- **Voice reply from bot:** Bot sends voice memo back? (Complex; maybe v2)

---

## Appendix A: $0 Stack Validation

| Service | Free Tier | MVP Usage |
|---------|-----------|-----------|
| Vercel | 100GB bandwidth, serverless | ~2 users; negligible |
| Supabase | 500MB DB, 1GB storage | ~50MB for MVP |
| Groq | 20 RPM, 2000 RPD | ~20–50 transcriptions/day |
| Gemini | 15 RPM, 1000 RPD (Flash-Lite) | ~10–30 receipts/day |
| Telegram Bot API | Free | Unlimited |

**Caveat:** Supabase free projects pause after 1 week of inactivity. For 2 active users, unlikely. No receipt image storage in v1 → no Storage usage.

---

## Appendix B: File Structure (Suggested)

```
tg-expenses/
├── docs/
│   ├── PRD.md              # This document
│   └── ARCHITECTURE.md     # (Optional) Deeper technical design
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login, Google SSO
│   │   ├── (dashboard)/    # Dashboard, expenses, accounts
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── telegram/route.ts
│   │   │   ├── expenses/
│   │   │   ├── accounts/
│   │   │   └── summary/
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── telegram.ts     # Grammy setup
│   │   ├── groq.ts         # Whisper client
│   │   ├── gemini.ts       # Receipt + extraction
│   │   └── supabase.ts
│   └── components/
├── supabase/
│   └── migrations/
├── .env.local
├── next.config.js
├── tailwind.config.js
└── package.json
```
