import { beforeEach, describe, expect, it, vi } from "vitest";

import { detectScopeCreep } from "../../src/tools/detect-scope-creep.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    task: { updateMany: vi.fn() },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("detectScopeCreep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with valid input", async () => {
    prismaMock.project.findUnique
      .mockResolvedValueOnce({
        id: "p1",
        name: "Project",
        agreedScope: "Scope",
        tasks: [
          {
            id: "t1",
            title: "A",
            isInScope: true,
            addedAt: new Date("2026-04-10"),
          },
          {
            id: "t2",
            title: "B",
            isInScope: false,
            addedAt: new Date("2026-04-11"),
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "p1",
        name: "Project",
        agreedScope: "Scope",
        tasks: [
          {
            id: "t1",
            title: "A",
            isInScope: true,
            addedAt: new Date("2026-04-10"),
          },
          {
            id: "t2",
            title: "B",
            isInScope: false,
            addedAt: new Date("2026-04-11"),
          },
        ],
      });

    const result = await detectScopeCreep({ projectId: "p1" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ creepScore: 50, totalTasks: 2 });
  });

  it("returns error when project is not found", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const result = await detectScopeCreep({ projectId: "missing" });

    expect(result).toEqual({
      success: false,
      error: 'Project with ID "missing" not found',
    });
  });

  it("returns error on invalid input", async () => {
    const result = await detectScopeCreep({ projectId: 42 });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });
});
