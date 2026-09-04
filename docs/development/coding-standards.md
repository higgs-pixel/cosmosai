# Coding Standards

## Configuration

- Add variables to `environment-schema.ts` and the appropriate server or client adapter.
- Add tests for valid, missing, and malformed values.
- Preserve existing names unless a separately approved migration includes compatibility coverage.
- Add safe placeholders and required/optional notes to `.env.example`.
- Never read `process.env` in feature code.
- Production must provide a canonical site URL directly or through Vercel host variables; localhost defaults are development/test only.
- `SERVER_FETCH_TIMEOUT_MS` is the bounded default for shared server fetches. Feature-specific shorter deadlines may override it explicitly.

## Errors

- Use `AppError` for expected application failures.
- Choose an existing stable code before adding a new one.
- Keep `publicMessage` safe and actionable; put provider/database details only in `internalMessage`.
- Metadata must be structured and must not contain raw credentials.
- Unknown values are normalized at the boundary and never returned verbatim.

To add an error code, update `error-codes.ts` with its HTTP status, default public message, and retryability, then extend the mapping tests.

## Validation

- Treat external values as `unknown`.
- Use feature-local Zod schemas for route payloads and query parameters.
- Use shared primitives only when at least two features need the same semantic constraint.
- Convert values with `parseInput` or `safeParseInput`; use `parseJsonRequest` for bounded JSON request bodies.
- Use strict object schemas at trust boundaries unless unknown fields are intentionally supported and documented.
- Do not expose Zod issue text to users; path and code metadata are internal diagnostics.

Central limits document defaults for text, arrays, pagination, URLs, and identifiers. A feature may choose a stricter limit but must not silently exceed the shared safety ceiling.

## Verification

Before review, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run security:check
npm run architecture:check
npm run build
```

The test scripts verify every listed test file exists before invoking Node's test runner. The repository does not yet have a dedicated formatter command; ESLint is the current executable style gate.
