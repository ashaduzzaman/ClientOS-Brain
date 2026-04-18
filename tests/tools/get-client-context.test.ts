import { beforeEach, describe, expect, it, vi } from "vitest";

import { getClientContext } from "../../src/tools/get-client-context.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    client: { findUnique: vi.fn() },
    project: { findMany: vi.fn() },
    risk: { count: vi.fn() },
    decision: { count: vi.fn() },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("getClientContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with valid input", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      id: "c1",
      name: "Acme",
      industry: "SaaS",
      contactName: "Sam",
      personality: "Direct",
      relationshipScore: 8,
      notes: "Healthy",
    });
    prismaMock.project.findMany.mockResolvedValue([
      { id: "p1", name: "Project 1", status: "ACTIVE" },
    ]);
    prismaMock.risk.count.mockResolvedValue(2);
    prismaMock.decision.count.mockResolvedValue(1);

    const result = await getClientContext({
      clientId: "c1",
      includeProjects: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      client: { id: "c1" },
      activeProjects: [{ id: "p1", openRisks: 2, recentDecisions: 1 }],
    });
  });

  it("returns error when client is not found", async () => {
    prismaMock.client.findUnique.mockResolvedValue(null);

    const result = await getClientContext({ clientId: "missing" });

    expect(result).toEqual({
      success: false,
      error: 'Client with ID "missing" not found',
    });
  });

  it("returns error on invalid input", async () => {
    const result = await getClientContext({ includeProjects: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });
});
