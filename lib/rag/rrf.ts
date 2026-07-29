export interface RankedResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
  queryIndex: number;
}

export function ReciprocalRankFusion(
  retrievalResults: Array<{ query: string; results: Array<{ id: string; score: number; payload: Record<string, unknown> }> }>,
  k: number = 60
): RankedResult[] {
  const resultScores = new Map<string, { score: number; payload: Record<string, unknown>; count: number; queryIndex: number }>();

  retrievalResults.forEach(({ results }, queryIndex) => {
    results.forEach((result, rank) => {
      const id = result.id;
      const rrfScore = 1 / (k + rank + 1);

      const existing = resultScores.get(id);
      if (existing) {
        existing.score += rrfScore;
        existing.count += 1;
      } else {
        resultScores.set(id, {
          score: rrfScore,
          payload: result.payload,
          count: 1,
          queryIndex,
        });
      }
    });
  });

  const fused = Array.from(resultScores.entries())
    .map(([id, data]) => ({
      id,
      score: data.score,
      payload: data.payload,
      queryIndex: data.queryIndex,
    }))
    .sort((a, b) => b.score - a.score);

  return fused;
}