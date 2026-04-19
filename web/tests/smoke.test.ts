import { describe, expect, it } from "vitest";

describe("scaffold smoke", () => {
  it("passes a trivial assertion so CI has something to run", () => {
    expect(1 + 1).toBe(2);
  });
});
