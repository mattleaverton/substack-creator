import { describe, expect, it } from "vitest";
import { LlmClient } from "../../lib/llm";
import { confirmationSchema } from "../../lib/llm-schemas";

describe("integration: llm client", () => {
  it("accepts schema-valid demo responses", async () => {
    const client = new LlmClient("demo-key", {
      demoInterceptor: async () => ({
        confirmation: "Looks good",
        confidence: 0.92,
      }),
    });

    const response = await client.runJson<{
      confirmation: string;
      confidence: number;
    }>({
      prompt: "Confirm this content",
      taskType: "important",
      schema: confirmationSchema,
      schemaName: "confirmation",
    });

    expect(response.confirmation).toContain("good");
    expect(response.confidence).toBeGreaterThan(0.5);
  });
});
