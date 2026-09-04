# COSMOS AI Groq Migration

Ask COSMOS now uses a provider abstraction:

1. Groq when `GROQ_API_KEY` is configured.
2. Existing OpenAI provider when Groq is not configured and `OPENAI_API_KEY` exists.
3. COSMOS educational fallback when no live AI provider is available.

## Required Environment Variables

```bash
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

Optional fallback:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

## Provider Behavior

- Groq endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Default model: `llama-3.3-70b-versatile`
- Temperature: `0.3`
- Max output: bounded to keep cost and latency controlled
- Streaming: preserved through the existing `/api/ai/chat` stream response
- Headers: existing UI metadata headers are preserved, with `x-cosmos-ai-source: groq`

## Context Injection

Before the provider call, `/api/ai/chat` still gathers:

- NASA context
- OpenAlex research context
- Existing tool summaries
- New external intelligence context from CORE, arXiv, weather, observing, air quality, ISRO, USGS, sunrise/sunset, World Bank, and Wikidata when the user intent matches

The model receives source summaries, not raw upstream JSON.

## Fallback Behavior

User-facing fallback copy avoids infrastructure details. If a provider fails, COSMOS responds with:

> COSMOS is using available astronomy and space-science context for this answer.

The response remains educational and avoids inventing live facts.

## Known Limitations

- Rate limiting is still in-memory.
- Some providers require keys and will gracefully return unavailable states until configured.
- Arcsecond support is a safe wrapper; deeper catalog integration should be completed after endpoint verification.
- No hidden paid AI calls are made; Ask COSMOS calls the AI provider only after explicit user action.
