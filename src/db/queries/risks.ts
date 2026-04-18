import { Prisma, RiskSeverity, RiskStatus } from "@prisma/client";

import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../client.js";

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/**
 * Creates a risk for a project.
 * @param data The risk payload.
 * @returns The created risk record.
 */
export async function createRisk(data: {
  projectId: string;
  description: string;
  severity: RiskSeverity;
  flaggedBy?: string;
}) {
  try {
    return await prisma.risk.create({
      data: {
        ...data,
        status: RiskStatus.OPEN,
      },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new NotFoundError("Project", data.projectId);
    }
    throw error;
  }
}

/**
 * Lists risks for a project.
 * @param projectId The project ID.
 * @returns Array of risks.
 */
export async function getRisksByProject(projectId: string) {
  return prisma.risk.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Marks a risk as resolved.
 * @param id The risk ID.
 * @returns Updated risk record.
 */
export async function resolveRisk(id: string) {
  try {
    return await prisma.risk.update({
      where: { id },
      data: {
        status: RiskStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new NotFoundError("Risk", id);
    }
    throw error;
  }
}

/**
 * Counts open risks for a project.
 * @param projectId The project ID.
 * @returns Number of open risks.
 */
export async function getOpenRisksCount(projectId: string) {
  return prisma.risk.count({
    where: {
      projectId,
      status: { in: [RiskStatus.OPEN, RiskStatus.MONITORING] },
    },
  });
}
