import type { WSEvent } from "@bloom-ai/types";

/** WebSocket broadcast manager — sends events to all connected clients */
class WSManager {
  private clients: Set<{ send: (data: string) => void; readyState: number }> =
    new Set();

  addClient(socket: { send: (data: string) => void; readyState: number }) {
    this.clients.add(socket);
    console.log(`[WS] Client connected. Total: ${this.clients.size}`);
  }

  removeClient(socket: { send: (data: string) => void; readyState: number }) {
    this.clients.delete(socket);
    console.log(`[WS] Client disconnected. Total: ${this.clients.size}`);
  }

  broadcast(event: WSEvent) {
    const payload = JSON.stringify(event);
    let removed = 0;
    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) {
        try {
          client.send(payload);
        } catch {
          this.clients.delete(client);
          removed++;
        }
      } else {
        this.clients.delete(client);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[WS] Removed ${removed} dead connections`);
    }
  }
}

export const wsManager = new WSManager();
