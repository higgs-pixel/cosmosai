# COSMOS AI Security Controls

## Authentication

Supabase OAuth and email flows use PKCE. Access and refresh tokens are held in `HttpOnly`, `SameSite=Lax` cookies and marked `Secure` in production. Protected pages and API routes resolve the session on the server. Callback destinations pass through an internal-path validator and are built from the configured trusted site origin.

## Authorization And RLS

The authenticated Supabase user ID is the sole ownership authority. Saved discoveries and Mission Control layouts include `user_id` in every read, update, and delete filter. Database RLS independently enforces `auth.uid()` ownership. Profile grants allow users to edit only `full_name` and `avatar_url`; the `role` column is not client-writable.

Apply `supabase/migrations/20260718_production_security_hardening.sql` in production and inspect legacy rows before validating its `NOT VALID` constraints.

## Input And Request Limits

Security utilities reject malformed JSON, oversized bodies, unknown fields, invalid IDs, unsafe URLs, oversized arrays, and invalid widget layouts at route boundaries. External API requests use bounded timeouts and response-size ceilings. AI history, messages, context, output, and retries remain bounded.

## AI Abuse Protection

Ask COSMOS uses separate anonymous and authenticated limits. Anonymous actors receive 5 requests per ten minutes and 10 per day; authenticated actors receive 10 per ten minutes and 50 per day. Actor identifiers are pseudonymised. Production requires the Upstash REST store and fails closed when it is unavailable. Development uses an in-memory store only.

## Secrets

Provider keys remain in server-only modules and never use the `NEXT_PUBLIC_` prefix. The Supabase URL and publishable key are intentionally public. No service-role client exists in this repository. `.env` files are ignored; `.env.example` contains placeholders only.

## Browser Protections

Next.js applies CSP, HSTS in production, MIME sniffing protection, a strict referrer policy, restrictive permissions policy, frame blocking, COOP, and CORP. Internal APIs do not set permissive CORS headers. Cookie-authenticated mutations validate their origin.

AI and external metadata render as escaped React text. Markdown raw HTML is not enabled. Link destinations allow only safe web protocols and reject credentials, local/private networks, cloud metadata targets, and script/data URLs.

## Errors And Logging

Public errors are generic and may include a request ID. Security events are structured and contain a timestamp, event, endpoint, request ID, pseudonymised actor, and non-sensitive reason. Tokens, cookies, passwords, keys, and full AI prompts must never be logged.

## Deployment

Run `npm run security:check`, tests, the production build, and `npm audit` before each release. Dashboard-only controls are listed in `production-security-checklist.md` and must be confirmed separately.
