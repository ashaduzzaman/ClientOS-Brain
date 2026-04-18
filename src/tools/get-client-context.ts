import { Prisma, ProjectStatus, RiskStatus } from "@prisma/client";
import { subDays } from "date-fns";
import { ZodError } from "zod";

import { prisma } from "../db/client.js";
import { NotFoundError } from "../lib/errors.js";
import { GetClientContextSchema } from "../lib/validators.js";
import type { ClientContext, ToolResponse } from "../types/index.js";

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
 * Returns a rich contextual brief for a client.
 * @param rawInput Unknown input payload.
 * @returns Tool response containing client context.
 */
export async function getClientContext(
  rawInput: unknown,
): Promise<ToolResponse> {
  try {
    const input = GetClientContextSchema.parse(rawInput);
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    });

    if (!client) {
      throw new NotFoundError("Client", input.clientId);
    }

    const recentThreshold = subDays(new Date(), 14);
    const activeProjects = input.includeProjects
      ? await prisma.project.findMany({
          where: {
            clientId: input.clientId,
            status: ProjectStatus.ACTIVE,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const projectSummaries: ClientContext["activeProjects"] = [];
    let totalOpenRisks = 0;

    for (const project of activeProjects) {
      const [openRisks, recentDecisions] = await Promise.all([
        prisma.risk.count({
          where: {
            projectId: project.id,
            status: { in: [RiskStatus.OPEN, RiskStatus.MONITORING] },
          },
        }),
        prisma.decision.count({
          where: {
            projectId: project.id,
            createdAt: { gte: recentThreshold },
          },
        }),
      ]);

      totalOpenRisks += openRisks;

      projectSummaries.push({
        id: project.id,
        name: project.name,
        status: project.status,
        openRisks,
        recentDecisions,
      });
    }

    const context: ClientContext = {
      client: {
        id: client.id,
        name: client.name,
        industry: client.industry,
        contactName: client.contactName,
        personality: client.personality,
        relationshipScore: client.relationshipScore,
        notes: client.notes,
      },
      activeProjects: projectSummaries,
      summary: `${client.name} is a ${client.industry ?? "general"} client with ${client.relationshipScore}/10 relationship health. They have ${projectSummaries.length} active projects. ${totalOpenRisks} open risks need attention.`,
    };

    return { success: true, data: context };
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
