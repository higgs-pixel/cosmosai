# COSMOS AI Architecture Overview

COSMOS AI is a Next.js App Router application. Pages and route handlers form the delivery layer, shared domain and integration code lives under `src/lib` and `src/services`, and browser-facing UI lives under `src/components`.

## Foundation Boundaries

1. Configuration enters through `src/lib/config`.
2. Untrusted input is parsed through `src/lib/validation` or a feature-local schema.
3. Expected failures use `AppError` from `src/lib/errors`.
4. Route handlers translate errors to the public error envelope at the HTTP boundary.
5. Client components never import server-only configuration or integration modules.

The intended dependency direction is:

```text
app routes and components
        |
        v
feature/application services
        |
        v
shared lib contracts and provider adapters
```

Shared libraries must not import the `app` or `components` layers. Provider adapters must not import UI code. Route handlers should validate, authorize, delegate, and serialize; they should not become orchestration modules.

## Runtime Boundaries

- `src/lib/config/env.server.ts` is server-only and may contain secrets.
- `src/lib/config/env.client.ts` exposes an explicit `NEXT_PUBLIC_*` allowlist.
- `src/lib/env.ts` is the compatibility facade used by existing providers; it now delegates to validated server configuration.
- Optional NASA, research, AI, and Supabase integrations must retain their documented fallback behavior.

## Enforcement

Run `npm run architecture:check`. The check rejects direct environment access, transitive client-to-server imports, inverted shared-layer imports, static import cycles, missing exception targets, and new files over 1,000 lines. Exact legacy exceptions live in `architecture.config.mjs` and require a reason.
