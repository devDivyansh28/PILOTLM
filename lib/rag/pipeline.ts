import { createLLM } from '@/lib/providers/llm';
import { createEmbeddings } from '@/lib/providers/embeddings';
import { searchPoints, getCollectionName } from '@/lib/vector/qdrant';
import { rerank } from '@/lib/providers/reranker';
import { formatPrompt, RAG_PROMPTS } from './prompts';
import { ReciprocalRankFusion } from './rrf';

export interface RAGContext {
  content: string;
  sourceId: string;
  sourceType: string;
  location: Record<string, unknown>;
  score: number;
}

export interface RAGResult {
  answer: string;
  citations: Array<{
    sourceId: string;
    sourceType: string;
    location: Record<string, unknown>;
    text: string;
  }>;
  contexts: RAGContext[];
}

export async function runRetrieval(
  notebookId: string,
  query: string,
  options: {
    k?: number;
    scoreThreshold?: number;
    rrfK?: number;
    rerankTopN?: number;
  } = {}
): Promise<{
  reranked: Array<{ id: string; score: number; payload: Record<string, unknown> }>;
  contexts: RAGContext[];
  contextStr: string;
}> {
  const {
    k = 50,
    scoreThreshold = 0.5,
    rrfK = 60,
    rerankTopN = 10,
  } = options;

  const rewrittenQuery = await rewriteQuery(query);
  const stepBackQuery = await stepBackPrompt(rewrittenQuery);
  const subQueries = await decomposeQuery(rewrittenQuery);
  const hydeDoc = await generateHyDE(rewrittenQuery);

  const allQueries = [rewrittenQuery, stepBackQuery, ...subQueries, hydeDoc];
  const retrievalResults = await parallelRetrieval(notebookId, allQueries, { k, scoreThreshold });

  const fusedResults = ReciprocalRankFusion(retrievalResults, rrfK);
  const reranked = await rerankResults(query, fusedResults, rerankTopN);

  const contexts: RAGContext[] = reranked.map((c) => ({
    content: c.payload.content as string,
    sourceId: c.payload.sourceId as string,
    sourceType: c.payload.sourceType as string,
    location: (c.payload.charRange || c.payload.timestamp || c.payload.page || {}) as Record<string, unknown>,
    score: c.score,
  }));

  const contextStr = formatContextForGeneration(reranked);

  return { reranked, contexts, contextStr };
}

export function formatContextForGeneration(
  contexts: Array<{ id: string; score: number; payload: Record<string, unknown> }>
): string {
  const blocks = contexts.map((ctx, idx) => {
    const sourceId = ctx.payload.sourceId;
    const sourceType = ctx.payload.sourceType || 'unknown';
    const location = ctx.payload.charRange || ctx.payload.timestamp || ctx.payload.page || {};
    return `[source_${idx}] Source: ${sourceId} (${sourceType}) Location: ${JSON.stringify(location)}\nContent: ${ctx.payload.content}`;
  });
  return blocks.join('\n\n---\n\n');
}

export function extractCitationsFromAnswer(
  answer: string,
  contexts: Array<{ id: string; score: number; payload: Record<string, unknown> }>
): RAGResult['citations'] {
  return extractCitations(answer, contexts);
}

export async function runRAGPipeline(
  notebookId: string,
  query: string,
  options: {
    k?: number;
    scoreThreshold?: number;
    rrfK?: number;
    rerankTopN?: number;
  } = {}
): Promise<RAGResult> {
  const { reranked, contexts } = await runRetrieval(notebookId, query, options);
  const result = await generateAnswer(query, reranked, contexts);
  return result;
}

async function rewriteQuery(query: string): Promise<string> {
  const llm = createLLM();
  const prompt = formatPrompt(RAG_PROMPTS.queryRewrite, { query });
  const response = await llm.invoke(prompt);
  return response.content as string;
}

async function stepBackPrompt(query: string): Promise<string> {
  const llm = createLLM();
  const prompt = formatPrompt(RAG_PROMPTS.stepBack, { query });
  const response = await llm.invoke(prompt);
  return response.content as string;
}

async function decomposeQuery(query: string): Promise<string[]> {
  const llm = createLLM();
  const prompt = formatPrompt(RAG_PROMPTS.subQueryDecomposition, { query });
  const response = await llm.invoke(prompt);
  try {
    const parsed = JSON.parse(response.content as string);
    return Array.isArray(parsed) ? parsed : [query];
  } catch {
    return [query];
  }
}

async function generateHyDE(query: string): Promise<string> {
  const llm = createLLM();
  const prompt = formatPrompt(RAG_PROMPTS.hyde, { query });
  const response = await llm.invoke(prompt);
  return response.content as string;
}

async function parallelRetrieval(
  notebookId: string,
  queries: string[],
  options: { k: number; scoreThreshold: number }
): Promise<Array<{ query: string; results: Array<{ id: string; score: number; payload: Record<string, unknown> }> }>> {
  const embeddings = createEmbeddings();
  const collectionName = getCollectionName(notebookId);

  const results = await Promise.all(
    queries.map(async (q) => {
      const vector = await embeddings.embedQuery(q);
      const searchResults = await searchPoints(collectionName, vector, {
        limit: options.k,
        scoreThreshold: options.scoreThreshold,
      });
      return { query: q, results: searchResults };
    })
  );

  return results;
}

async function rerankResults(
  query: string,
  results: Array<{ id: string; score: number; payload: Record<string, unknown> }>,
  topN: number
): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
  if (results.length === 0) return [];

  const documents = results.map((r) => r.payload.content as string);
  const reranked = await rerank({ query, documents, topN });

  return reranked.map((r) => ({
    id: results[r.index].id,
    score: r.relevanceScore,
    payload: results[r.index].payload,
  }));
}

async function generateAnswer(
  query: string,
  contexts: Array<{ id: string; score: number; payload: Record<string, unknown> }>,
  prebuiltContexts?: RAGContext[]
): Promise<RAGResult> {
  const llm = createLLM();

  const contextStr = formatContextForGeneration(contexts);
  const prompt = formatPrompt(RAG_PROMPTS.generation, {
    context: contextStr,
    query,
  });

  const response = await llm.invoke(prompt);
  const answer = response.content as string;

  const citations = extractCitations(answer, contexts);

  return {
    answer,
    citations,
    contexts: prebuiltContexts || contexts.map((c) => ({
      content: c.payload.content as string,
      sourceId: c.payload.sourceId as string,
      sourceType: c.payload.sourceType as string,
      location: (c.payload.charRange || c.payload.timestamp || c.payload.page || {}) as Record<string, unknown>,
      score: c.score,
    })),
  };
}

function extractCitations(
  answer: string,
  contexts: Array<{ id: string; score: number; payload: Record<string, unknown> }>
): RAGResult['citations'] {
  const citationRegex = /\[source_(\d+)\]/g;
  const matches = answer.matchAll(citationRegex);
  const citations: RAGResult['citations'] = [];

  for (const match of matches) {
    const idx = parseInt(match[1], 10);
    if (contexts[idx]) {
      const ctx = contexts[idx];
      citations.push({
        sourceId: ctx.payload.sourceId as string,
        sourceType: (ctx.payload.sourceType as string) || 'unknown',
        location: (ctx.payload.charRange || ctx.payload.timestamp || ctx.payload.page || {}) as Record<string, unknown>,
        text: (ctx.payload.content as string).substring(0, 200),
      });
    }
  }

  return citations;
}