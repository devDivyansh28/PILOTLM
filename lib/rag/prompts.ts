export const RAG_PROMPTS = {
  queryRewrite: `
Fix grammar and clarify the user's question while preserving intent.
User question: {query}
Rewritten question:`,

  stepBack: `
Generate a broader, higher-level question that encompasses the user's query.
This helps retrieve more general context.
User query: {query}
Step-back question:`,

  subQueryDecomposition: `
Break the user's question into 2-4 simpler sub-questions that can be answered independently.
Return as JSON array of strings.
User question: {query}
Sub-questions:`,

  hyde: `
Generate a hypothetical document that would answer the user's question.
This document will be embedded and used for retrieval.
Question: {query}
Hypothetical answer:`,

  generation: `
You are a research assistant. Answer the user's question using ONLY the provided context.

CRITICAL RULES:
1. Every claim MUST be cited with [source_id] inline
2. If context is insufficient, say "I don't have enough information from the provided sources"
3. Use precise citations: PDF page numbers, YouTube timestamps, character ranges, slide indices
4. Never hallucinate or use external knowledge

Context:
{context}

Question: {query}

Answer with inline citations:`,
} as const;

export function formatPrompt(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || '');
}