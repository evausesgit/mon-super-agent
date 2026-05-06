import { describe, expect, it } from "vitest";

import {
  createOrResolveProfileByPhoneNumber,
  getProfileByPhoneNumber,
} from "./profiles.js";
import { openAgentDatabase } from "./schema.js";

describe("profile persistence", () => {
  it("creates and resolves a profile keyed by normalized phone number", () => {
    const database = openAgentDatabase(":memory:");

    const profile = createOrResolveProfileByPhoneNumber(
      "+1 (415) 555-2671",
      database,
    );

    expect(profile).toMatchObject({
      id: "+14155552671",
      phoneNumber: "+14155552671",
    });
    expect(getProfileByPhoneNumber("+14155552671", database)).toEqual(profile);

    database.close();
  });

  it("is idempotent for duplicate normalized phone numbers", () => {
    const database = openAgentDatabase(":memory:");

    const first = createOrResolveProfileByPhoneNumber(
      "+1 (415) 555-2671",
      database,
    );
    const second = createOrResolveProfileByPhoneNumber("+14155552671", database);

    expect(second).toEqual(first);
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM user_profiles").get(),
    ).toEqual({
      count: 1,
    });

    database.close();
  });

  it("rejects invalid or ambiguous phone numbers without creating profiles", () => {
    const database = openAgentDatabase(":memory:");

    expect(() =>
      createOrResolveProfileByPhoneNumber("415-555-2671", database),
    ).toThrow("Phone number must include an international country code");
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM user_profiles").get(),
    ).toEqual({
      count: 0,
    });

    database.close();
  });
});
