import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

let configCache: ProviderConfig | null = null;

export interface ProviderConfig {
  defaults: {
    llm: string;
    embedding: string;
    reranker: string;
  };
  llm: Record<string, LLMConfig>;
  embedding: Record<string, EmbeddingConfig>;
  reranker: Record<string, RerankerConfig>;
  rag: RAGConfig;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'huggingface';
  model: string;
  temperature: number;
  maxTokens: number;
  apiKeyEnv?: string;
  baseUrl?: string;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'cohere' | 'ollama';
  model: string;
  dimensions: number;
  apiKeyEnv?: string;
  baseUrl?: string;
}

export interface RerankerConfig {
  provider: 'cohere';
  model: string;
  topN: number;
  apiKeyEnv: string;
}

export interface RAGConfig {
  queryRewrite: StepConfig;
  stepBack: StepConfig;
  subQueryDecomposition: StepConfig;
  hyde: StepConfig;
  retrieval: { k: number; scoreThreshold: number };
  rrf: { k: number };
  rerank: { reranker: string; topN: number };
  generation: StepConfig & { prompt: string };
}

export interface StepConfig {
  llm: string;
  temperature: number;
  maxTokens: number;
  prompt: string;
}

function loadConfig(): ProviderConfig {
  if (configCache) return configCache;

  const configPath = path.join(process.cwd(), 'config', 'providers.yaml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  const parsed = yaml.parse(fileContents);
  if (!parsed) throw new Error('Failed to parse providers.yaml');
  configCache = parsed as ProviderConfig;
  return configCache;
}

export function getConfig(): ProviderConfig {
  return loadConfig();
}

export function getLLMConfig(name?: string): LLMConfig {
  const config = loadConfig();
  const key = name ?? config.defaults.llm;
  const llmConfig = config.llm[key];
  if (!llmConfig) throw new Error(`LLM config not found: ${key}`);
  return llmConfig;
}

export function getEmbeddingConfig(name?: string): EmbeddingConfig {
  const config = loadConfig();
  const key = name ?? config.defaults.embedding;
  const embConfig = config.embedding[key];
  if (!embConfig) throw new Error(`Embedding config not found: ${key}`);
  return embConfig;
}

export function getRerankerConfig(name?: string): RerankerConfig {
  const config = loadConfig();
  const key = name ?? config.defaults.reranker;
  const rerankConfig = config.reranker[key];
  if (!rerankConfig) throw new Error(`Reranker config not found: ${key}`);
  return rerankConfig;
}

export function getRAGConfig(): RAGConfig {
  return loadConfig().rag;
}

export function getAPIKey(envVar: string): string {
  const key = process.env[envVar];
  if (!key) throw new Error(`Missing environment variable: ${envVar}`);
  return key;
}

export function getDefaultLLM(): LLMConfig {
  return getLLMConfig();
}

export function getDefaultEmbedding(): EmbeddingConfig {
  return getEmbeddingConfig();
}

export function getDefaultReranker(): RerankerConfig {
  return getRerankerConfig();
}