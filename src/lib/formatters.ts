import { format } from "date-fns";

import type { WeekSummary } from "../types/index.js";

/**
 * Formats a date as YYYY-MM-DD.
 * @param date Date to format.
 * @returns Formatted date string.
 */
export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Formats a date as ISO datetime.
 * @param date Date to format.
 * @returns ISO date-time string.
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Builds the weekly digest body text.
 * @param data Weekly summary data.
 * @returns Formatted digest string.
 */
export function buildWeekDigest(data: WeekSummary): string {
  const highSeverityCount = data.risksOpened.filter(
    (risk) => risk.startsWith("HIGH:") || risk.startsWith("CRITICAL:"),
  ).length;

  const decisionLines =
    data.decisions.length > 0
      ? data.decisions.map((decision) => `- ${decision}`).join("\n")
      : "- None";

  return [
    `Weekly Update - ${data.projectName} (${data.clientName})`,
    `Period: ${data.period.from} to ${data.period.to}`,
    "",
    "Decisions Made:",
    decisionLines,
    "",
    "Risks:",
    `- Opened: ${data.risksOpened.length} new risks (${highSeverityCount} high severity)`,
    `- Resolved: ${data.risksResolved.length} risks closed`,
    "",
    `New Tasks Added: ${data.tasksAdded.length}`,
  ].join("\n");
}
