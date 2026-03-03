import { describe, expect, it } from "vitest";
import { LLM_MODELS, LlmClient } from "../../lib/llm";
import { confirmationSchema } from "../../lib/llm-schemas";

describe("smoke: lite model wiring", () => {
  it("exposes gemini-2.5-flash-lite for test mode", () => {
    expect(LLM_MODELS.test).toBe("gemini-2.5-flash-lite");
  });

  it("can perform a live lite-model call when GEMINI_API_KEY is set", async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      expect(true).toBe(true);
      return;
    }

    const client = new LlmClient(key);
    const response = await client.runJson<{
      confirmation: string;
      confidence: number;
    }>({
      prompt: "Respond with confirmation that tests can use lite model.",
      schemaName: "smoke_live_confirmation",
      schema: confirmationSchema,
      taskType: "test",
      maxRetries: 5,
    });

    expect(typeof response.confirmation).toBe("string");
  }, 60000);
});
