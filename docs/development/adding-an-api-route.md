# Adding an API Route

1. Create a small `route.ts` delivery adapter.
2. Put route-specific Zod schemas beside the route.
3. Parse all query, path, and header values from `unknown`; parse JSON bodies with `parseJsonRequest` and a strict schema.
4. Perform authentication, authorization, origin checks, and rate limiting before provider work.
5. Delegate business logic to a service or handler with injectable dependencies.
6. Return the existing success envelope required by the feature contract.
7. Convert expected failures to `AppError` and serialize this public shape:

```ts
type PublicErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    retryable: boolean;
  };
};
```

8. Set explicit cache behavior. Error responses containing request IDs should use `no-store`.
9. Add tests for success, invalid input, provider failure, and sensitive-detail redaction.
10. Run `npm run architecture:check`.

`/api/earth/weather` is the Phase 1 reference. Its handler is dependency-injected for contract tests; provider failure retains the existing successful fallback payload, while invalid input uses the standardized error envelope.
