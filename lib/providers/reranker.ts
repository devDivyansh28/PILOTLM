import { getRerankerConfig, getAPIKey } from './registry';

export interface RerankerInput {
  query: string;
  documents: string[];
  topN: number;
}

export interface RerankerResult {
  index: number;
  relevanceScore: number;
  document: string;
}

export async function rerank(input: RerankerInput, configName?: string): Promise<RerankerResult[]> {
  const config = getRerankerConfig(configName);
  const apiKey = getAPIKey(config.apiKeyEnv);

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      query: input.query,
      documents: input.documents,
      top_n: config.topN ?? input.topN,
    }),
  });

  if (!response.ok) {
    throw new Error(`Cohere rerank failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.map((r: { index: number; relevance_score: number }) => ({
    index: r.index,
    relevanceScore: r.relevance_score,
    document: input.documents[r.index],
  }));
}