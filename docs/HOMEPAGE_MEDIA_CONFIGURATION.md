# COSMOS homepage media configuration

The homepage keeps cinematic video files outside Git. Its committed poster frames preserve the layout when a video is unavailable, slow, blocked by autoplay policy, or not yet configured.

## Production delivery

The six approved Vercel Blob URLs are built in as the production-safe defaults, so the cinematic media works without an additional deployment setting. These server-side environment variables may override the defaults if the files are moved later:

| Scene | WebM variable | MP4 variable |
| --- | --- | --- |
| Hero black hole | `COSMOS_HOME_BLACKHOLE_WEBM_URL` | `COSMOS_HOME_BLACKHOLE_MP4_URL` |
| Academics / Sun | `COSMOS_HOME_SUN_WEBM_URL` | `COSMOS_HOME_SUN_MP4_URL` |
| Explorers / sky | `COSMOS_HOME_SKY_WEBM_URL` | `COSMOS_HOME_SKY_MP4_URL` |

These are server-read configuration values, not secrets and not `NEXT_PUBLIC_` values. The environment validator rejects non-HTTPS overrides and the Content Security Policy permits media only from self and the Vercel Blob host.

## Runtime behavior

- The hero initializes its video texture only when at least one hero URL exists.
- Offscreen section videos do not attach sources until they approach the viewport.
- Every scene keeps a local WebP poster visible as its safe fallback.
- Failed autoplay is handled without removing the poster or breaking navigation.
- Video elements, sources, and Three.js textures are released on unmount.

The homepage integration adds no local `.mp4` or `.webm` files and does not use the production repository's pre-existing legacy hero video. Middleware static-file exclusions therefore do not need to change.
