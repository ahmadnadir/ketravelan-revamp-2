import { describe, expect, it } from "vitest";
import { detectSensitiveContent } from "../familiesSafety";

describe("detectSensitiveContent", () => {
  it("flags obvious phone numbers and email addresses", () => {
    const result = detectSensitiveContent("You can reach me at 555-123-4567 or jane@example.com");

    expect(result.isRisky).toBe(true);
    expect(result.reasons).toEqual(expect.arrayContaining(["phone number", "email address"]));
  });

  it("allows ordinary travel conversation", () => {
    const result = detectSensitiveContent("I loved the beach view and the local food today.");

    expect(result.isRisky).toBe(false);
    expect(result.reasons).toEqual([]);
  });
});
