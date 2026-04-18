import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  DetectScopeCreepSchema,
  FlagRiskSchema,
  GetClientContextSchema,
  GetDecisionTrailSchema,
  LogDecisionSchema,
  SummarizeProjectWeekSchema,
} from "./lib/validators.js";
import { detectScopeCreep } from "./tools/detect-scope-creep.js";
import { flagRisk } from "./tools/flag-risk.js";
import { getClientContext } from "./tools/get-client-context.js";
import { getDecisionTrail } from "./tools/get-decision-trail.js";
import { logDecision } from "./tools/log-decision.js";
import { summarizeProjectWeek } from "./tools/summarize-project-week.js";

/**
 * Creates and configures the MCP server with all tool registrations.
 * @returns Configured MCP server instance.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "clientos-brain",
    version: "1.0.0",
  });

  server.registerTool(
    "get_client_context",
    {
      description:
        "Returns a rich contextual brief for a client including their personality, relationship health score, active projects, open risks, and recent decisions. Use this before any client call or meeting to get up to speed instantly.",
      inputSchema: GetClientContextSchema.shape,
    },
    async (args) => {
      const result = await getClientContext(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "log_decision",
    {
      description:
        "Records a project decision with its rationale and who made it. Optionally marks it as superseding a previous decision. Use this whenever a key decision is made during a project to maintain an auditable trail.",
      inputSchema: LogDecisionSchema.shape,
    },
    async (args) => {
      const result = await logDecision(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_decision_trail",
    {
      description:
        "Returns the full chronological history of decisions made on a project, including which decisions were superseded by others. Use this to understand why something is the way it is, or to reconstruct project rationale.",
      inputSchema: GetDecisionTrailSchema.shape,
    },
    async (args) => {
      const result = await getDecisionTrail(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "flag_risk",
    {
      description:
        "Logs a risk or concern on a project with a severity level. Use this to track potential blockers, client relationship issues, technical debt, or scope concerns. Risks are surfaced in project context summaries.",
      inputSchema: FlagRiskSchema.shape,
    },
    async (args) => {
      const result = await flagRisk(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "summarize_project_week",
    {
      description:
        "Generates a weekly activity digest for a project covering the past 7 days. Includes decisions made, risks opened/resolved, and tasks added. Returns a formatted summary ready to send to a client or share with the team.",
      inputSchema: SummarizeProjectWeekSchema.shape,
    },
    async (args) => {
      const result = await summarizeProjectWeek(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "detect_scope_creep",
    {
      description:
        "Analyzes tasks on a project and compares them against the original agreed scope to detect potential scope creep. Returns a creep score from 0-100 and a list of tasks that appear to be outside the original scope.",
      inputSchema: DetectScopeCreepSchema.shape,
    },
    async (args) => {
      const result = await detectScopeCreep(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  return server;
}
