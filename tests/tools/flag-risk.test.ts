import { beforeEach, describe, expect, it, vi } from "vitest";

import { flagRisk } from "../../src/tools/flag-risk.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    risk: { create: vi.fn() },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("flagRisk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with valid input", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1" });
    prismaMock.risk.create.mockResolvedValue({
      id: "r1",
      projectId: "p1",
      description: "This is a valid risk description.",
      severity: "HIGH",
      status: "OPEN",
      flaggedBy: "Lead",
      createdAt: new Date("2026-04-18T00:00:00.000Z"),
    });

    const result = await flagRisk({
      projectId: "p1",
      description: "This is a valid risk description.",
      severity: "HIGH",
      flaggedBy: "Lead",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "r1", status: "OPEN" });
  });

  it("returns error when project is not found", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const result = await flagRisk({
      projectId: "missing",
      description: "This is a valid risk description.",
      severity: "HIGH",
    });

    expect(result).toEqual({
      success: false,
      error: 'Project with ID "missing" not found',
    });
  });

  it("returns error on invalid input", async () => {
    const result = await flagRisk({
      projectId: "p1",
      description: "short",
      severity: "LOW",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });
});
