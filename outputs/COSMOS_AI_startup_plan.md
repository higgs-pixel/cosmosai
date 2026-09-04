# COSMOS AI Startup Launch Plan

Prepared: 2026-06-17

COSMOS AI is a cinematic AI-powered space exploration website that turns NASA data, imagery, missions, and scientific archives into guided, personalized exploration. The product should feel like opening a premium interactive documentary, but behave like a trustworthy research companion.

## 1. Product Requirements Document

### Product Vision

Build the most compelling consumer gateway into space knowledge: a visually cinematic site where anyone can explore NASA imagery, missions, exoplanets, Earth events, and cosmic phenomena with an AI guide that explains, curates, and cites its sources.

### Strategic Positioning

COSMOS AI sits between three categories:

| Category | What users get today | COSMOS AI advantage |
| --- | --- | --- |
| NASA sites and archives | Authoritative, fragmented, expert-oriented | Consumer-friendly narrative, search, and AI explanation |
| Space media sites | Editorial, news-driven, less interactive | Real NASA data, source-backed AI, immersive exploration |
| AI chatbots | Broad answers, weak context, uncertain sourcing | Domain-specific retrieval over NASA-backed data and media |

### Target Users

| Segment | Need | Launch value proposition |
| --- | --- | --- |
| Curious explorers | "Show me something amazing and explain it simply." | Cinematic daily discoveries with guided AI explanations |
| Students | "Help me understand space topics without getting lost." | Cited explanations, glossary, concept paths |
| Educators | "I need credible visual material for lessons." | Curated collections, classroom-ready briefings |
| Space enthusiasts | "I want to search missions, objects, and images deeply." | Fast NASA media search plus saved collections |
| Creators and journalists | "I need reliable visuals and context." | Source-aware media pages with metadata and attribution |

### Core User Promise

"Explore the universe through NASA's real data, guided by an AI that makes every image, mission, and discovery understandable."

### Primary Goals

1. Make NASA's public space media and data emotionally engaging.
2. Help non-experts understand complex topics quickly.
3. Build trust through source citations, attribution, and transparent uncertainty.
4. Create repeat usage through daily briefings, saved collections, and guided journeys.
5. Establish a scalable platform for future simulations, personalization, education, and premium experiences.

### Non-Goals for MVP

1. No user-generated public feed.
2. No real-time multiplayer exploration.
3. No unsourced AI facts.
4. No pretending AI-generated visuals are NASA imagery.
5. No native mobile app before web product-market validation.

### MVP Experience Principles

1. Cinematic, not cluttered: full-bleed imagery, atmospheric transitions, restrained UI.
2. Trustworthy by design: citations and NASA metadata visible near AI claims.
3. Exploration-led: users can browse visually before needing to type.
4. Fast enough to feel magical: cache NASA content and stream AI responses.
5. Educational without feeling like homework: explanations adapt to beginner, student, and expert modes.

### Core MVP Features

| Feature | Description | Acceptance criteria |
| --- | --- | --- |
| Cosmic Home | Daily cinematic entry point using APOD and curated NASA media | Loads hero media, title, explanation, source, CTA to explore |
| Explore Search | Search NASA image/video library by topic, mission, center, year, and media type | Results include preview, title, NASA ID, date, media type, source |
| Media Detail | Rich page for one NASA asset | Displays preview/original links, metadata, description, attribution, related items |
| AI Mission Guide | Chat and contextual Q&A grounded in current page/media/topic | Answers with cited sources and confidence/uncertainty language |
| Guided Journeys | Editorially curated interactive paths such as "Moon", "Mars", "Nebulae", "Exoplanets" | Journey has chapters, media, short briefings, quiz/reflection prompts |
| Favorites and Collections | Save assets and journeys | Signed-in users can save, name, and revisit collections |
| Daily Briefing | Daily AI-assisted summary of APOD plus recommended exploration | Uses APOD/media metadata and links back to sources |
| Educator Mode | Simplified explainers and lesson-friendly collections | Grade-level explanation toggle and shareable collection pages |
| Admin Curation | Internal tool to pin featured topics, journeys, and source assets | Curators can publish/unpublish entries and review AI-generated summaries |

### Success Metrics

| Stage | KPI | Launch target |
| --- | --- | --- |
| Acquisition | Visitor to first interaction | 35 percent click/search/chat within first session |
| Activation | Search or journey completion | 25 percent complete one meaningful exploration |
| Engagement | Median session duration | 4 minutes or higher |
| Trust | AI answer citation coverage | 95 percent of factual AI answers cite a source |
| Retention | 7-day returning users | 15 percent for signed-in users |
| Creation | Save/share rate | 10 percent of active sessions save or share |
| Education | Educator collection starts | 500 qualified educator starts in beta |

### Key Risks

| Risk | Mitigation |
| --- | --- |
| NASA APIs are fragmented or rate-limited | Build a backend ingestion/cache layer, not direct browser dependency |
| AI hallucination harms trust | Retrieval-first answers, citation requirement, refusal/uncertainty patterns |
| Cinematic UI becomes slow | Responsive image variants, lazy loading, CDN, motion budget |
| Copyright/usage confusion | Preserve NASA metadata, show attribution, flag non-NASA or restricted assets |
| Product feels like a gallery, not a habit | Daily briefing, personalized recommendations, collections, journey progress |

## 2. Complete Sitemap

### Public Experience

| Route | Purpose |
| --- | --- |
| / | Cinematic home, daily cosmic feature, featured journeys, search entry |
| /today | Today's cosmic briefing |
| /apod | Astronomy Picture of the Day archive and explainer |
| /explore | Main discovery hub |
| /explore/search | Full NASA media search |
| /explore/topics | Topic directory |
| /explore/topics/:topic | Topic landing page, e.g. Mars, Moon, Nebulae |
| /explore/media/:nasa_id | Media detail page |
| /explore/albums/:album | NASA album page |
| /missions | Mission directory |
| /missions/:mission_slug | Mission story page |
| /journeys | Guided journey library |
| /journeys/:journey_slug | Interactive journey player |
| /exoplanets | Exoplanet discovery hub |
| /exoplanets/catalog | Filterable exoplanet table and visual explorer |
| /exoplanets/:planet_slug | Exoplanet profile |
| /earth-live | Earth natural events and orbital perspective |
| /earth-live/events/:event_id | Earth event detail |
| /ask | Standalone AI Mission Guide |
| /collections/:share_id | Public shared collection |
| /educators | Educator landing page and classroom packs |
| /about | Product mission and data/source approach |
| /sources | Data sources, attribution, API status, citation policy |
| /privacy | Privacy policy |
| /terms | Terms of service |
| /status | Public system/API status |

### Authenticated Experience

| Route | Purpose |
| --- | --- |
| /login | Sign in |
| /signup | Account creation |
| /onboarding | Interests, knowledge level, learning goals |
| /dashboard | Personalized launchpad |
| /saved | Saved media and journeys |
| /collections | Collection manager |
| /collections/new | Create collection |
| /collections/:collection_id/edit | Edit collection |
| /history | Exploration and AI chat history |
| /profile | Public/private profile |
| /settings | Account, privacy, AI preferences |
| /settings/billing | Future premium plan controls |

### Admin and Operations

| Route | Purpose |
| --- | --- |
| /admin | Internal dashboard |
| /admin/featured | Featured homepage programming |
| /admin/journeys | Journey content management |
| /admin/media-review | Review cached NASA assets and metadata |
| /admin/ai-reviews | Review generated summaries, answer quality, flagged outputs |
| /admin/sources | API health, ingestion jobs, cache freshness |
| /admin/users | User support and moderation |
| /admin/analytics | Product metrics and funnels |

### System Endpoints

| Endpoint group | Purpose |
| --- | --- |
| Auth API | Sessions, identity, profile |
| NASA proxy API | Secure server-side NASA API access and caching |
| Search API | Query, filters, ranking, media detail |
| AI API | Chat, summaries, embeddings, safety checks |
| Collections API | Saves, shares, collaboration later |
| Admin API | Curation and moderation |
| Webhooks/Jobs | Scheduled ingestion, APOD refresh, cache warming |

## 3. User Journeys

### Journey A: First-Time Curious Visitor

1. Lands on cinematic home.
2. Sees today's cosmic feature with a short, emotionally clear headline.
3. Scrolls into related media and guided journeys.
4. Clicks "Ask about this".
5. AI explains the image at beginner level with NASA citations.
6. User saves or shares the discovery.

Success moment: "I understood something awe-inspiring in under two minutes."

### Journey B: Student Learning a Topic

1. Searches "black holes" or opens topic page.
2. Filters by images, videos, and explainers.
3. Opens a guided journey.
4. Switches AI explanation level to "student".
5. Asks follow-up questions.
6. Exports/saves a small collection for homework.

Success moment: "I can explain this topic and cite where it came from."

### Journey C: Educator Preparing a Lesson

1. Opens Educators page.
2. Chooses "Mars exploration" pack.
3. Reviews curated media, glossary, and discussion prompts.
4. Uses AI to generate a 15-minute lesson outline.
5. Saves a classroom collection and shares the public link.

Success moment: "I have credible, visual material ready for class."

### Journey D: Space Enthusiast Deep Search

1. Opens Explore Search.
2. Searches "Apollo 11", filters image/video and year.
3. Opens asset detail pages.
4. Views metadata, original files, related mission assets.
5. Saves items into "Apollo references".
6. Asks AI to compare selected assets or summarize a mission phase.

Success moment: "I found the exact NASA assets and context I wanted."

### Journey E: Returning Personalized User

1. Opens dashboard.
2. Sees daily briefing plus "continue your Mars journey".
3. Gets recommendations based on saved topics.
4. Asks the AI to brief them on "what changed since my last visit".
5. Saves a new item or completes a journey chapter.

Success moment: "COSMOS AI remembers what I care about and keeps exploration alive."

### Journey F: Internal Curator

1. Admin sees pending APOD and trending searches.
2. Reviews AI-generated summary and NASA metadata.
3. Edits title/summary for clarity.
4. Publishes featured module and related journey.
5. Monitors engagement and AI answer quality.

Success moment: "The site feels fresh every day without losing editorial quality."

## 4. Feature Prioritization

### Prioritization Model

Use four lenses:

1. Launch trust: Does it prove COSMOS AI is credible?
2. Launch magic: Does it create an emotional, cinematic first impression?
3. Retention: Does it create repeat behavior?
4. Complexity: Can it be built, tested, and operated in the MVP window?

### Priority Table

| Priority | Feature | Why now | Risk |
| --- | --- | --- | --- |
| P0 | NASA media search and detail pages | Core utility and source foundation | API variability, metadata normalization |
| P0 | APOD daily home | Habit-forming, official daily content | Media can be video, copyrighted, or delayed |
| P0 | AI Mission Guide with citations | Product differentiation | Hallucination, cost, latency |
| P0 | Backend NASA proxy/cache | Required for security, speed, reliability | Cache invalidation and storage cost |
| P0 | Favorites/collections | First retention loop | Requires auth and data model |
| P0 | Cinematic responsive UI system | Brand-defining | Performance on mobile |
| P1 | Guided journeys | Turns archive into narrative product | Requires editorial work |
| P1 | Educator mode | Clear go-to-market segment | Needs careful level adaptation |
| P1 | Exoplanet explorer | High wonder and structured data | Requires query/schema design |
| P1 | Admin curation | Keeps quality high | Internal tooling cost |
| P2 | Earth live event map | Broadens scope beyond deep space | Could dilute positioning |
| P2 | Personalized recommendations | Improves retention | Needs enough user behavior |
| P2 | Voice narration | Cinematic upgrade | Accessibility and cost |
| P2 | Premium lesson/export tools | Monetization path | Too early before demand proof |
| P3 | Native mobile apps | Distribution later | Premature platform overhead |
| P3 | Social feed | Growth later | Moderation burden |
| P3 | AR/VR mode | Brand future | Heavy development and device constraints |

### MVP Must-Haves

1. Home, Explore, Media Detail, Ask, Collections.
2. NASA Images API integration.
3. APOD integration.
4. AI RAG over selected NASA source context.
5. Source attribution and citation UX.
6. Performance budget for cinematic media.
7. Basic admin curation.

### MVP Should-Haves

1. Three to five guided journeys.
2. Exoplanet starter explorer.
3. Educator explanation mode.
4. Public share links.
5. Analytics dashboard.

### MVP Could-Haves

1. Earth events map.
2. Voice narration.
3. Advanced personalization.
4. AI-generated quizzes.

## 5. Component Hierarchy

### Application Shell

| Level | Components |
| --- | --- |
| App shell | Global navigation, search trigger, account menu, theme/motion controller |
| Layout | Page frame, cinematic background layer, content bands, responsive media stage |
| Utility | Loading states, error states, empty states, source/citation badges |

### Home Page

| Parent | Children |
| --- | --- |
| CosmicHomePage | HeroMediaStage, DailyBriefingPanel, ExploreSearchBar, FeaturedJourneyRail, TopicConstellation, SavedResumePanel |
| HeroMediaStage | MediaRenderer, SourceBadge, TitleBlock, PrimaryCTA, MotionControls |
| DailyBriefingPanel | Summary, ReadMore, AskAIButton, RelatedAssets |

### Explore Search

| Parent | Children |
| --- | --- |
| ExplorePage | SearchHeader, FilterPanel, ResultsGrid, ResultsMapToggle, Pagination |
| SearchHeader | QueryInput, SuggestedQueries, MediaTypeTabs |
| FilterPanel | YearRange, NASAcenterFilter, MediaTypeFilter, TopicFilter, SortControl |
| ResultsGrid | MediaCard, SkeletonCard, EmptyState |
| MediaCard | PreviewImage, Title, MetadataRow, SaveButton, SourceBadge |

### Media Detail

| Parent | Children |
| --- | --- |
| MediaDetailPage | ImmersiveMediaViewer, MetadataPanel, AIContextPanel, RelatedMediaRail |
| ImmersiveMediaViewer | ImageViewer, VideoPlayer, AudioPlayer, ZoomControls, DownloadLinks |
| MetadataPanel | Title, Description, Date, NASAId, Center, Keywords, Attribution, SourceLinks |
| AIContextPanel | AskAboutThis, SuggestedQuestions, CitedAnswerList |

### AI Mission Guide

| Parent | Children |
| --- | --- |
| MissionGuide | ConversationThread, Composer, SourceDrawer, ModeSelector |
| ConversationThread | UserMessage, AIMessage, CitationList, ConfidenceNotice |
| Composer | PromptInput, AttachmentContext, SubmitButton, SafetyHint |
| SourceDrawer | SourceCard, RetrievedSnippet, OpenOriginalLink |

### Guided Journeys

| Parent | Children |
| --- | --- |
| JourneyPlayer | ChapterNav, SceneStage, NarrativePanel, ProgressTracker, AskInContext |
| SceneStage | MediaBackdrop, CaptionOverlay, TransitionController |
| NarrativePanel | ChapterTitle, Summary, KeyTerms, RelatedQuestions |

### Collections

| Parent | Children |
| --- | --- |
| CollectionsPage | CollectionList, CollectionEditor, ShareControls |
| CollectionEditor | CollectionTitle, Description, MediaSortableGrid, NotesPanel |

### Admin

| Parent | Children |
| --- | --- |
| AdminDashboard | SourceHealthPanel, ContentQueue, AIReviewQueue, AnalyticsSnapshot |
| JourneyCMS | ChapterEditor, AssetPicker, Preview, PublishControls |

## 6. NASA API Integration Plan

### Integration Strategy

Do not call NASA APIs directly from the browser for core experiences. Use a COSMOS backend layer that handles keys, request signing where needed, caching, normalization, retries, rate protection, observability, and source metadata.

### Primary NASA Sources

| Source | Role in product | Integration notes |
| --- | --- | --- |
| NASA Image and Video Library API | Core media search, asset detail, previews, metadata, captions, albums | REST API at https://images-api.nasa.gov with /search, /asset/{nasa_id}, /metadata/{nasa_id}, /captions/{nasa_id}, /album/{album_name} |
| APOD via NASA Open APIs | Daily feature, daily briefing, habit loop | Server-side scheduled fetch; handle image/video media types |
| NASA Exoplanet Archive TAP | Exoplanet catalog, profiles, comparisons, guided journeys | Use TAP sync for small filtered queries, async/client tooling for large datasets |
| EONET v3 | Earth natural event perspective | Use events, categories, GeoJSON for map/event layer |
| Optional future NASA feeds | TechTransfer, DONKI, NEO, EPIC, mission-specific archives | Integrate after MVP if reliable and aligned to product narratives |

### NASA Image and Video Library

Key product use:

1. Search by free text, title, description, keywords, center, media type, year range.
2. Retrieve asset manifests to locate original, medium, small, thumbnail, and metadata files.
3. Retrieve metadata for richer detail pages.
4. Retrieve captions for video/audio accessibility.
5. Use albums for curated experiences where available.

Normalization model:

| NASA field | COSMOS normalized field |
| --- | --- |
| nasa_id | source_asset_id |
| title | title |
| description | description |
| date_created | captured_at or published_at |
| center | nasa_center |
| media_type | media_type |
| keywords | tags |
| preview link | preview_url |
| asset manifest hrefs | derivative_assets |

Caching:

1. Cache search results by normalized query/filter signature for 1 to 24 hours.
2. Cache asset details and metadata long-term because historic media changes rarely.
3. Store only metadata and asset URLs initially; avoid storing NASA media binaries unless needed for thumbnails/CDN transforms and usage permits.
4. Warm cache for featured topics and home modules.

### APOD

Key product use:

1. Daily home hero.
2. Daily AI briefing.
3. APOD archive browsing.
4. Related topic recommendations from APOD title/explanation.

Operational handling:

1. Run a scheduled ingestion job once daily, with retry and manual admin refresh.
2. Support media_type image and video.
3. Preserve title, explanation, date, copyright, url, hdurl, media_type.
4. If the current APOD fails, fall back to most recent cached APOD and show freshness status internally.

### Exoplanet Archive TAP

Key product use:

1. Exoplanet catalog filters: size, mass, discovery method, discovery year, host star, orbital period.
2. Exoplanet profile pages.
3. "Earth-like worlds" and "strange worlds" guided journeys.
4. AI answers grounded in structured table rows.

Operational handling:

1. Use a backend query builder with allowlisted tables and columns.
2. Cache common catalog views.
3. Snapshot important fields nightly into COSMOS database for fast product queries.
4. Keep raw source references and last_synced timestamps.

### EONET v3

Key product use:

1. Earth-live map showing open natural events.
2. "Earth from space" educational stories.
3. Natural event pages with geometry, categories, sources, and magnitudes.

Operational handling:

1. Fetch open events with category/status/date filters.
2. Store GeoJSON geometry and source links.
3. Respect disclaimer language and show source metadata.

### Reliability, Security, and Governance

1. NASA API keys live only in server secrets.
2. All requests use backend rate limits per IP/user/session.
3. Track API latency, error rate, cache hit rate, and freshness.
4. Keep source_url, source_name, source_updated_at, ingestion_job_id on every normalized record.
5. Add a public data source page explaining what is NASA-sourced, AI-generated, and editorially curated.

## 7. AI Integration Plan

### AI Product Roles

| AI role | User-facing behavior | Launch priority |
| --- | --- | --- |
| Mission Guide | Answers user questions about current page, media, journey, or topic | P0 |
| Briefing Generator | Summarizes APOD and featured topics in plain language | P0 |
| Semantic Search Assistant | Expands vague user queries into better NASA searches | P1 |
| Educator Assistant | Produces grade-level explanations, lesson prompts, and quizzes | P1 |
| Curator Copilot | Helps internal team draft journey copy from NASA sources | P1 internal |
| Narration Engine | Creates optional audio-style scripts | P2 |

### AI Architecture

1. Retrieval first: AI answers pull from normalized NASA metadata, selected source snippets, and curated content.
2. Citations required: Factual answers must attach source IDs/URLs.
3. Page context aware: When user asks from a media page, the AI prioritizes that media's metadata and related sources.
4. User-level adaptation: Beginner, student, enthusiast, and educator modes adjust vocabulary and depth.
5. Source boundary: If retrieval lacks support, AI says what is uncertain and offers a source-backed search.

### RAG Content Sources

| Source | Indexed content |
| --- | --- |
| NASA media metadata | Titles, descriptions, keywords, dates, centers, NASA IDs |
| APOD records | Title, date, explanation, media metadata |
| Exoplanet rows | Planet name, host star, discovery method, physical/orbital fields |
| Journey editorial content | Curated chapters, summaries, glossary |
| EONET events | Event title, category, geometry summary, source |

### AI Safety and Trust Rules

1. Never invent NASA mission facts, dates, or discoveries.
2. Show citations inline or in a source drawer.
3. Clearly label AI-generated summaries and educational adaptations.
4. Distinguish NASA imagery from artist renderings and AI-generated visuals.
5. If asked for unsupported claims, respond with uncertainty and suggest source-backed search.
6. Keep child/student modes age-appropriate and privacy-safe.
7. Log answer quality signals for review, but avoid storing sensitive personal content unnecessarily.

### AI Cost and Latency Controls

1. Cache common APOD briefings and topic summaries.
2. Use smaller/cheaper models for classification, query expansion, and summarization drafts.
3. Use stronger models for multi-source explanations and educator content.
4. Stream chat responses.
5. Limit retrieval context by page/topic and source quality.
6. Add monthly cost dashboards by feature, user tier, and model task.

### AI Evaluation

| Evaluation | Method |
| --- | --- |
| Citation coverage | Automated check that factual answers include sources |
| Faithfulness | Compare generated answer claims against retrieved context |
| Helpfulness | User thumbs up/down plus qualitative review |
| Safety | Red-team prompts for hallucination, unsafe advice, copyrighted content |
| Latency | P50/P95 response timing by task |
| Cost | Cost per active user, cost per AI conversation, cache savings |

## 8. Technical Architecture

### Recommended Stack

| Layer | Recommendation | Rationale |
| --- | --- | --- |
| Frontend | Next.js or equivalent React framework | SEO, dynamic routes, rich UI, server rendering |
| Styling/UI | Design system with responsive tokens, motion budget, accessibility states | Cinematic but maintainable |
| 3D/visual effects | Three.js/WebGL only where it supports exploration | Immersion without overloading every page |
| Backend | Node/TypeScript or equivalent API service | Shared language with frontend, strong ecosystem |
| Database | PostgreSQL | Relational source metadata, users, collections, auditability |
| Cache/queue | Redis plus background jobs | NASA API caching, rate limits, scheduled ingestion |
| Search | Postgres full-text for MVP, dedicated search engine later | Reduce complexity at launch |
| Vector search | pgvector or managed vector DB | AI retrieval over source metadata/content |
| Object storage | S3-compatible storage | Generated thumbnails, cached derivatives, exports |
| CDN | Global CDN | Fast media-heavy experience |
| Analytics | Product analytics plus server observability | Launch learning and reliability |

### Architecture Layers

| Layer | Responsibilities |
| --- | --- |
| Web client | Cinematic UI, search UX, media rendering, chat UI, collection management |
| BFF/API layer | Auth, user data, search, collections, AI orchestration, NASA proxy |
| Ingestion workers | APOD refresh, NASA media metadata enrichment, exoplanet snapshots, EONET refresh |
| Data layer | Normalized records, source records, user records, embeddings, audit logs |
| AI layer | Retrieval, prompt assembly, model calls, safety checks, citations |
| Admin layer | Curation, quality review, API status, feature programming |

### Key Service Boundaries

| Service | Responsibilities |
| --- | --- |
| Auth service | Login, sessions, profile, privacy preferences |
| Source ingestion service | Fetches NASA/APOD/EONET/Exoplanet data and records provenance |
| Media service | Search, asset detail, derivative selection, related media |
| AI orchestration service | Retrieves context, calls models, validates citation coverage |
| Collection service | Saves, folders, sharing, permissions |
| Curation service | Featured modules, journeys, editorial review |
| Analytics service | Funnels, events, API health, AI quality |

### Performance Requirements

| Metric | Target |
| --- | --- |
| Home LCP | Under 2.5 seconds on strong connections, under 4 seconds on average mobile |
| Search response | Under 700 ms from COSMOS cache; under 2.5 s on cold NASA fetch |
| Media detail | Under 1.5 s for cached metadata |
| AI first token | Under 2 seconds for cached/retrieved context |
| Cache hit rate | 80 percent or higher for featured/home/search common queries |

### Accessibility Requirements

1. Motion reduction setting.
2. Keyboard navigation for search, media viewer, chat, and journey player.
3. Captions for video when available.
4. Alt text sourced from metadata plus reviewed AI assistance.
5. High-contrast readable overlays on cinematic media.
6. No text trapped inside images.

## 9. Database Schema

This is a product-level schema, not implementation code.

### Core Identity

| Table | Key fields | Purpose |
| --- | --- | --- |
| users | id, email, name, role, created_at, last_seen_at | Account identity |
| user_profiles | user_id, interests, knowledge_level, educator_flag, preferences | Personalization |
| sessions | id, user_id, started_at, ended_at, device_summary | Product analytics and continuity |

### Source and Media

| Table | Key fields | Purpose |
| --- | --- | --- |
| sources | id, name, base_url, source_type, attribution_policy, active | Registry for NASA and editorial sources |
| source_assets | id, source_id, source_asset_id, source_url, raw_payload, fetched_at, checksum | Raw provenance record |
| media_assets | id, source_asset_id, nasa_id, title, description, media_type, date_created, nasa_center, preview_url, original_url, metadata_url, rights_note | Normalized media detail |
| media_derivatives | id, media_asset_id, derivative_type, url, width, height, file_format | Thumbnail/original/medium variants |
| media_tags | id, name, type | Searchable tags |
| media_asset_tags | media_asset_id, tag_id, confidence, source | Tag associations |

### APOD and Editorial Content

| Table | Key fields | Purpose |
| --- | --- | --- |
| apod_entries | id, date, title, explanation, media_type, url, hdurl, copyright, source_asset_id | Daily APOD archive |
| topics | id, slug, title, description, parent_topic_id | Topic taxonomy |
| journeys | id, slug, title, description, audience_level, status, published_at | Guided journeys |
| journey_chapters | id, journey_id, order_index, title, body, primary_media_asset_id | Journey structure |
| chapter_assets | chapter_id, media_asset_id, role, order_index | Supporting media |
| glossary_terms | id, term, short_definition, long_definition, topic_id | Learning support |

### Exoplanets and Earth Events

| Table | Key fields | Purpose |
| --- | --- | --- |
| exoplanets | id, source_row_id, planet_name, host_name, discovery_year, discovery_method, radius_earth, mass_earth, orbital_period_days, distance_parsec, last_synced_at | Fast exoplanet product queries |
| exoplanet_facts | id, exoplanet_id, label, value, unit, source_reference | Flexible scientific facts |
| earth_events | id, eonet_id, title, category, status, geometry, magnitude_value, magnitude_unit, started_at, ended_at, source_url | Earth-live event pages |

### AI and Retrieval

| Table | Key fields | Purpose |
| --- | --- | --- |
| documents | id, source_type, source_record_id, title, body, source_url, updated_at | Text chunks for retrieval |
| document_chunks | id, document_id, chunk_index, text, token_count | RAG chunks |
| embeddings | id, chunk_id, embedding_model, vector, created_at | Semantic retrieval |
| ai_conversations | id, user_id, context_type, context_id, started_at | AI chat history |
| ai_messages | id, conversation_id, role, content, created_at, safety_status | Conversation messages |
| ai_citations | id, message_id, source_type, source_record_id, source_url, quote_or_summary | Source grounding |
| ai_feedback | id, message_id, user_id, rating, reason, created_at | Quality loop |

### Collections and Sharing

| Table | Key fields | Purpose |
| --- | --- | --- |
| collections | id, owner_user_id, title, description, visibility, share_slug, created_at | User saved collections |
| collection_items | id, collection_id, item_type, item_id, note, order_index | Saved media/journeys/exoplanets |
| shares | id, collection_id, share_token, permission, expires_at | Public/private sharing |

### Operations

| Table | Key fields | Purpose |
| --- | --- | --- |
| ingestion_jobs | id, source_id, job_type, status, started_at, finished_at, records_processed, error_summary | Source reliability |
| api_request_logs | id, source_id, route, status_code, latency_ms, cache_hit, created_at | API monitoring |
| admin_reviews | id, item_type, item_id, status, reviewer_id, notes, reviewed_at | Editorial and AI review |
| feature_flags | id, key, description, enabled, rollout_rules | Controlled releases |

## 10. Deployment Architecture

### Environments

| Environment | Purpose |
| --- | --- |
| Local | Development and integration testing |
| Preview | Per-branch stakeholder review |
| Staging | Production-like QA, API key validation, migration tests |
| Production | Public launch |

### Production Architecture

| Component | Deployment recommendation |
| --- | --- |
| Web app | Edge-capable hosting with CDN |
| API service | Containerized service or serverless functions depending on traffic profile |
| Background workers | Managed container workers or queue consumers |
| PostgreSQL | Managed database with backups and point-in-time recovery |
| Redis | Managed cache for rate limits, sessions, queues, hot results |
| Object storage | S3-compatible bucket for generated derivatives and exports |
| CDN | Fronts web app, static assets, optimized media |
| Secrets | Managed secret store for NASA API keys and AI provider credentials |
| Observability | Logs, traces, uptime checks, API health, AI quality dashboards |

### Deployment Flow

1. Pull request creates preview environment.
2. Automated checks run for accessibility, performance budgets, unit/integration tests, and API contract mocks.
3. Staging deploy runs database migrations and NASA integration smoke tests.
4. Production deploy uses blue/green or rolling release.
5. Feature flags gate risky AI, personalization, and new data-source features.
6. Rollback plan includes previous web build, API version, and migration strategy.

### Security and Privacy

1. Server-only NASA and AI keys.
2. Auth sessions protected with secure cookies or equivalent.
3. Role-based access for admin tools.
4. Least-privilege database access.
5. AI logs scrubbed for unnecessary personal data.
6. Public collection sharing uses unguessable tokens/slugs.
7. Backups encrypted at rest.

### Launch Reliability Targets

| System | Target |
| --- | --- |
| Public web uptime | 99.9 percent |
| Source ingestion job success | 99 percent daily |
| AI answer availability | Graceful fallback to source search if model unavailable |
| Search availability | Cached search and featured content available even if NASA source is temporarily down |

## 11. MVP Roadmap

### Phase 0: Validation and Design Foundation, Weeks 1-2

Deliverables:

1. Brand direction and cinematic design language.
2. Information architecture and clickable prototype.
3. NASA source spike: Images API, APOD, Exoplanet TAP.
4. AI grounding prototype over a small NASA media corpus.
5. Performance proof for full-bleed media home.

Decision gate:

1. Can users understand the product in under 10 seconds?
2. Can AI answer with citations reliably?
3. Can the team fetch and normalize core NASA data?

### Phase 1: Core Product Build, Weeks 3-6

Deliverables:

1. Home with APOD and featured content.
2. Explore Search and Media Detail.
3. NASA media ingestion/cache layer.
4. Basic auth.
5. Favorites and collections.
6. AI Mission Guide on media/topic context.

Decision gate:

1. Search is useful and fast.
2. AI answers are source-grounded.
3. Cinematic UI performs acceptably on mobile.

### Phase 2: Narrative and Trust, Weeks 7-9

Deliverables:

1. Three to five guided journeys.
2. Source/citation drawer.
3. Admin curation MVP.
4. APOD daily briefing.
5. Public share collections.
6. AI quality review workflow.

Decision gate:

1. Users complete journeys.
2. Curators can publish without engineering help.
3. AI answer review shows low hallucination risk.

### Phase 3: Beta Launch, Weeks 10-12

Deliverables:

1. Private beta with students, educators, space enthusiasts.
2. Analytics dashboards.
3. Performance and accessibility pass.
4. Error states and source outages handled.
5. Educator mode starter pack.
6. Launch content calendar.

Decision gate:

1. Activation rate over 25 percent.
2. Median session duration over 4 minutes.
3. AI satisfaction positive ratio over 70 percent.
4. No major trust/sourcing incidents.

### Phase 4: Public MVP Launch, Weeks 13-14

Deliverables:

1. Public launch site.
2. Press/demo package.
3. Founder story and product narrative.
4. Featured daily content operations.
5. Support and feedback loop.
6. Post-launch roadmap prioritization based on data.

## 12. Future Roadmap

### 3-6 Months After Launch

1. Personalized cosmic dashboard.
2. Exoplanet explorer with visual comparisons.
3. Earth-live event map using EONET.
4. Educator workspaces and downloadable lesson packs.
5. Better semantic search and recommendations.
6. Voice narration for journeys.
7. Advanced admin analytics.

### 6-12 Months

1. Premium educator tier.
2. Creator/journalist research workspaces.
3. Collaborative collections.
4. Multilingual explanations.
5. Public API for curated COSMOS collections.
6. Deeper mission pages with timelines and source packages.
7. AI-generated quizzes and learning checkpoints.

### 12-24 Months

1. Interactive 3D solar system and mission simulations.
2. AR sky overlays and object explainers.
3. Native mobile app if web retention justifies it.
4. Partnerships with schools, museums, planetariums, and science creators.
5. Live event programming around launches, eclipses, meteor showers, and NASA announcements.
6. Research-grade mode for advanced hobbyists and educators.

### Business Model Evolution

| Stage | Model |
| --- | --- |
| MVP | Free consumer product, educator beta, brand/community growth |
| Early scale | Premium educator exports, classroom packs, advanced collections |
| Growth | Institutional subscriptions for schools/museums |
| Expansion | Sponsorships around space education events, API/data products, creator tools |

## Launch Thesis

COSMOS AI should not compete by having "more space content." NASA already has the content. COSMOS AI wins by turning authoritative but scattered source material into an emotionally powerful, understandable, and repeatable exploration habit.

The MVP should prove three things:

1. Cinematic exploration can make NASA data feel alive.
2. Source-grounded AI can make space knowledge easier to understand without losing trust.
3. Collections, daily briefings, and guided journeys can create retention beyond one-off search.

## Source Notes

NASA Open APIs and API key entry point: https://api.nasa.gov/

NASA Image and Video Library API documentation: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf

NASA Exoplanet Archive TAP documentation: https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html

NASA EONET v3 documentation: https://eonet.gsfc.nasa.gov/docs/v3

