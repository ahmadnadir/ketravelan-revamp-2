import { describe, expect, it } from "vitest";

import { canDeleteEmptyListBlock } from "../NoteEditor";

describe("canDeleteEmptyListBlock", () => {
  it("allows deleting the final empty checklist item", () => {
    const blocks = [
      {
        id: "check-1",
        type: "checklist",
        content: "",
        checked: false,
      },
    ];

    expect(canDeleteEmptyListBlock(blocks, 0)).toBe(true);
  });

  it("does not allow deleting a non-empty checklist item", () => {
    const blocks = [
      {
        id: "check-2",
        type: "checklist",
        content: "Groceries",
        checked: false,
      },
    ];

    expect(canDeleteEmptyListBlock(blocks, 0)).toBe(false);
  });

  it("keeps empty text blocks intact", () => {
    const blocks = [
      {
        id: "text-1",
        type: "text",
        content: "",
      },
    ];

    expect(canDeleteEmptyListBlock(blocks, 0)).toBe(false);
  });
});
