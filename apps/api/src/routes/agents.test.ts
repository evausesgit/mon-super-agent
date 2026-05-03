import { describe, expect, it } from "vitest";

import { createAgent } from "./agents.js";

describe("createAgent", () => {
  it("generates an id from the name", () => {
    const result = createAgent({
      agentName: "Nova",
      channel: "telegram",
      userContact: "@eva",
    });

    expect(result.id).toMatch(/^agent-nova-/);
    expect(result.name).toBe("Nova");
  });
});
