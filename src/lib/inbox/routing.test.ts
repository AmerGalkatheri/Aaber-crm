import { describe, expect, it } from "vitest";

import { nextRoutingCursor, selectAssignee } from "./routing";

const members = [
  { id: "a", active: true, load: 2 },
  { id: "b", active: true, load: 1 },
  { id: "c", active: false, load: 0 },
];

describe("selectAssignee", () => {
  it("returns null for manual routing", () => {
    expect(selectAssignee(members, "manual")).toBeNull();
  });

  it("skips inactive members", () => {
    expect(selectAssignee(members, "round_robin", 0)?.id).toBe("a");
    expect(selectAssignee(members, "round_robin", 1)?.id).toBe("b");
  });

  it("selects the least-loaded active member and breaks ties deterministically", () => {
    expect(selectAssignee(members, "least_loaded")?.id).toBe("b");
    expect(
      selectAssignee(
        [
          { id: "z", active: true, load: 3 },
          { id: "a", active: true, load: 3 },
        ],
        "least_loaded",
      )?.id,
    ).toBe("a");
  });

  it("supports weighted round-robin", () => {
    const weighted = [
      { id: "a", active: true, load: 0, weight: 2 },
      { id: "b", active: true, load: 0, weight: 1 },
    ];
    expect(selectAssignee(weighted, "round_robin", 0)?.id).toBe("a");
    expect(selectAssignee(weighted, "round_robin", 1)?.id).toBe("a");
    expect(selectAssignee(weighted, "round_robin", 2)?.id).toBe("b");
  });

  it("handles negative cursors safely", () => {
    expect(selectAssignee(members, "round_robin", -1)?.id).toBe("b");
  });

  it("does not advance an empty routing pool", () => {
    expect(nextRoutingCursor([], 4)).toBe(4);
    expect(nextRoutingCursor(members, 4)).toBe(5);
  });
});
