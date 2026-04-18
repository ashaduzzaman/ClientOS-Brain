# ClientOS Brain MCP Server
[![MCPize](https://mcpize.com/badge/@ashaduzzaman.nstu1994/clientos-brain)](https://mcpize.com/mcp/clientos-brain)

ClientOS Brain is a TypeScript MCP server that stores and serves structured project intelligence for client work.

## Connect via MCPize

Use this MCP server instantly with no local installation:

```bash
npx -y mcpize connect @ashaduzzaman.nstu1994/clientos-brain --client claude
```

Or connect at: **https://mcpize.com/mcp/clientos-brain**

## Features

- Client context briefing with relationship signals and active project status
- Auditable project decision logging and chronological decision trails
- Risk tracking with severity and status handling
- Weekly project digest generation for team/client updates
- Scope creep detection with task-level flagging and creep scoring

## Tech Stack

- Node.js 20+
- TypeScript 5
- @modelcontextprotocol/sdk
- Prisma + PostgreSQL (Supabase compatible)
- Zod validation
- Vitest testing

## Project Structure

- `src/index.ts` - MCP entrypoint
- `src/server.ts` - tool registration and MCP server bootstrap
- `src/tools/` - six MCP tool implementations
- `src/db/` - Prisma client and query modules
- `src/lib/` - validators, errors, formatters
- `src/types/` - shared response and payload types
- `tests/` - tool and query tests
- `scripts/seed.ts` - local development seed script

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
# Set DATABASE_URL in .env
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Apply migrations (first run):

```bash
npm run db:migrate
```

5. Seed sample data:

```bash
npm run db:seed
```

6. Build and test:

```bash
npm run build
npm test
```

7. Run locally with MCPize dev playground:

```bash
mcpize dev --playground
```

## MCP Tools

### get_client_context

Use to generate a contextual brief before meetings.

Example payload:

```json
{
  "clientId": "clx123abc",
  "includeProjects": true
}
```

### log_decision

Use to record key decisions with rationale and ownership.

Example payload:

```json
{
  "projectId": "prj456def",
  "title": "Switch from REST to GraphQL",
  "rationale": "Client requested real-time updates, GraphQL subscriptions are a better fit.",
  "madeBy": "Tech Lead"
}
```

### get_decision_trail

Use to retrieve chronological project decision history.

Example payload:

```json
{
  "projectId": "prj456def",
  "limit": 50
}
```

### flag_risk

Use to log a project risk with severity.

Example payload:

```json
{
  "projectId": "prj456def",
  "description": "Client sign-off delays may impact sprint closure.",
  "severity": "HIGH",
  "flaggedBy": "Delivery Lead"
}
```

### summarize_project_week

Use to generate a weekly activity digest.

Example payload:

```json
{
  "projectId": "prj456def",
  "daysBack": 7
}
```

### detect_scope_creep

Use to compute creep score and list out-of-scope tasks.

Example payload:

```json
{
  "projectId": "prj456def",
  "markAsCreep": ["task123", "task456"]
}
```

## Deployment (MCPize)

```bash
npm run build
mcpize login
mcpize secrets set DATABASE_URL <your-supabase-url>
mcpize deploy
mcpize status
mcpize logs --follow
```

## Notes

- Tool functions always return `ToolResponse` and do not throw to MCP layer.
- Input validation is enforced with Zod on every tool.
- Keep `DATABASE_URL` in secrets and never commit `.env`.