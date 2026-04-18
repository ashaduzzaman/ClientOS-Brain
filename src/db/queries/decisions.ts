import { Prisma } from "@prisma/client";

import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../client.js";

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/**
 * Creates a decision for a project.
 * @param data The decision payload.
 * @returns The created decision.
 */
export async function createDecision(data: {
  projectId: string;
  title: string;
  rationale: string;
  madeBy: string;
  supersedesId?: string;
}) {
  try {
    return await prisma.decision.create({ data });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new NotFoundError("Project or Decision", "unknown");
    }
    throw error;
  }
}

/**
 * Lists decisions for a project ordered by creation date.
 * @param projectId The project ID.
 * @returns Decision list.
 */
export async function getDecisionsByProject(projectId: string) {
  return prisma.decision.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Fetches a decision by ID.
 * @param id The decision ID.
 * @returns The decision record.
 */
export async function getDecisionById(id: string) {
  const decision = await prisma.decision.findUnique({ where: { id } });

  if (!decision) {
    throw new NotFoundError("Decision", id);
  }

  return decision;
}
