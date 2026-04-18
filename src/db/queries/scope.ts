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
 * Gets a project with all tasks.
 * @param projectId The project ID.
 * @returns Project including tasks.
 */
export async function getProjectWithTasks(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: true },
  });

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return project;
}

/**
 * Updates task scope status.
 * @param taskId The task ID.
 * @param isInScope The scope flag to set.
 * @returns Updated task.
 */
export async function updateTaskScopeStatus(
  taskId: string,
  isInScope: boolean,
) {
  try {
    return await prisma.task.update({
      where: { id: taskId },
      data: { isInScope },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new NotFoundError("Task", taskId);
    }
    throw error;
  }
}
