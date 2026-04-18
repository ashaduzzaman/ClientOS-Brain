# ClientOS Brain MCP Server — AI Agent Blueprint

> **For GitHub Copilot Agent / AI Coding Agents**
> This document is the single source of truth. Read it fully before writing any code.
> Execute tasks in strict phase order. Do not skip steps. Do not assume.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Data Models](#4-data-models)
5. [MCP Tool Definitions](#5-mcp-tool-definitions)
6. [Phase-by-Phase Build Plan](#6-phase-by-phase-build-plan)
7. [Environment & Configuration](#7-environment--configuration)
8. [API Reference](#8-api-reference)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment via MCPize](#10-deployment-via-mcpize)
11. [Coding Rules & Conventions](#11-coding-rules--conventions)
12. [Error Handling Contracts](#12-error-handling-contracts)

---

## 1. Project Overview

**Name:** ClientOS Brain MCP Server
**Purpose:** A cloud-deployed MCP (Model Context Protocol) server that acts as a living project memory and intelligence layer for agencies and consultancies. It is consumed by Claude Desktop, Claude Code, Cursor, or any MCP-compatible AI client.

**Core Value Proposition:**
- Eliminates context amnesia when working on client projects
- Stores decisions, risks, scope, and relationship health as structured data
- Exposes this intelligence to AI agents via MCP tools
- Enables pre-call briefs, scope creep detection, and weekly digests — automatically

**Deployment Target:** MCPize cloud (via `mcpize deploy`)
**Transport:** HTTP/SSE (MCPize managed)
**Runtime:** Node.js 20+, TypeScript

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 5.x |
| Runtime | Node.js | 20+ |
| MCP Framework | `@modelcontextprotocol/sdk` | latest |
| Database | Supabase (PostgreSQL) | latest |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Date handling | date-fns | 3.x |
| Testing | Vitest | latest |
| Linting | ESLint + Prettier | latest |
| Deployment | MCPize CLI | latest |

**Do NOT use:** Express, Fastify, or any HTTP framework. The MCP SDK handles transport.

---

## 3. Repository Structure

Create exactly this folder and file structure. Do not deviate:

```
clientos-brain-mcp/
├── AGENTS.md                     ← this file (do not modify)
├── mcpize.yaml                   ← MCPize deployment config
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── prisma/
│   └── schema.prisma             ← database schema
├── src/
│   ├── index.ts                  ← MCP server entry point
│   ├── server.ts                 ← server bootstrap and tool registration
│   ├── tools/
│   │   ├── index.ts              ← barrel export of all tools
│   │   ├── get-client-context.ts
│   │   ├── log-decision.ts
│   │   ├── get-decision-trail.ts
│   │   ├── flag-risk.ts
│   │   ├── summarize-project-week.ts
│   │   └── detect-scope-creep.ts
│   ├── db/
│   │   ├── client.ts             ← Prisma client singleton
│   │   └── queries/
│   │       ├── clients.ts
│   │       ├── decisions.ts
│   │       ├── risks.ts
│   │       └── scope.ts
│   ├── lib/
│   │   ├── validators.ts         ← Zod schemas for all tool inputs
│   │   ├── formatters.ts         ← output formatting helpers
│   │   └── errors.ts             ← custom error classes
│   └── types/
│       └── index.ts              ← shared TypeScript types
├── tests/
│   ├── tools/
│   │   ├── get-client-context.test.ts
│   │   ├── log-decision.test.ts
│   │   ├── get-decision-trail.test.ts
│   │   ├── flag-risk.test.ts
│   │   ├── summarize-project-week.test.ts
│   │   └── detect-scope-creep.test.ts
│   └── db/
│       └── queries.test.ts
└── scripts/
    └── seed.ts                   ← seed script for local dev
```

---

## 4. Data Models

### 4.1 Prisma Schema

Create `prisma/schema.prisma` with exactly this content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Client {
  id                String    @id @default(cuid())
  name              String
  industry          String?
  contactName       String?
  contactEmail      String?
  personality       String?   // free-text: "prefers async", "very formal", etc.
  relationshipScore Int       @default(5) // 1-10
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  projects   Project[]

  @@map("clients")
}

model Project {
  id          String    @id @default(cuid())
  clientId    String
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  agreedScope String?   // original agreed scope as free text or JSON string
  startedAt   DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  client      Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  decisions   Decision[]
  risks       Risk[]
  tasks       Task[]

  @@map("projects")
}

enum ProjectStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

model Decision {
  id          String   @id @default(cuid())
  projectId   String
  title       String
  rationale   String
  madeBy      String   // person or team
  supersedesId String? // ID of the decision this replaces
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  supersedes  Decision? @relation("DecisionChain", fields: [supersedesId], references: [id])
  supersededBy Decision[] @relation("DecisionChain")

  @@map("decisions")
}

model Risk {
  id          String     @id @default(cuid())
  projectId   String
  description String
  severity    RiskSeverity
  status      RiskStatus @default(OPEN)
  flaggedBy   String?
  resolvedAt  DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("risks")
}

enum RiskSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum RiskStatus {
  OPEN
  MONITORING
  RESOLVED
}

model Task {
  id          String   @id @default(cuid())
  projectId   String
  title       String
  description String?
  isInScope   Boolean? // null = unknown, true = in scope, false = scope creep
  addedAt     DateTime @default(now())
  addedBy     String?

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("tasks")
}
```

### 4.2 TypeScript Types

Create `src/types/index.ts`:

```typescript
export type ToolResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type ClientContext = {
  client: {
    id: string;
    name: string;
    industry: string | null;
    contactName: string | null;
    personality: string | null;
    relationshipScore: number;
    notes: string | null;
  };
  activeProjects: {
    id: string;
    name: string;
    status: string;
    openRisks: number;
    recentDecisions: number;
  }[];
  summary: string;
};

export type DecisionTrail = {
  projectId: string;
  projectName: string;
  decisions: {
    id: string;
    title: string;
    rationale: string;
    madeBy: string;
    createdAt: string;
    supersedes: string | null;
  }[];
};

export type WeekSummary = {
  projectId: string;
  projectName: string;
  clientName: string;
  period: { from: string; to: string };
  decisions: string[];
  risksOpened: string[];
  risksResolved: string[];
  tasksAdded: string[];
  digest: string;
};

export type ScopeCreepReport = {
  projectId: string;
  projectName: string;
  agreedScope: string | null;
  totalTasks: number;
  flaggedTasks: {
    id: string;
    title: string;
    addedAt: string;
  }[];
  creepScore: number; // 0-100
};
```

---

## 5. MCP Tool Definitions

There are exactly **6 tools**. Each tool follows this contract:

### Tool Contract Rules (READ BEFORE IMPLEMENTING)
- Every tool receives input validated by a Zod schema
- Every tool returns a plain object (never throws to the MCP layer — catch all errors internally)
- Every tool returns `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- Tool descriptions must be detailed enough for an LLM to call them correctly without documentation

---

### Tool 1: `get_client_context`

**File:** `src/tools/get-client-context.ts`

**Description for MCP:**
```
Returns a rich contextual brief for a client including their personality, relationship health score, active projects, open risks, and recent decisions. Use this before any client call or meeting to get up to speed instantly.
```

**Input schema (Zod):**
```typescript
z.object({
  clientId: z.string().describe("The unique ID of the client"),
  includeProjects: z.boolean().optional().default(true).describe("Whether to include active project summaries"),
})
```

**Logic:**
1. Fetch client by `clientId` from `clients` table
2. If `includeProjects`, fetch all active projects for that client
3. For each project, count open risks and decisions from the last 14 days
4. Construct a `ClientContext` object
5. Generate a plain-English `summary` string like: `"[Name] is a [industry] client with [score]/10 relationship health. They have [N] active projects. [N] open risks need attention."`
6. Return the full context object

---

### Tool 2: `log_decision`

**File:** `src/tools/log-decision.ts`

**Description for MCP:**
```
Records a project decision with its rationale and who made it. Optionally marks it as superseding a previous decision. Use this whenever a key decision is made during a project to maintain an auditable trail.
```

**Input schema (Zod):**
```typescript
z.object({
  projectId: z.string().describe("The ID of the project this decision belongs to"),
  title: z.string().min(3).max(200).describe("Short title for the decision"),
  rationale: z.string().min(10).describe("Why this decision was made"),
  madeBy: z.string().describe("Name or role of who made the decision"),
  supersedesId: z.string().optional().describe("ID of the previous decision this replaces, if any"),
})
```

**Logic:**
1. Validate all inputs
2. If `supersedesId` provided, verify it exists and belongs to the same project
3. Insert new `Decision` record
4. Return the created decision with its ID

---

### Tool 3: `get_decision_trail`

**File:** `src/tools/get-decision-trail.ts`

**Description for MCP:**
```
Returns the full chronological history of decisions made on a project, including which decisions were superseded by others. Use this to understand why something is the way it is, or to reconstruct project rationale.
```

**Input schema (Zod):**
```typescript
z.object({
  projectId: z.string().describe("The ID of the project to retrieve decision history for"),
  limit: z.number().int().min(1).max(100).optional().default(50).describe("Max number of decisions to return"),
})
```

**Logic:**
1. Fetch all decisions for `projectId`, ordered by `createdAt` ASC
2. For each decision, resolve `supersedesId` to the title of the decision it replaced
3. Return as `DecisionTrail`

---

### Tool 4: `flag_risk`

**File:** `src/tools/flag-risk.ts`

**Description for MCP:**
```
Logs a risk or concern on a project with a severity level. Use this to track potential blockers, client relationship issues, technical debt, or scope concerns. Risks are surfaced in project context summaries.
```

**Input schema (Zod):**
```typescript
z.object({
  projectId: z.string().describe("The project this risk belongs to"),
  description: z.string().min(10).describe("Clear description of the risk or concern"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Severity level of the risk"),
  flaggedBy: z.string().optional().describe("Who flagged this risk"),
})
```

**Logic:**
1. Validate inputs
2. Insert `Risk` record with `status: OPEN`
3. Return the created risk with its ID and a confirmation message

---

### Tool 5: `summarize_project_week`

**File:** `src/tools/summarize-project-week.ts`

**Description for MCP:**
```
Generates a weekly activity digest for a project covering the past 7 days. Includes decisions made, risks opened/resolved, and tasks added. Returns a formatted summary ready to send to a client or share with the team.
```

**Input schema (Zod):**
```typescript
z.object({
  projectId: z.string().describe("The project to summarize"),
  daysBack: z.number().int().min(1).max(30).optional().default(7).describe("Number of days to look back, default 7"),
})
```

**Logic:**
1. Calculate `fromDate = now - daysBack days`
2. Fetch decisions created after `fromDate` for the project
3. Fetch risks opened after `fromDate`
4. Fetch risks resolved after `fromDate`
5. Fetch tasks added after `fromDate`
6. Compose a `digest` string in this format:
   ```
   Weekly Update — [Project Name] ([Client Name])
   Period: [from] to [to]

   Decisions Made:
   - [title] (by [madeBy])

   Risks:
   - Opened: [N] new risks ([HIGH/CRITICAL count] high severity)
   - Resolved: [N] risks closed

   New Tasks Added: [N]
   ```
7. Return as `WeekSummary`

---

### Tool 6: `detect_scope_creep`

**File:** `src/tools/detect-scope-creep.ts`

**Description for MCP:**
```
Analyzes tasks on a project and compares them against the original agreed scope to detect potential scope creep. Returns a creep score from 0-100 and a list of tasks that appear to be outside the original scope.
```

**Input schema (Zod):**
```typescript
z.object({
  projectId: z.string().describe("The project to analyze for scope creep"),
  markAsCreep: z.array(z.string()).optional().describe("Array of task IDs to explicitly mark as scope creep"),
})
```

**Logic:**
1. Fetch the project including `agreedScope` and all tasks
2. If `markAsCreep` provided, update those task IDs to `isInScope: false`
3. Count tasks where `isInScope === false`
4. Calculate `creepScore = Math.round((flaggedTasks / totalTasks) * 100)`
5. Return as `ScopeCreepReport`

---

## 6. Phase-by-Phase Build Plan

Execute phases in strict order. Complete all tasks in a phase before moving to the next.

---

### Phase 0 — Project Bootstrap

**Goal:** Working repository with all config files in place.

**Tasks:**
- [ ] `npm init -y`
- [ ] Install dependencies:
  ```bash
  npm install @modelcontextprotocol/sdk @prisma/client zod date-fns
  npm install -D typescript @types/node prisma vitest ts-node dotenv
  ```
- [ ] Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "resolveJsonModule": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "tests"]
  }
  ```
- [ ] Create `.env.example`:
  ```
  DATABASE_URL=postgresql://user:password@host:5432/clientos_brain
  ```
- [ ] Create `.gitignore` (include `node_modules`, `dist`, `.env`, `*.js.map`)
- [ ] Create `package.json` scripts:
  ```json
  {
    "scripts": {
      "build": "tsc",
      "dev": "mcpize dev src/index.ts",
      "start": "node dist/index.js",
      "test": "vitest run",
      "test:watch": "vitest",
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev",
      "db:seed": "ts-node scripts/seed.ts",
      "db:studio": "prisma studio"
    }
  }
  ```

**Verification:** `npx tsc --noEmit` passes with zero errors.

---

### Phase 1 — Database Layer

**Goal:** Prisma schema + DB client + query functions all working.

**Tasks:**
- [ ] Create `prisma/schema.prisma` exactly as specified in Section 4.1
- [ ] Run `npx prisma generate`
- [ ] Create `src/db/client.ts`:
  ```typescript
  import { PrismaClient } from "@prisma/client";

  const globalForPrisma = global as unknown as { prisma: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- [ ] Create query files in `src/db/queries/`:

  **`clients.ts`** — exports: `getClientById`, `listClients`, `createClient`

  **`decisions.ts`** — exports: `createDecision`, `getDecisionsByProject`, `getDecisionById`

  **`risks.ts`** — exports: `createRisk`, `getRisksByProject`, `resolveRisk`, `getOpenRisksCount`

  **`scope.ts`** — exports: `getProjectWithTasks`, `updateTaskScopeStatus`

- [ ] Create `scripts/seed.ts` that inserts:
  - 2 sample clients
  - 1 project per client
  - 3 decisions per project
  - 2 risks per project
  - 5 tasks per project (2 marked as scope creep)

**Verification:** `npx ts-node scripts/seed.ts` runs without errors.

---

### Phase 2 — Validators & Helpers

**Goal:** All Zod schemas and utility functions in place before tools are built.

**Tasks:**
- [ ] Create `src/lib/validators.ts` with Zod schemas for all 6 tool inputs (named exports: `GetClientContextSchema`, `LogDecisionSchema`, `GetDecisionTrailSchema`, `FlagRiskSchema`, `SummarizeProjectWeekSchema`, `DetectScopeCreepSchema`)
- [ ] Create `src/lib/errors.ts`:
  ```typescript
  export class NotFoundError extends Error {
    constructor(resource: string, id: string) {
      super(`${resource} with ID "${id}" not found`);
      this.name = "NotFoundError";
    }
  }

  export class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValidationError";
    }
  }
  ```
- [ ] Create `src/lib/formatters.ts` with:
  - `formatDate(date: Date): string` — returns `YYYY-MM-DD`
  - `formatDateTime(date: Date): string` — returns ISO string
  - `buildWeekDigest(data: WeekSummary): string` — formats the digest text block

**Verification:** All files compile with `npx tsc --noEmit`.

---

### Phase 3 — Tool Implementations

**Goal:** All 6 tools implemented, each in its own file.

**Implementation pattern for every tool:**

```typescript
// src/tools/[tool-name].ts
import { prisma } from "../db/client.js";
import { SomeSchema } from "../lib/validators.js";
import { NotFoundError } from "../lib/errors.js";
import type { ToolResponse } from "../types/index.js";

export async function toolName(rawInput: unknown): Promise<ToolResponse> {
  try {
    const input = SomeSchema.parse(rawInput);
    // ... business logic using prisma queries
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}
```

**Tasks (implement in this order):**
- [ ] `src/tools/get-client-context.ts`
- [ ] `src/tools/log-decision.ts`
- [ ] `src/tools/get-decision-trail.ts`
- [ ] `src/tools/flag-risk.ts`
- [ ] `src/tools/summarize-project-week.ts`
- [ ] `src/tools/detect-scope-creep.ts`
- [ ] `src/tools/index.ts` — barrel export of all 6 tool functions

**Verification:** Each tool can be called directly with `ts-node` and returns valid `ToolResponse` objects.

---

### Phase 4 — MCP Server Wiring

**Goal:** All tools registered on the MCP server and responding to protocol messages.

**Tasks:**
- [ ] Create `src/server.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClientContext } from "./tools/get-client-context.js";
import { logDecision } from "./tools/log-decision.js";
import { getDecisionTrail } from "./tools/get-decision-trail.js";
import { flagRisk } from "./tools/flag-risk.js";
import { summarizeProjectWeek } from "./tools/summarize-project-week.js";
import { detectScopeCreep } from "./tools/detect-scope-creep.js";
import {
  GetClientContextSchema,
  LogDecisionSchema,
  GetDecisionTrailSchema,
  FlagRiskSchema,
  SummarizeProjectWeekSchema,
  DetectScopeCreepSchema,
} from "./lib/validators.js";
import { zodToJsonSchema } from "zod-to-json-schema"; // install this

export function createServer(): McpServer {
  const server = new McpServer({
    name: "clientos-brain",
    version: "1.0.0",
  });

  server.tool(
    "get_client_context",
    "Returns a rich contextual brief for a client including their personality, relationship health score, active projects, open risks, and recent decisions. Use this before any client call or meeting to get up to speed instantly.",
    zodToJsonSchema(GetClientContextSchema),
    async ({ arguments: args }) => {
      const result = await getClientContext(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register remaining 5 tools following the same pattern

  return server;
}
```

- [ ] Add `npm install zod-to-json-schema` to dependencies
- [ ] Register all 6 tools in `server.ts` following the same pattern
- [ ] Create `src/index.ts`:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { prisma } from "./db/client.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  await server.connect(transport);
  console.error("ClientOS Brain MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Verification:** `mcpize dev --playground` opens and all 6 tools appear in the playground UI.

---

### Phase 5 — Tests

**Goal:** Every tool has passing unit tests.

**Test file pattern:**

```typescript
// tests/tools/[tool-name].test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toolName } from "../../src/tools/[tool-name].js";

// Mock prisma
vi.mock("../../src/db/client.js", () => ({
  prisma: {
    client: { findUnique: vi.fn(), create: vi.fn() },
    // ... mock all needed methods
  },
}));

describe("toolName", () => {
  it("returns success with valid input", async () => { ... });
  it("returns error when resource not found", async () => { ... });
  it("returns error on invalid input", async () => { ... });
});
```

**Tasks:**
- [ ] Write tests for all 6 tool files (min 3 tests each: happy path, not found, invalid input)
- [ ] Write `tests/db/queries.test.ts` with integration-style tests
- [ ] All tests pass: `npm test`

**Minimum coverage requirement:** Every tool function must have a happy path test and a not-found test.

---

### Phase 6 — MCPize Config & Deployment

**Goal:** Server deployed to MCPize cloud and accessible via URL.

**Tasks:**
- [ ] Create `mcpize.yaml`:

```yaml
name: clientos-brain
description: "Living project memory and intelligence layer for agencies and consultancies"
version: "1.0.0"
runtime: node
entrypoint: dist/index.js
build:
  command: npm run build
  install: npm install
env:
  - name: DATABASE_URL
    secret: true
    description: "Supabase PostgreSQL connection string"
```

- [ ] Run `npm run build` — ensure zero TypeScript errors
- [ ] Run `mcpize login`
- [ ] Run `mcpize secrets set DATABASE_URL <your-supabase-url>`
- [ ] Run `mcpize deploy`
- [ ] Run `mcpize status` — verify deployment is healthy
- [ ] Run `mcpize logs --follow` — confirm server started successfully

**Verification:** MCPize dashboard shows server as active. All 6 tools are listed.

---

## 7. Environment & Configuration

### Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Runtime environment | `production` or `development` |

### Supabase Setup Steps

1. Create a new Supabase project at supabase.com
2. Go to Settings → Database → Connection String (URI mode)
3. Copy the connection string and set it as `DATABASE_URL`
4. Run `npx prisma migrate deploy` to apply the schema
5. Optionally run `npm run db:seed` for sample data

### Local Development

```bash
cp .env.example .env
# Fill in DATABASE_URL with your local or Supabase dev database
npx prisma migrate dev --name init
npm run db:seed
mcpize dev --playground
```

---

## 8. API Reference

### Tool Input/Output Summary

| Tool | Key Inputs | Key Output Fields |
|---|---|---|
| `get_client_context` | `clientId`, `includeProjects` | `client`, `activeProjects[]`, `summary` |
| `log_decision` | `projectId`, `title`, `rationale`, `madeBy`, `supersedesId?` | `id`, `createdAt` |
| `get_decision_trail` | `projectId`, `limit?` | `decisions[]` with chain links |
| `flag_risk` | `projectId`, `description`, `severity`, `flaggedBy?` | `id`, `status`, `createdAt` |
| `summarize_project_week` | `projectId`, `daysBack?` | `digest` (formatted text), raw counts |
| `detect_scope_creep` | `projectId`, `markAsCreep?` | `flaggedTasks[]`, `creepScore` (0-100) |

### Example Tool Calls (for testing in Claude)

```
Use get_client_context with clientId: "clx123abc"

Use log_decision with projectId: "prj456def", title: "Switch from REST to GraphQL", rationale: "Client requested real-time updates, GraphQL subscriptions are a better fit", madeBy: "Tech Lead"

Use detect_scope_creep with projectId: "prj456def"
```

---

## 9. Testing Strategy

### Unit Tests (Vitest)
- Mock Prisma client using `vi.mock`
- Test each tool function in isolation
- Cover: happy path, not found, invalid input (Zod parse error), unexpected DB error

### Manual Integration Tests
- Run `mcpize dev --playground`
- Test each tool via the MCPize playground UI
- Verify actual DB writes via `prisma studio`

### Test Naming Convention
```
describe("[toolName]") → it("[should do X when Y]")
Example: it("should return NotFoundError when client does not exist")
```

---

## 10. Deployment via MCPize

### First-time Deploy
```bash
npm install -g mcpize
mcpize login
npm run build
mcpize deploy --yes
```

### Connecting to Claude Desktop

After deployment, MCPize provides a server URL. Add to Claude Desktop's MCP config:

```json
{
  "mcpServers": {
    "clientos-brain": {
      "url": "https://your-server.mcpize.com/mcp",
      "transport": "http"
    }
  }
}
```

### Connecting to Claude Code

```bash
claude mcp add clientos-brain --url https://your-server.mcpize.com/mcp
```

### Re-deploying After Changes
```bash
npm run build
mcpize deploy
mcpize logs --follow
```

---

## 11. Coding Rules & Conventions

The agent MUST follow these rules at all times:

### Language & Style
- All files in TypeScript. No `.js` source files allowed.
- Use `strict: true` TypeScript. No `any` types. Use `unknown` and narrow.
- All imports must use `.js` extension (even for `.ts` files) due to NodeNext module resolution.
- Use named exports everywhere. No default exports except in `index.ts` entry point.
- Use `async/await`. No raw Promise chains.

### Naming Conventions
- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database model fields: `camelCase` (Prisma handles DB mapping)

### Function Rules
- Every tool function signature: `async function toolName(rawInput: unknown): Promise<ToolResponse>`
- Never throw from a tool function — always return `{ success: false, error: "..." }`
- Every query function must handle Prisma's `P2025` (not found) error explicitly

### Comments
- No inline comments explaining obvious code
- JSDoc comments on every exported function with `@param` and `@returns`
- Add `// TODO:` comments only for genuine future work, never for current-phase work

### Import Order
1. Node built-ins
2. Third-party packages
3. Internal absolute imports
4. Internal relative imports

---

## 12. Error Handling Contracts

### Prisma Error Codes to Handle

| Code | Meaning | Action |
|---|---|---|
| `P2025` | Record not found | Throw `NotFoundError` |
| `P2002` | Unique constraint violation | Return descriptive error message |
| `P2003` | Foreign key constraint | Return descriptive error message |
| `P1001` | Can't reach database | Return `{ success: false, error: "Database unavailable" }` |

### Tool Error Response Format

```typescript
// Always return this shape on error — never throw
{
  success: false,
  error: "Human-readable explanation of what went wrong and what to check"
}
```

### Validation Errors

Zod parse errors should be caught and reformatted:

```typescript
import { ZodError } from "zod";

catch (error) {
  if (error instanceof ZodError) {
    const message = error.errors
      .map(e => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return { success: false, error: `Invalid input — ${message}` };
  }
}
```

---

## Agent Execution Checklist

Before marking the project complete, verify every item:

- [ ] Phase 0: All config files created, `tsc --noEmit` passes
- [ ] Phase 1: Prisma schema applied, seed script runs, DB has sample data
- [ ] Phase 2: All Zod schemas exist, all helper functions exist
- [ ] Phase 3: All 6 tool files exist and return `ToolResponse`
- [ ] Phase 4: `mcpize dev --playground` shows all 6 tools
- [ ] Phase 5: `npm test` passes with 0 failures
- [ ] Phase 6: `mcpize deploy` succeeds, `mcpize status` shows healthy
- [ ] README.md created with setup instructions and tool usage examples
- [ ] No `any` types in TypeScript (`npx tsc --noEmit` with strict)
- [ ] `.env` is in `.gitignore` and never committed

---

*This document was authored for the ClientOS Brain MCP Server project. It is consumed by GitHub Copilot Agent and other AI coding agents as the authoritative build specification.*
