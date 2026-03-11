<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (first fill)
Added sections: Core Principles (I–V), Tech Stack Constraints, Development Workflow, Governance
Removed sections: All placeholder tokens replaced
Templates requiring updates:
  ✅ .specify/templates/constitution-template.md — source template, no changes needed
  ✅ .specify/templates/plan-template.md — "Constitution Check" gates align with principles below
  ✅ .specify/templates/spec-template.md — User Stories, FR, SC sections align with principles
  ✅ .specify/templates/tasks-template.md — Phase structure aligns with P0→P1→P2 delivery order
Deferred TODOs: none
-->

# Zen Finance Constitution

## Core Principles

### I. Frictionless Capture First

Every input method (voice, receipt photo, text) MUST reduce the effort of logging an expense to the absolute minimum.
The confirmation step MUST be present so users can correct AI mistakes before saving.
Manual entry and editing from the web MUST be available as a fallback at all times.
Any feature that adds steps without proportional user value MUST be rejected.

### II. Mobile-First Interface

All UI components MUST be designed for mobile viewport first; desktop is a scaled-up layout.
Dashboard load MUST be under 2 seconds on a 3G connection.
The "Link Telegram" call-to-action MUST be visible on the Dashboard or app header—never only in Settings.
Skeleton loaders and optimistic updates MUST be used to keep the UI responsive.

### III. AI-Assisted, Human-Controlled

AI (Gemini, Groq Whisper) handles transcription, category suggestion, and receipt parsing.
The AI MUST always suggest, never silently decide—every parsed expense goes through a user confirmation step.
Category suggestions come from a fixed list: Food, Transport, Shopping, Bills, Entertainment, Health, Other.
The user MUST be able to edit any field (amount, category, merchant, note, date) on any saved expense.

### IV. Strict Scope Discipline (P0 → P1 → P2)

Features are delivered in priority order. P1 work MUST NOT begin until all P0 items are complete and stable.
P0 (MVP): Telegram bot input, voice/receipt/text parsing, confirmation flow, Google SSO, Telegram deep-link,
  single-account dashboard, category charts, expense edit/add from web.
P1 (v1): Multiple accounts, Friendly Roast, subscription prediction, Safe to Spend, shared household, MoM charts.
P2 (v1.x): Savings buckets, CSV export, budget alerts, dark/light theme, PWA.
Any new feature request MUST be triaged into P0/P1/P2 before implementation begins.
See full requirements in `docs/PRD.md`.

### V. Zero-Cost Stack ($0/month)

The entire system MUST run within free tiers of: Vercel Hobby, Supabase Free, Groq API Free, Gemini API Free.
No receipt images are stored in v1—transcript text only—to stay within Supabase Storage limits.
Background jobs use Vercel Cron (1x/day free) or cron-job.org as a free external scheduler.
Any architectural decision that would incur recurring costs requires explicit product approval.

## Tech Stack Constraints

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Charts**: Recharts (direct; not Tremor)
- **Backend**: Next.js API Routes (single codebase)
- **Database + Auth + Storage**: Supabase (PostgreSQL, Google SSO, Storage)
- **Telegram library**: Grammy
- **Voice**: Groq API (Whisper Large V3 Turbo)
- **Receipt + AI**: Google Gemini (Flash or Flash-Lite)
- **Hosting**: Vercel (Hobby)
- **Currency default**: PLN
- **Telegram linking**: Deep link only — `https://t.me/BotName?start=<token>`; tokens stored in
  `telegram_link_requests` with expiry; one-time use.
- Schema source of truth: `docs/PRD.md` §8.4

## Development Workflow

- Implement features in P0 → P1 → P2 order; reference user story IDs (US-XX) in commits and PRs.
- Every AI-parsed expense MUST pass through a confirmation flow before persisting.
- New API endpoints MUST follow the routes defined in `docs/PRD.md` §8.5; deviations require PRD update.
- The "Constitution Check" in plan.md MUST verify: (1) scope is P0-only for MVP, (2) no new cost
  dependencies introduced, (3) mobile-first layout confirmed, (4) AI confirmation step present.
- Complexity MUST be justified; prefer the simplest solution that satisfies the user story.

## Governance

This constitution supersedes all other conventions for Zen Finance.
Amendments require: updating `docs/PRD.md` first → updating this file → incrementing version.
- PATCH: wording, typos, clarifications.
- MINOR: new principle, new section, material expansion.
- MAJOR: principle removal, redefinition, or backward-incompatible constraint change.
All implementation plans and specs MUST pass the Constitution Check before Phase 0 research begins.
Runtime development guidance: `.cursor/rules/project-overview.mdc`

**Version**: 1.0.0 | **Ratified**: 2026-03-11 | **Last Amended**: 2026-03-11
