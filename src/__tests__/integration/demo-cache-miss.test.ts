import { describe, expect, it } from "vitest";
import { seedBundledDemoSession, resolveDemoLlmResponse } from "../../lib/demo";
import { DemoCacheMissError } from "../../lib/llm";

describe("integration: demo cache behavior", () => {
  it("throws on demo cache miss and does not fallback", async () => {
    await seedBundledDemoSession();

    await expect(
      resolveDemoLlmResponse(
        "session_demo_pg_001",
        "missing_schema",
        "missing_prompt",
      ),
    ).rejects.toBeInstanceOf(DemoCacheMissError);
  });
});
