export function chunkTextForStream(text: string, maxChunkLength = 18) {
  const limit = Math.max(1, Math.floor(maxChunkLength));
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + limit);

    if (end < text.length) {
      const candidate = text.slice(start, end);
      const boundary = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf("\n"));
      if (boundary > 0) end = start + boundary + 1;
    }

    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}
