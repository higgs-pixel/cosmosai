# Module Boundaries

## Allowed Dependency Directions

| From | May depend on | Must not depend on |
| --- | --- | --- |
| `src/app` | components, feature services, shared libraries | browser globals in server handlers |
| `src/components` | browser-safe hooks, utilities, public types | `server-only`, `*.server.ts`, secret configuration |
| `src/services` | shared libraries, provider contracts | app routes, UI components |
| `src/lib` | other lower-level libraries | app routes, UI components |
| `src/lib/config/env.server.ts` | environment schema | client components |
| `src/lib/config/env.client.ts` | environment schema | server secrets |

Feature-specific schemas belong beside their route or feature. Only genuinely reused primitives belong in `src/lib/validation`.

## Approved Phase 1 Exceptions

The executable source of truth is `architecture.config.mjs`. Current exceptions are narrow and temporary:

- Supabase client, middleware, and server helpers retain direct environment reads to preserve auth/session behavior.
- `src/lib/site-url.ts` retains framework/Vercel URL resolution.
- Vercel observability retains its compile-time `NODE_ENV` read.
- Existing oversized Ask COSMOS, briefing, Earth, image explorer, and Solar System modules are deferred from this phase.

Adding an exception requires an existing exact file path, a concrete reason, and review. Missing paths and broad directory exclusions are rejected.

## Server and Client Rules

- Never import `env.server.ts` from a file containing `"use client"`.
- Type-only imports are excluded from runtime dependency checks, and `"use server"` modules are treated as explicit Next.js server-action boundaries.
- Never export server configuration through a barrel used by client code.
- Only `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are in the current client allowlist.
- Do not put provider credentials, service-role keys, tokens, or logging salts in client configuration.
