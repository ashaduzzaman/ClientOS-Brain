import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDecision,
  getDecisionById,
} from "../../src/db/queries/decisions.js";
import { resolveRisk } from "../../src/db/queries/risks.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    decision: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    risk: {
      update: vi.fn(),
    },
  },
}));

vi.mock("../../src/db/client.js", () => ({
  prisma: prismaMock,
}));

describe("query functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a decision", async () => {
    prismaMock.decision.create.mockResolvedValue({ id: "d1" });

    const result = await createDecision({
      projectId: "p1",
      title: "Decision",
      rationale: "Rationale text",
      madeBy: "Lead",
    });

    expect(result).toEqual({ id: "d1" });
  });

  it("throws not found on missing decision", async () => {
    prismaMock.decision.findUnique.mockResolvedValue(null);

    await expect(getDecisionById("missing")).rejects.toThrow(
      'Decision with ID "missing" not found',
    );
  });

  it("maps P2025 on resolveRisk", async () => {
    prismaMock.risk.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Missing", {
        code: "P2025",
        clientVersion: "5.0.0",
      }),
    );

    await expect(resolveRisk("missing")).rejects.toThrow(
      'Risk with ID "missing" not found',
    );
  });
});
