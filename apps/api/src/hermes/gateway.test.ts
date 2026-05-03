import { describe, expect, it } from "vitest";

import { isGatewayRunning } from "./gateway.js";

describe("isGatewayRunning", () => {
  it("returns false for a non-existent pid", () => {
    expect(isGatewayRunning(9_999_999)).toBe(false);
  });
});
