import { createServer as createHttpServer, type IncomingMessage } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { prisma } from "./db/client.js";
import { createServer as createMcpServer } from "./server.js";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body.length > 0 ? (JSON.parse(body) as unknown) : undefined;
}

async function handleMcpRequest(req: IncomingMessage, res: import("node:http").ServerResponse) {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
    await transport.handleRequest(req, res, parsedBody);
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
}

async function main() {
  const port = Number(process.env.PORT ?? 8080);
  const httpServer = createHttpServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end("Bad request");
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    try {
      await handleMcpRequest(req, res);
    } catch (error) {
      console.error("Request handling error:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
      }
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        }),
      );
    }
  });

  httpServer.listen(port, () => {
    console.error(`ClientOS Brain MCP Server running on port ${port}`);
  });

  process.on("SIGINT", async () => {
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
