import type { EnvSource } from "../validate-provider-config.js";
import { findProviderDefinition } from "../provider-registry.js";
import { createStubLLMProvider } from "../stub-providers.js";
import type { LLMProvider } from "./types.js";
import { MockLLMProvider } from "./mock-llm-provider.js";
import { createOpenAiLlmFromEnv } from "./openai-chat-llm-provider.js";

export interface LLMFactoryOptions {
  mockAi: boolean;
  llmProvider: string;
}

export function createLLMProvider(
  options: LLMFactoryOptions,
  env: EnvSource = process.env,
): LLMProvider {
  const provider = options.mockAi ? "mock" : options.llmProvider;
  if (provider === "mock") {
    return new MockLLMProvider();
  }

  if (provider === "openai" || provider === "openai-compatible") {
    return createOpenAiLlmFromEnv(provider, env);
  }

  const definition = findProviderDefinition("llm", provider);
  if (!definition) {
    throw new Error(
      `LLM provider "${provider}" is not registered. Set MOCK_AI=true or choose: openai, openai-compatible, mock.`,
    );
  }

  return createStubLLMProvider(definition);
}
