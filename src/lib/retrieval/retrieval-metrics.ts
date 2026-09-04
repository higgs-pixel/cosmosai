export type RetrievalEvaluationCase = {
  id: string;
  query: string;
  queryType: "exact-title" | "doi" | "author" | "topic" | "synonym" | "acronym" | "natural-language" | "variation";
  relevantIds: string[];
  variationGroup?: string;
};

export type RetrievalCaseResult = RetrievalEvaluationCase & {
  returnedIds: string[];
  firstRelevantRank: number | null;
  recallAt: Record<1 | 3 | 5 | 10, number>;
  reciprocalRank: number;
  ndcgAt10: number;
  falseNegative: boolean;
  irrelevantRate: number;
};

export type RetrievalMetrics = {
  caseCount: number;
  recallAt: Record<1 | 3 | 5 | 10, number>;
  meanReciprocalRank: number;
  meanNdcgAt10: number;
  falseNegativeRate: number;
  irrelevantResultRate: number;
  queryVariationStability: number;
  successByQueryType: Record<string, number>;
  results: RetrievalCaseResult[];
};

function mean(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function binaryNdcgAt10(returnedIds: string[], relevant: Set<string>) {
  const dcg = returnedIds.slice(0, 10).reduce(
    (sum, id, index) => sum + (relevant.has(id) ? 1 / Math.log2(index + 2) : 0),
    0,
  );
  const idealCount = Math.min(relevant.size, 10);
  const idcg = Array.from({ length: idealCount }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0);
  return idcg === 0 ? 0 : dcg / idcg;
}

function jaccard(left: string[], right: string[]) {
  const a = new Set(left.slice(0, 5));
  const b = new Set(right.slice(0, 5));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  return [...a].filter((id) => b.has(id)).length / union.size;
}

export async function evaluateRetrieval(
  cases: RetrievalEvaluationCase[],
  retrieve: (query: string) => Promise<string[]>,
): Promise<RetrievalMetrics> {
  const results: RetrievalCaseResult[] = [];
  for (const evaluationCase of cases) {
    const returnedIds = await retrieve(evaluationCase.query);
    const relevant = new Set(evaluationCase.relevantIds);
    const firstRelevantIndex = returnedIds.findIndex((id) => relevant.has(id));
    const firstRelevantRank = firstRelevantIndex < 0 ? null : firstRelevantIndex + 1;
    const recallAt = Object.fromEntries(
      ([1, 3, 5, 10] as const).map((k) => [
        k,
        evaluationCase.relevantIds.some((id) => returnedIds.slice(0, k).includes(id)) ? 1 : 0,
      ]),
    ) as Record<1 | 3 | 5 | 10, number>;
    const irrelevantCount = returnedIds.filter((id) => !relevant.has(id)).length;
    results.push({
      ...evaluationCase,
      returnedIds,
      firstRelevantRank,
      recallAt,
      reciprocalRank: firstRelevantRank ? 1 / firstRelevantRank : 0,
      ndcgAt10: binaryNdcgAt10(returnedIds, relevant),
      falseNegative: firstRelevantRank === null,
      irrelevantRate: returnedIds.length === 0 ? 0 : irrelevantCount / returnedIds.length,
    });
  }

  const queryTypes = Array.from(new Set(cases.map((item) => item.queryType)));
  const variationGroups = Array.from(new Set(cases.map((item) => item.variationGroup).filter((value): value is string => Boolean(value))));
  const stabilityScores = variationGroups.flatMap((group) => {
    const groupResults = results.filter((result) => result.variationGroup === group);
    const pairs: number[] = [];
    for (let left = 0; left < groupResults.length; left += 1) {
      for (let right = left + 1; right < groupResults.length; right += 1) {
        pairs.push(jaccard(groupResults[left].returnedIds, groupResults[right].returnedIds));
      }
    }
    return pairs;
  });
  return {
    caseCount: results.length,
    recallAt: Object.fromEntries(
      ([1, 3, 5, 10] as const).map((k) => [k, mean(results.map((result) => result.recallAt[k]))]),
    ) as Record<1 | 3 | 5 | 10, number>,
    meanReciprocalRank: mean(results.map((result) => result.reciprocalRank)),
    meanNdcgAt10: mean(results.map((result) => result.ndcgAt10)),
    falseNegativeRate: mean(results.map((result) => Number(result.falseNegative))),
    irrelevantResultRate: mean(results.map((result) => result.irrelevantRate)),
    queryVariationStability: mean(stabilityScores),
    successByQueryType: Object.fromEntries(queryTypes.map((queryType) => {
      const group = results.filter((result) => result.queryType === queryType);
      return [queryType, mean(group.map((result) => Number(!result.falseNegative)))];
    })),
    results,
  };
}
