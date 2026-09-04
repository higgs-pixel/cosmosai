import type { SourceCandidate } from "./relevance-score.ts";
import { normalizeDoi, normalizeScholarlyTitle } from "./scholarly-paper.ts";

export type ResearchChunkRecord = {
  id: string;
  paperId: string;
};

export type ResearchEmbeddingRecord = {
  id: string;
  chunkId: string;
  dimension: number;
  version: string;
  vector: number[];
};

export type ResearchIntegrityFailure = {
  code:
    | "document_without_chunks"
    | "chunk_without_document"
    | "chunk_without_embedding"
    | "orphaned_embedding"
    | "wrong_embedding_dimension"
    | "stale_embedding_version"
    | "zero_embedding"
    | "duplicate_doi"
    | "duplicate_title"
    | "missing_normalized_title"
    | "missing_authors";
  recordId: string;
};

export type ResearchIntegrityReport = {
  ok: boolean;
  documentCount: number;
  chunkCount: number;
  embeddingCount: number;
  chunkIndex: "configured" | "not-configured";
  vectorIndex: "configured" | "not-configured";
  failures: ResearchIntegrityFailure[];
};

type IntegrityOptions = {
  chunks?: ResearchChunkRecord[];
  embeddings?: ResearchEmbeddingRecord[];
  expectedEmbeddingDimension?: number;
  expectedEmbeddingVersion?: string;
};

export function checkResearchIntegrity(
  papers: SourceCandidate[],
  options: IntegrityOptions = {},
): ResearchIntegrityReport {
  const failures: ResearchIntegrityFailure[] = [];
  const chunksConfigured = options.chunks !== undefined;
  const vectorsConfigured = options.embeddings !== undefined;
  const chunks = options.chunks ?? [];
  const embeddings = options.embeddings ?? [];
  const paperIds = new Set(papers.map((paper) => paper.id));
  const chunkIds = new Set(chunks.map((chunk) => chunk.id));
  const doiOwners = new Map<string, string>();
  const titleOwners = new Map<string, string>();

  for (const paper of papers) {
    const title = normalizeScholarlyTitle(paper.title);
    if (!title) failures.push({ code: "missing_normalized_title", recordId: paper.id });
    if (!paper.authors?.length) failures.push({ code: "missing_authors", recordId: paper.id });
    const doi = normalizeDoi(paper.doi)?.toLowerCase();
    if (doi) {
      if (doiOwners.has(doi)) failures.push({ code: "duplicate_doi", recordId: paper.id });
      else doiOwners.set(doi, paper.id);
    }
    if (title) {
      if (titleOwners.has(title)) failures.push({ code: "duplicate_title", recordId: paper.id });
      else titleOwners.set(title, paper.id);
    }
    if (chunksConfigured && !chunks.some((chunk) => chunk.paperId === paper.id)) {
      failures.push({ code: "document_without_chunks", recordId: paper.id });
    }
  }

  for (const chunk of chunks) {
    if (!paperIds.has(chunk.paperId)) failures.push({ code: "chunk_without_document", recordId: chunk.id });
    if (vectorsConfigured && !embeddings.some((embedding) => embedding.chunkId === chunk.id)) {
      failures.push({ code: "chunk_without_embedding", recordId: chunk.id });
    }
  }

  for (const embedding of embeddings) {
    if (!chunkIds.has(embedding.chunkId)) failures.push({ code: "orphaned_embedding", recordId: embedding.id });
    if (options.expectedEmbeddingDimension && embedding.dimension !== options.expectedEmbeddingDimension) {
      failures.push({ code: "wrong_embedding_dimension", recordId: embedding.id });
    }
    if (options.expectedEmbeddingVersion && embedding.version !== options.expectedEmbeddingVersion) {
      failures.push({ code: "stale_embedding_version", recordId: embedding.id });
    }
    if (embedding.vector.length === 0 || embedding.vector.every((value) => value === 0)) {
      failures.push({ code: "zero_embedding", recordId: embedding.id });
    }
  }

  return {
    ok: failures.length === 0,
    documentCount: papers.length,
    chunkCount: chunks.length,
    embeddingCount: embeddings.length,
    chunkIndex: chunksConfigured ? "configured" : "not-configured",
    vectorIndex: vectorsConfigured ? "configured" : "not-configured",
    failures,
  };
}
