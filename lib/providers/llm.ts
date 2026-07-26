import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { getLLMConfig, getAPIKey } from './registry';

export function createLLM(configName?: string): BaseChatModel {
  const config = getLLMConfig(configName);
  const apiKey = config.apiKeyEnv ? getAPIKey(config.apiKeyEnv) : undefined;

  switch (config.provider) {
    case 'openai':
      return new ChatOpenAI({
        modelName: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        openAIApiKey: apiKey,
        configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
        streaming: true,
      });

    case 'anthropic':
      return new ChatAnthropic({
        modelName: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        anthropicApiKey: apiKey,
        streaming: true,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}