const architectureConfig = {
  environmentAccess: {
    allowed: [
      "next.config.ts",
      "src/lib/config/env.client.ts",
      "src/lib/config/env.server.ts",
    ],
    exceptions: {
      "src/components/analytics/vercel-observability.tsx":
        "Next.js compile-time NODE_ENV branch; migrate when observability is moved behind configuration.",
      "src/lib/retrieval/research-retrieval.ts":
        "Development-only diagnostic fields; migrate with the retrieval boundary in Phase 2.",
      "src/lib/security/logger.ts":
        "Existing security logging secret access; migrate after security characterization tests are expanded.",
      "src/lib/security/origin.ts":
        "Existing origin validation boundary; migration is deferred to avoid auth behavior changes.",
      "src/lib/security/rate-limit.ts":
        "Existing distributed rate-limit adapter; migration is deferred with the security boundary.",
      "src/lib/security/site-origin.ts":
        "Existing canonical-origin helper; migration is deferred to preserve auth redirects.",
      "src/lib/site-url.ts":
        "Framework metadata URL resolution uses Vercel variables and is deferred from Phase 1.",
      "src/utils/supabase/client.ts":
        "Next.js must inline explicit NEXT_PUBLIC Supabase reads in the browser helper.",
      "src/utils/supabase/middleware.ts":
        "Existing authentication middleware boundary; migration is deferred to preserve session refresh.",
      "src/utils/supabase/server.ts":
        "Existing authentication and repository facade; migration is explicitly outside Phase 1.",
    },
  },
  clientServerImports: {
    exceptions: {},
  },
  layerDirection: {
    exceptions: {},
  },
  oversizedFiles: {
    maxLines: 1_000,
    exceptions: {
      "src/app/api/ai/chat/route.ts":
        "Existing Ask COSMOS orchestration route; pipeline extraction is explicitly deferred.",
      "src/components/assistant/cosmos-assistant.tsx":
        "Existing large chat surface; component extraction is explicitly deferred.",
      "src/components/briefing/mission-control-briefing.tsx":
        "Existing briefing dashboard; component extraction is explicitly deferred.",
      "src/components/earth/live-earth-dashboard.tsx":
        "Existing Earth dashboard; component extraction is explicitly deferred.",
      "src/components/image-explorer/nasa-image-explorer.tsx":
        "Existing large explorer surface; component extraction is explicitly deferred.",
      "src/components/solar-system/solar-system-explorer.tsx":
        "Existing large Three.js surface; component extraction is explicitly deferred.",
      "src/services/openai/chat.service.ts":
        "Existing Ask COSMOS provider orchestration; extraction is deferred until the merged provider behavior is characterized.",
    },
  },
};

export default architectureConfig;
