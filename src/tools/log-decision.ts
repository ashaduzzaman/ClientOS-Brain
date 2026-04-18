import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "../db/client.js";
import { NotFoundError } from "../lib/errors.js";
import { LogDecisionSchema } from "../lib/validators.js";
import type { ToolResponse } from "../types/index.js";

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

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Unique constraint violation while creating decision";
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return "Foreign key constraint failed for provided project or superseded decision";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

/**
 * Records a project decision.
 * @param rawInput Unknown input payload.
 * @returns Tool response containing created decision.
 */
export async function logDecision(rawInput: unknown): Promise<ToolResponse> {
  try {
    const input = LogDecisionSchema.parse(rawInput);

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    if (input.supersedesId) {
      const superseded = await prisma.decision.findUnique({
        where: { id: input.supersedesId },
      });

      if (!superseded) {
        throw new NotFoundError("Decision", input.supersedesId);
      }

      if (superseded.projectId !== input.projectId) {
        return {
          success: false,
          error: "supersedesId must refer to a decision in the same project",
        };
      }
    }

    const decision = await prisma.decision.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        rationale: input.rationale,
        madeBy: input.madeBy,
        supersedesId: input.supersedesId,
      },
    });

    return {
      success: true,
      data: {
        id: decision.id,
        projectId: decision.projectId,
        title: decision.title,
        rationale: decision.rationale,
        madeBy: decision.madeBy,
        supersedesId: decision.supersedesId,
        createdAt: decision.createdAt.toISOString(),
      },
    };
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
