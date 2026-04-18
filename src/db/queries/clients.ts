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
 * Fetches a client by ID.
 * @param id The client ID.
 * @returns The client record.
 */
export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    throw new NotFoundError("Client", id);
  }

  return client;
}

/**
 * Lists all clients.
 * @returns Array of client records.
 */
export async function listClients() {
  return prisma.client.findMany({ orderBy: { createdAt: "desc" } });
}

/**
 * Creates a client record.
 * @param data The client creation payload.
 * @returns The created client.
 */
export async function createClient(data: {
  name: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  personality?: string;
  relationshipScore?: number;
  notes?: string;
}) {
  try {
    return await prisma.client.create({ data });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new NotFoundError("Related resource", "unknown");
    }
    throw error;
  }
}
