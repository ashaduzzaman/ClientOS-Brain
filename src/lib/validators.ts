import { z } from "zod";

/**
 * Input schema for get_client_context.
 * @param clientId The unique ID of the client.
 * @returns Validated get client context input.
 */
export const GetClientContextSchema = z.object({
  clientId: z.string().describe("The unique ID of the client"),
  includeProjects: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to include active project summaries"),
});

/**
 * Input schema for log_decision.
 * @returns Validated decision logging payload.
 */
export const LogDecisionSchema = z.object({
  projectId: z
    .string()
    .describe("The ID of the project this decision belongs to"),
  title: z.string().min(3).max(200).describe("Short title for the decision"),
  rationale: z.string().min(10).describe("Why this decision was made"),
  madeBy: z.string().describe("Name or role of who made the decision"),
  supersedesId: z
    .string()
    .optional()
    .describe("ID of the previous decision this replaces, if any"),
});

/**
 * Input schema for get_decision_trail.
 * @returns Validated decision trail payload.
 */
export const GetDecisionTrailSchema = z.object({
  projectId: z
    .string()
    .describe("The ID of the project to retrieve decision history for"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Max number of decisions to return"),
});

/**
 * Input schema for flag_risk.
 * @returns Validated risk payload.
 */
export const FlagRiskSchema = z.object({
  projectId: z.string().describe("The project this risk belongs to"),
  description: z
    .string()
    .min(10)
    .describe("Clear description of the risk or concern"),
  severity: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .describe("Severity level of the risk"),
  flaggedBy: z.string().optional().describe("Who flagged this risk"),
});

/**
 * Input schema for summarize_project_week.
 * @returns Validated weekly summary payload.
 */
export const SummarizeProjectWeekSchema = z.object({
  projectId: z.string().describe("The project to summarize"),
  daysBack: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(7)
    .describe("Number of days to look back, default 7"),
});

/**
 * Input schema for detect_scope_creep.
 * @returns Validated scope creep payload.
 */
export const DetectScopeCreepSchema = z.object({
  projectId: z.string().describe("The project to analyze for scope creep"),
  markAsCreep: z
    .array(z.string())
    .optional()
    .describe("Array of task IDs to explicitly mark as scope creep"),
});
