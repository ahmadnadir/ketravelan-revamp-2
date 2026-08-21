import { describe, expect, it } from "vitest";
import { getTravelStyleEmoji, getTravelStyleLabel } from "@/data/travelStyles";

describe("travel style normalization", () => {
  it("supports trip category ids from the live database schema", () => {
    expect(getTravelStyleLabel("nature-outdoor")).toBe("Nature & Outdoor");
    expect(getTravelStyleLabel("city-urban")).toBe("City & Urban");
    expect(getTravelStyleLabel("music-festivals")).toBe("Concert & Festival");
    expect(getTravelStyleLabel("diving-water")).toBe("Diving");
  });

  it("keeps emoji rendering for legacy style ids", () => {
    expect(getTravelStyleEmoji("nature-outdoor")).toBe("🌿");
    expect(getTravelStyleEmoji("music-festivals")).toBe("🎶");
    expect(getTravelStyleEmoji("diving-water")).toBe("🤿");
  });
});
