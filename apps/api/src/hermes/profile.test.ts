import { afterEach, describe, expect, it, vi } from "vitest";

import { getBotUsername } from "./profile.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getBotUsername", () => {
  it("returns the Telegram bot username", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        result: {
          username: "mybot",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getBotUsername("1234567890:AAxxxxxx")).resolves.toBe("mybot");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot1234567890:AAxxxxxx/getMe",
    );
  });

  it("throws when Telegram responds with a non-ok HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(getBotUsername("bad-token")).rejects.toThrow(
      "Telegram getMe failed: 401",
    );
  });

  it("throws when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(getBotUsername("bad-token")).rejects.toThrow("Network error");
  });
});
