import { Prisma, RiskSeverity, RiskStatus } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "../db/client.js";
import { NotFoundError } from "../lib/errors.js";
import { FlagRiskSchema } from "../lib/validators.js";
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
    error.code === "P2003"
  ) {
    return "Foreign key constraint failed for the provided project";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

/**
 * Logs a project risk with severity.
 * @param rawInput Unknown input payload.
 * @returns Tool response containing created risk.
 */
export async function flagRisk(rawInput: unknown): Promise<ToolResponse> {
  try {
    const input = FlagRiskSchema.parse(rawInput);

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    const risk = await prisma.risk.create({
      data: {
        projectId: input.projectId,
        description: input.description,
        severity: input.severity as RiskSeverity,
        flaggedBy: input.flaggedBy,
        status: RiskStatus.OPEN,
      },
    });

    return {
      success: true,
      data: {
        id: risk.id,
        projectId: risk.projectId,
        description: risk.description,
        severity: risk.severity,
        status: risk.status,
        flaggedBy: risk.flaggedBy,
        createdAt: risk.createdAt.toISOString(),
        message: "Risk flagged successfully",
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
