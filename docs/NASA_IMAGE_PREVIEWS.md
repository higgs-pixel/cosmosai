# NASA Image Preview Delivery

The Image Explorer resolves NASA Image and Video Library previews on the server. Search-result preview links are validated first; an asset manifest is fetched only when a compatible direct preview is unavailable.

Only HTTPS assets from `images-assets.nasa.gov` are accepted. JPEG previews are preferred, PNG is the fallback, and metadata, TIFF, archive, and video files are never selected as card images. Manifest requests use the NASA service cache and a bounded timeout, while identical IDs are deduplicated within each search response.

Explorer previews intentionally render with Next.js `Image` in `unoptimized` mode. The production deployment's `/_next/image` endpoint can return HTTP 402 for otherwise valid NASA thumbnails. Direct delivery avoids that infrastructure failure while preserving responsive `sizes`, stable containers, lazy loading, meaningful alternative text, and the application CSP allowlist.

If a direct browser load fails, the card replaces the hidden image with a COSMOS fallback and sends a bounded, non-sensitive diagnostic event containing only the NASA item ID and failure category.
