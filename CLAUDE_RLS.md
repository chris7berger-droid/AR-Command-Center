# Row Level Security (RLS) — Critical Rules

This project handles accounts receivable data — the most sensitive
financial information in the Command Suite. Get RLS wrong and customer
billing data leaks. Read carefully.

## The anti-pattern that caused incident 2026-04-26 (sales-command)

Policies that grant anon access based only on a column being non-null:

    FOR SELECT TO anon
    USING (signing_token IS NOT NULL)

This is INSECURE. The publishable anon key ships in the browser bundle.
Anyone holding it can call PostgREST directly without the WHERE clause
the React app adds, and read every row where the column is non-null.

NEVER write a policy in this shape. Client-side filtering does NOT count
as enforcement.

## The correct pattern for token-gated public access

If AR Command Center exposes public-facing pages (customer payment
portal, invoice viewing without login, etc.), pass the token via a
custom request header and match it inside the policy:

    FOR SELECT TO anon
    USING (
      <token_column> IS NOT NULL
      AND <token_column>::text = public.request_<name>_token()
    )

Helper functions live in the shared database. They read the relevant
header from current_setting('request.headers'). Pattern is established
in sales-command — see sales-command/src/lib/supabasePublic.js for the
client-side companion.

For invoices specifically, the existing `viewing_token` column and
`request_viewing_token()` helper function are already in place from
the 2026-04-27 sales-command fix. Reuse them — don't create new ones.

## The correct pattern for authenticated user access

Office staff sign in to AR Command Center, so most data access is via
the authenticated role. Use auth.uid() to scope rows to the current user:

    FOR SELECT TO authenticated
    USING (tenant_id = public.get_user_tenant_id())

Or for user-owned rows directly:

    FOR SELECT TO authenticated
    USING (user_id = auth.uid())

## When this rule applies

Any time you write or modify SQL touching:
  - Files in supabase/migrations/ or sql/
  - Anything mentioning RLS, policies, anon access, public access, or
    token-gated reads
  - Any new public-facing page (customer payment portal, invoice viewer,
    statement download, etc.)

## Deploy gates for any RLS or auth change

The 6-gate deploy pattern from the 2026-04-26 incident is non-negotiable:

  1. Build all changes on a branch (do NOT touch main)
  2. Vercel preview deploy auto-builds
  3. Test on preview URL in incognito (real anon conditions)
  4. Merge PR — frontend deploys; old policies still active
  5. Test on PRODUCTION before tightening any DB policies
  6. Apply additive migration (new policies alongside old)
  7. Test on production again (overlap window)
  8. Apply drop migration (old policies removed)
  9. Test on production a third time (strict enforcement only)
  10. Commit drop migration + rollback to main as a record

Do not skip gates.

## Cross-repo impact

The Supabase database is SHARED across all 4 Command Suite repos:
  sales-command, sch-command, field-command, AR-Command-Center

Tables most likely to be affected by AR-side RLS work:
  invoices, invoice_lines, customers, customer_contacts,
  billing_schedule, billing_schedule_lines, billing_schedule_pay_apps,
  billing_schedule_pay_app_lines, customer_pay_app_templates,
  tenant_config, team_members

These are SHARED. Sales-command in particular reads/writes invoices
heavily. Any policy change must be checked against the other 3 repos:

    cd ../sales-command && grep -rn "<table_name>" src/
    cd ../sch-command && grep -rn "<table_name>" src/
    cd ../field-command && grep -rn "<table_name>" src/

If sibling repos query the same table as anon WITHOUT the new pattern,
they will break or remain vulnerable.

## Reference implementation

The token-gated public access pattern was implemented in sales-command
on 2026-04-27. See:
  sales-command/CLAUDE_RLS.md
  sales-command/src/lib/supabasePublic.js
  sales-command/supabase/migrations/20260427180000_add_token_gated_policies.sql
