# ADR 0001: Centralized Configuration, Typed Errors, and Enforced Boundaries

- Status: Accepted
- Date: 2026-07-20

## Context

Configuration reads, validation, and error responses had grown independently across routes and provider modules. This made secret exposure, inconsistent HTTP semantics, and architectural drift harder to detect.

## Decision

COSMOS AI will use:

- a Zod-validated server/client configuration boundary;
- a stable `AppErrorCode` taxonomy and safe public error envelope;
- feature-local schemas backed by small shared validation primitives;
- an executable architecture check with exact, reasoned exceptions.

The existing `src/lib/env.ts` API remains as a compatibility facade. Existing routes are not migrated wholesale; `/api/earth/weather` is the reference implementation for this phase.

## Consequences

- Invalid production configuration fails with variable names but never values.
- Vercel host variables satisfy canonical URL validation; every other production build must provide `NEXT_PUBLIC_SITE_URL` and cannot fall back to localhost.
- Client configuration cannot gain a variable accidentally through object spreading.
- New direct environment reads, transitive server imports in client modules, stale exception paths, static cycles, and oversized files fail CI/local checks.
- Legacy exceptions remain visible technical debt and must be removed incrementally.

## Alternatives Considered

- Hand-written parsing was rejected because coercion and deterministic issue handling would be duplicated.
- A full route migration was rejected as too broad for the foundation phase.
- A large architecture framework was rejected in favor of a small repository-specific static checker.
