# AR Command Center — Session Rules

## What This Is
AR Command Center is the accounts receivable / invoicing / collections
dashboard for the Command Suite. It's the office-facing counterpart to
Sales Command (proposals, signing) and Schedule Command (scheduling).

Pre-development as of 2026-04-27 — only `index.html` and `README.md` exist.
This file will grow as real code lands. For now it captures architectural
constraints inherited from the Command Suite.

## Stack (planned)
- **Frontend:** React via Next.js (App Router) — same as sales-command
- **Backend:** Supabase (Postgres + Edge Functions + Auth) — SHARED with
  sales-command, sch-command, field-command
- **Hosting:** Vercel
- **Source:** GitHub (chris7berger-droid/AR-Command-Center)

## Supabase Project (shared with all Command Suite apps)
- **Project ID:** pbgvgjjuhnpsumnowuym
- **URL:** https://pbgvgjjuhnpsumnowuym.supabase.co

## Critical: Sensitive Data Surface

This app handles the most sensitive financial data in the suite:
  - Customer billing addresses
  - Invoice amounts, line items, payment status
  - Stripe customer IDs and subscription state
  - Payment history and outstanding balances

Get RLS wrong here and customer financial data leaks.

---

## Security Rules

1. **Row Level Security (RLS) policies** — before writing or editing ANY
   SQL that touches RLS, policies, anon access, public pages, or
   token-gated reads, read `CLAUDE_RLS.md` in the repo root. It contains
   the rules for correct policy patterns, the 2026-04-26 sales-command
   incident anti-pattern, and the 6-gate deploy requirements. The
   anti-pattern in `CLAUDE_RLS.md` is the most common RLS mistake — do
   not write policies that match it.

2. **Stripe handling** — Stripe is in LIVE mode across the Command Suite.
   Test changes accordingly. Webhook signature verification must always
   be active (a past incident in sales-command had `"Stripe Webhook"`
   with a space silently bypassing verification — verify env var names
   character-by-character).

3. **Edge function deployment** — Edge functions DO NOT auto-deploy from
   GitHub in this Supabase project. Must be deployed manually via the
   Supabase CLI. Confirm any edge function changes are actually deployed
   before considering them live.

---

## Cross-Suite Awareness

Any change to the shared Supabase database affects all 4 Command Suite
apps. Before modifying schema, RLS policies, or shared tables, check
the other 3 repos for queries against those tables:

    cd ../sales-command && grep -rn "<table_name>" src/
    cd ../sch-command && grep -rn "<table_name>" src/
    cd ../field-command && grep -rn "<table_name>" src/

A code-level fix in this repo does NOT propagate to the other 3.
