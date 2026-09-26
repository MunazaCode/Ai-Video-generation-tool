import type { LLMProvider, LLMTaskType, StoryAnalysisLLMInput } from "./types.js";
import {
  storyAnalyzerSystemPrompt,
  storyAnalyzerUserPrompt,
} from "./prompts/story-analyzer.js";

export interface OpenAiChatLlmConfig {
  id: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

export class OpenAiChatLLMProvider implements LLMProvider {
  readonly id: string;

  constructor(private readonly config: OpenAiChatLlmConfig) {
    this.id = config.id;
  }

  async generateStructuredOutput(
    _task: LLMTaskType,
    input: StoryAnalysisLLMInput,
  ): Promise<unknown> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const timeoutMs = this.config.timeoutMs ?? 120_000;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: storyAnalyzerSystemPrompt() },
          {
            role: "user",
            content: storyAnalyzerUserPrompt({
              script: input.script,
              language: input.language,
              visualStyle: input.visualStyle,
              customVisualStyle: input.customVisualStyle,
              targetDurationSec: input.targetDurationSec,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `LLM request failed (${String(response.status)}): ${body.slice(0, 500)}`,
      );
    }

    const json = (await response.json()) as ChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response did not include message content");
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error("LLM response content was not valid JSON");
    }
  }
}

export function createOpenAiLlmFromEnv(
  id: "openai" | "openai-compatible",
  env: Record<string, string | undefined>,
): OpenAiChatLLMProvider {
  if (id === "openai") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for openai LLM provider");
    }
    return new OpenAiChatLLMProvider({
      id: "openai",
      apiKey,
      baseUrl: env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1",
      model: env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini",
    });
  }

  const apiKey = env.LLM_API_KEY?.trim();
  const baseUrl = env.LLM_BASE_URL?.trim();
  if (!apiKey || !baseUrl) {
    throw new Error("LLM_API_KEY and LLM_BASE_URL are required for openai-compatible");
  }

  return new OpenAiChatLLMProvider({
    id: "openai-compatible",
    apiKey,
    baseUrl,
    model: env.LLM_MODEL?.trim() ?? "gpt-4o-mini",
  });
}
