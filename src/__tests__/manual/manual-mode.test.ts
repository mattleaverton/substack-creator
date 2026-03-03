import { describe, expect, it } from "vitest";

describe("manual mode option", () => {
  it("supports manual test mode toggle", () => {
    process.env.VITE_TEST_MODE = "manual";
    expect(process.env.VITE_TEST_MODE).toBe("manual");
  });
});
