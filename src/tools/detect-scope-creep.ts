import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "../db/client.js";
import { NotFoundError } from "../lib/errors.js";
import { DetectScopeCreepSchema } from "../lib/validators.js";
import type { ScopeCreepReport, ToolResponse } from "../types/index.js";

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
 * Detects potential scope creep from tasks and agreed scope.
 * @param rawInput Unknown input payload.
 * @returns Tool response containing scope creep report.
 */
export async function detectScopeCreep(
  rawInput: unknown,
): Promise<ToolResponse> {
  try {
    const input = DetectScopeCreepSchema.parse(rawInput);

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: { tasks: true },
    });

    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    if (input.markAsCreep && input.markAsCreep.length > 0) {
      await prisma.task.updateMany({
        where: {
          projectId: input.projectId,
          id: { in: input.markAsCreep },
        },
        data: { isInScope: false },
      });
    }

    const refreshedProject = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: { tasks: true },
    });

    if (!refreshedProject) {
      throw new NotFoundError("Project", input.projectId);
    }

    const totalTasks = refreshedProject.tasks.length;
    const flaggedTasks = refreshedProject.tasks.filter(
      (task) => task.isInScope === false,
    );
    const creepScore =
      totalTasks === 0
        ? 0
        : Math.round((flaggedTasks.length / totalTasks) * 100);

    const report: ScopeCreepReport = {
      projectId: refreshedProject.id,
      projectName: refreshedProject.name,
      agreedScope: refreshedProject.agreedScope,
      totalTasks,
      flaggedTasks: flaggedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        addedAt: task.addedAt.toISOString(),
      })),
      creepScore,
    };

    return { success: true, data: report };
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
