# COSMOS AI Data Sources

COSMOS AI now has a server-side external intelligence layer. All private keys stay on the server. Routes return normalized, bounded data and clean unavailable states rather than raw upstream errors.

| API name | Purpose | Env variable | Auth | Internal route | App usage | Refresh interval | Fallback behavior | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NASA APIs | APOD, asteroids, DONKI, Mars, media | `NASA_API_KEY` | Server key | Existing `/api/nasa/*`, `/api/cosmos/daily-intelligence` | Briefing, APOD, Ask COSMOS, Earth | 15m-1h | Existing NASA fallbacks | Live |
| OpenAlex | Papers, authors, institutions, topics | `OPENALEX_EMAIL`, optional `OPENALEX_API_KEY` | Server polite-pool email/key | `/api/cosmos/research`, `/api/cosmos/latest-papers` | Ask COSMOS research context | 30m-1h | Omits unavailable records | Live |
| CORE | Open-access research papers | `CORE_API_KEY` | Server bearer token | `/api/cosmos/research` | Ask COSMOS research context | 1h | Empty CORE results if not configured | Implemented |
| arXiv | Astronomy/physics preprints | `ARXIV_BASE_URL` | None | `/api/cosmos/research`, `/api/cosmos/latest-papers` | Ask COSMOS research context | 1h | Empty arXiv results if unavailable | Implemented |
| Weatherstack | Current weather by location | `WEATHERSTACK_API_KEY` | Server key | `/api/cosmos/weather` | Ask COSMOS, future Earth widgets | 10-30m | Reports not configured/unavailable | Implemented |
| Open-Meteo | Free current forecast by coordinates | `OPEN_METEO_BASE_URL` | None | `/api/cosmos/open-meteo` | Earth, Ask COSMOS, observing context | 10-30m | Clean unavailable response | Live |
| 7Timer | Astronomy observing conditions | `SEVENTIMER_BASE_URL` | None | `/api/cosmos/astro-weather` | Ask COSMOS stargazing context | 1-3h | Clean unavailable response | Implemented |
| PurpleAir | PM2.5 / AQI estimate | `PURPLEAIR_API_KEY` | Server header key | `/api/cosmos/air-quality` | Ask COSMOS air-quality context | 5-15m | Not configured/unavailable message | Implemented |
| Arcsecond | Astronomy/observatory catalog wrapper | `ARCSECOND_BASE_URL` | None | `/api/cosmos/astronomy` | Ask COSMOS catalog context | 24h | Clear “endpoint/result unavailable” state | Wrapper |
| ISRO API | Indian space program data | `ISRO_API_BASE_URL` | None | `/api/cosmos/isro` | Ask COSMOS Indian missions context | 24h | Clean unavailable response | Implemented |
| USGS Earthquakes | Recent Earth events | `USGS_EARTHQUAKE_BASE_URL` | None | `/api/cosmos/earthquakes` | Daily intelligence, Ask COSMOS | 5-15m | Empty events if unavailable | Implemented |
| Sunrise Sunset | Sun times / day length | `SUNRISE_SUNSET_BASE_URL` | None | `/api/cosmos/sunrise-sunset` | Observing context | 12-24h | Clean unavailable response | Implemented |
| World Bank | Climate, population, education, R&D indicators | `WORLD_BANK_BASE_URL` | None | `/api/cosmos/world-indicators` | Future blog/research context | 24h | Empty indicators if unavailable | Implemented |
| Wikidata | Secondary entity facts | `WIKIDATA_API_BASE_URL` | None | `/api/cosmos/wiki-facts` | Ask COSMOS fact context | 24h | Empty facts if unavailable | Implemented |

## Internal Routes

- `/api/cosmos/ai-context?query=Mars`
- `/api/cosmos/research?query=black%20holes`
- `/api/cosmos/latest-papers`
- `/api/cosmos/weather?location=Gwalior`
- `/api/cosmos/open-meteo?latitude=26.2183&longitude=78.1828`
- `/api/cosmos/astro-weather?latitude=26.2183&longitude=78.1828`
- `/api/cosmos/air-quality?latitude=26.2183&longitude=78.1828`
- `/api/cosmos/astronomy?query=Mars`
- `/api/cosmos/isro`
- `/api/cosmos/earthquakes`
- `/api/cosmos/sunrise-sunset?latitude=26.2183&longitude=78.1828`
- `/api/cosmos/world-indicators`
- `/api/cosmos/wiki-facts?query=Mars`
- `/api/cosmos/daily-intelligence?latitude=26.2183&longitude=78.1828&location=Gwalior`

## Notes

- No private key is exposed with `NEXT_PUBLIC_`.
- CORE, Weatherstack, and PurpleAir return clean unavailable states when keys are not configured.
- Arcsecond is intentionally conservative because the endpoint schema can vary; the wrapper avoids guessing unsupported routes.
