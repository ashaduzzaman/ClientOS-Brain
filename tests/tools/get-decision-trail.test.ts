import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDecisionTrail } from "../../src/tools/get-decision-trail.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    decision: { findMany: vi.fn() },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("getDecisionTrail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with valid input", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: "p1",
      name: "Project",
    });
    prismaMock.decision.findMany.mockResolvedValue([
      {
        id: "d1",
        title: "Old",
        rationale: "r1",
        madeBy: "A",
        supersedesId: null,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
      {
        id: "d2",
        title: "New",
        rationale: "r2",
        madeBy: "B",
        supersedesId: "d1",
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
      },
    ]);

    const result = await getDecisionTrail({ projectId: "p1" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      projectId: "p1",
      decisions: [{ id: "d1" }, { id: "d2", supersedes: "Old" }],
    });
  });

  it("returns error when project is not found", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const result = await getDecisionTrail({ projectId: "missing" });

    expect(result).toEqual({
      success: false,
      error: 'Project with ID "missing" not found',
    });
  });

  it("returns error on invalid input", async () => {
    const result = await getDecisionTrail({ projectId: "p1", limit: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });
});
