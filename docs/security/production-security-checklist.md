# Production Security Checklist

## Repository-Verifiable

- [x] Security headers and CSP are configured centrally.
- [x] Private Supabase tables have ownership RLS policies in the tracked schema.
- [x] Profile role writes are removed from authenticated client grants.
- [x] AI requests have body, history, prompt, output, timeout, retry, and rate limits.
- [x] Cookie-authenticated mutation routes validate same-origin requests.
- [x] Redirect and external-link validators reject dangerous destinations.
- [x] `.env` files are ignored and `.env.example` contains placeholders.
- [x] No Supabase service-role client exists in application source.
- [x] Security tests and `npm run security:check` are part of release verification.

## Vercel Manual Confirmation

- [ ] Set production-only secrets separately from Preview and Development.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS production origin.
- [ ] Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and a random `SECURITY_LOG_SALT` in Production.
- [ ] Restrict preview deployments and do not copy production provider keys unless required.
- [ ] Confirm the custom domain uses HTTPS and HSTS is present on production responses.
- [ ] Confirm source-map policy matches the organisation's incident-response needs.
- [ ] Review logs and analytics for personal or secret data before launch.
- [ ] Configure alerting for sustained 401, 403, 429, and provider-failure events.

## Supabase Manual Confirmation

- [ ] Apply `supabase/migrations/20260718_production_security_hardening.sql`.
- [ ] Inspect legacy rows, then validate every `NOT VALID` constraint.
- [ ] Confirm RLS is enabled in the production project for all four private tables.
- [ ] Confirm anon has no table grants on private tables.
- [ ] Confirm authenticated users cannot read or mutate another user's records.
- [ ] Set Site URL to the exact production COSMOS AI origin.
- [ ] Allow only the production and localhost `/auth/callback` URLs required by the application.
- [ ] Verify Google OAuth login, email verification, logout, and session refresh under production CSP.
- [ ] Confirm backups, recovery objectives, and restore testing ownership.

## Operational Readiness

- [ ] Review `npm audit` results and document accepted residual advisories.
- [ ] Assign incident commander and security contact coverage.
- [ ] Document provider and Supabase key-rotation steps; test rotation without downtime.
- [ ] Verify no production keys are present in Git history or preview logs.
- [ ] Perform two-account isolation tests for profiles, discoveries, and Mission Control layouts.
- [ ] Test AI 429 responses and `Retry-After` across separate serverless invocations.
- [ ] Verify NASA images, Supabase, analytics, OAuth, and embedded APOD media under production CSP.
- [ ] Re-run the full release command set immediately before monetisation work begins.
