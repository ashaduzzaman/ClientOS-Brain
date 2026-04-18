import { beforeEach, describe, expect, it, vi } from "vitest";

import { summarizeProjectWeek } from "../../src/tools/summarize-project-week.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    decision: { findMany: vi.fn() },
    risk: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("summarizeProjectWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with valid input", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: "p1",
      name: "Project",
      client: { name: "Client" },
    });
    prismaMock.decision.findMany.mockResolvedValue([
      {
        title: "Decision A",
        madeBy: "Lead",
      },
    ]);
    prismaMock.risk.findMany
      .mockResolvedValueOnce([
        { severity: "HIGH", description: "High risk" },
        { severity: "LOW", description: "Low risk" },
      ])
      .mockResolvedValueOnce([{ description: "Closed risk" }]);
    prismaMock.task.findMany.mockResolvedValue([{ title: "Task A" }]);

    const result = await summarizeProjectWeek({ projectId: "p1", daysBack: 7 });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      projectId: "p1",
      decisions: ["Decision A (by Lead)"],
    });
  });

  it("returns error when project is not found", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const result = await summarizeProjectWeek({ projectId: "missing" });

    expect(result).toEqual({
      success: false,
      error: 'Project with ID "missing" not found',
    });
  });

  it("returns error on invalid input", async () => {
    const result = await summarizeProjectWeek({ projectId: "p1", daysBack: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });
});
