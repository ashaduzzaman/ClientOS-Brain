import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "../db/client.js";
import { NotFoundError } from "../lib/errors.js";
import { GetDecisionTrailSchema } from "../lib/validators.js";
import type { DecisionTrail, ToolResponse } from "../types/index.js";

function formatZodError(error: ZodError): string {
  return error.errors
    .map((entry) => `${entry.path.join(".")}: ${entry.message}`)
    .join(", ");
}

function mapError(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1001"
  ) {
    return "Database unavailable";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

/**
 * Returns chronological decision history for a project.
 * @param rawInput Unknown input payload.
 * @returns Tool response containing the decision trail.
 */
export async function getDecisionTrail(
  rawInput: unknown,
): Promise<ToolResponse> {
  try {
    const input = GetDecisionTrailSchema.parse(rawInput);

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    const decisions = await prisma.decision.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: "asc" },
      take: input.limit,
    });

    const decisionMap = new Map(
      decisions.map((decision) => [decision.id, decision.title]),
    );

    const trail: DecisionTrail = {
      projectId: project.id,
      projectName: project.name,
      decisions: decisions.map((decision) => ({
        id: decision.id,
        title: decision.title,
        rationale: decision.rationale,
        madeBy: decision.madeBy,
        createdAt: decision.createdAt.toISOString(),
        supersedes: decision.supersedesId
          ? (decisionMap.get(decision.supersedesId) ?? null)
          : null,
      })),
    };

    return { success: true, data: trail };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: `Invalid input - ${formatZodError(error)}`,
      };
    }

    return { success: false, error: mapError(error) };
  }
}
