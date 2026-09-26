import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAiChatLLMProvider } from "./openai-chat-llm-provider.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAiChatLLMProvider", () => {
  it("calls chat completions and parses JSON content", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({
          choices: [{ message: { content: '{"title":"T","scenes":[]}' } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiChatLLMProvider({
      id: "openai",
      apiKey: "sk-test",
      baseUrl: "https://example.com/v1",
      model: "gpt-test",
      timeoutMs: 5_000,
    });

    const result = await provider.generateStructuredOutput("STORY_ANALYSIS", {
      script: "Once upon a time",
      language: "en",
      visualStyle: "CINEMATIC",
      customVisualStyle: null,
      targetDurationSec: 60,
    });

    expect(result).toEqual({ title: "T", scenes: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const init = calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.stringify(init?.body)).toContain("json_object");
  });
});
