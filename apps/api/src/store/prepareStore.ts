import { randomUUID } from "node:crypto";
import type { CopyTradeIntent } from "@bloom-ai/types";

export interface PrepareSession {
  id: string;
  userAddress: string;
  intent: CopyTradeIntent;
  accountID: number;
  nonce: number;
  domainName: "spot" | "futures";
  actionType: string;
  params: { accountID: number; orders: Record<string, unknown>[] };
  payloadHash: string;
  preview: {
    symbol: string;
    funds: string;
    clOrdID: string;
    price: number;
    allocationUSD: number;
  }[];
  skipped: string[];
  intentId: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const sessions = new Map<string, PrepareSession>();

function prune() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(id);
  }
}

export const prepareStore = {
  create(
    data: Omit<PrepareSession, "id" | "expiresAt"> & { expiresAt?: number },
  ): PrepareSession {
    prune();
    const session: PrepareSession = {
      ...data,
      id: randomUUID(),
      expiresAt: data.expiresAt ?? Date.now() + TTL_MS,
    };
    sessions.set(session.id, session);
    return session;
  },

  take(id: string): PrepareSession | null {
    prune();
    const s = sessions.get(id);
    if (!s) return null;
    sessions.delete(id);
    if (s.expiresAt <= Date.now()) return null;
    return s;
  },

  peek(id: string): PrepareSession | null {
    prune();
    const s = sessions.get(id);
    if (!s || s.expiresAt <= Date.now()) return null;
    return s;
  },
};
