import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CohereEmbeddings } from '@langchain/cohere';
import { getEmbeddingConfig, getAPIKey } from './registry';

export function createEmbeddings(configName?: string): Embeddings {
  const config = getEmbeddingConfig(configName);
  const apiKey = config.apiKeyEnv ? getAPIKey(config.apiKeyEnv) : undefined;

  switch (config.provider) {
    case 'openai':
      return new OpenAIEmbeddings({
        modelName: config.model,
        dimensions: config.dimensions,
        openAIApiKey: apiKey,
      });

    case 'cohere':
      return new CohereEmbeddings({
        model: config.model,
        apiKey: apiKey,
      });

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
}