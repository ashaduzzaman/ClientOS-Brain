import { beforeEach, describe, expect, it, vi } from "vitest";

import { logDecision } from "../../src/tools/log-decision.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    decision: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("logDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with valid input", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1" });
    prismaMock.decision.create.mockResolvedValue({
      id: "d1",
      projectId: "p1",
      title: "T",
      rationale: "valid rationale text",
      madeBy: "Lead",
      supersedesId: null,
      createdAt: new Date("2026-04-18T00:00:00.000Z"),
    });

    const result = await logDecision({
      projectId: "p1",
      title: "Choose stack",
      rationale: "This is a sufficiently long rationale.",
      madeBy: "Lead",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "d1", projectId: "p1" });
  });

  it("returns error when project is not found", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const result = await logDecision({
      projectId: "missing",
      title: "Choose stack",
      rationale: "This is a sufficiently long rationale.",
      madeBy: "Lead",
    });

    expect(result).toEqual({
      success: false,
      error: 'Project with ID "missing" not found',
    });
  });

  it("returns error on invalid input", async () => {
    const result = await logDecision({
      projectId: "p1",
      title: "No",
      rationale: "short",
      madeBy: "Lead",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });
});
