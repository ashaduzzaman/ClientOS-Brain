import { Prisma, RiskSeverity, RiskStatus } from "@prisma/client";
import { subDays } from "date-fns";
import { ZodError } from "zod";

import { prisma } from "../db/client.js";
import { NotFoundError } from "../lib/errors.js";
import { buildWeekDigest, formatDate } from "../lib/formatters.js";
import { SummarizeProjectWeekSchema } from "../lib/validators.js";
import type { ToolResponse, WeekSummary } from "../types/index.js";

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
 * Generates a weekly digest for project activity.
 * @param rawInput Unknown input payload.
 * @returns Tool response containing weekly summary.
 */
export async function summarizeProjectWeek(
  rawInput: unknown,
): Promise<ToolResponse> {
  try {
    const input = SummarizeProjectWeekSchema.parse(rawInput);
    const toDate = new Date();
    const fromDate = subDays(toDate, input.daysBack);

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: { client: true },
    });

    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    const [decisions, risksOpened, risksResolved, tasksAdded] =
      await Promise.all([
        prisma.decision.findMany({
          where: { projectId: input.projectId, createdAt: { gte: fromDate } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.risk.findMany({
          where: { projectId: input.projectId, createdAt: { gte: fromDate } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.risk.findMany({
          where: {
            projectId: input.projectId,
            status: RiskStatus.RESOLVED,
            resolvedAt: { gte: fromDate },
          },
          orderBy: { resolvedAt: "asc" },
        }),
        prisma.task.findMany({
          where: { projectId: input.projectId, addedAt: { gte: fromDate } },
          orderBy: { addedAt: "asc" },
        }),
      ]);

    const decisionLines = decisions.map(
      (decision) => `${decision.title} (by ${decision.madeBy})`,
    );
    const risksOpenedLines = risksOpened.map(
      (risk) => `${risk.severity}: ${risk.description}`,
    );
    const risksResolvedLines = risksResolved.map((risk) => risk.description);
    const tasksAddedLines = tasksAdded.map((task) => task.title);

    const weekSummaryBase: WeekSummary = {
      projectId: project.id,
      projectName: project.name,
      clientName: project.client.name,
      period: {
        from: formatDate(fromDate),
        to: formatDate(toDate),
      },
      decisions: decisionLines,
      risksOpened: risksOpenedLines,
      risksResolved: risksResolvedLines,
      tasksAdded: tasksAddedLines,
      digest: "",
    };

    const highSeverityCount = risksOpened.filter(
      (risk) =>
        risk.severity === RiskSeverity.HIGH ||
        risk.severity === RiskSeverity.CRITICAL,
    ).length;

    const digest = buildWeekDigest({
      ...weekSummaryBase,
      risksOpened: risksOpenedLines.map((line) => line),
    }).replace(
      "new risks (",
      `new risks (${highSeverityCount} high severity, `,
    );

    const summary: WeekSummary = {
      ...weekSummaryBase,
      digest,
    };

    return { success: true, data: summary };
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
