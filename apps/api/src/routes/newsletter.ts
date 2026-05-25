import type { FastifyInstance } from "fastify";
import { newsletterStore } from "../store/newsletter.js";
import { runJournalistCycle } from "../agents/journalist/index.js";

export async function newsletterRouter(app: FastifyInstance) {
  // GET /api/newsletters — list all newsletters
  app.get("/", async () => {
    return { data: newsletterStore.getAll() };
  });

  // GET /api/newsletters/latest — get most recent
  app.get("/latest", async () => {
    const latest = newsletterStore.getLatest();
    if (!latest) return { data: null };
    return { data: latest };
  });

  // GET /api/newsletters/:id
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const newsletter = newsletterStore.getById(req.params.id);
    if (!newsletter) return reply.code(404).send({ error: "Not found" });
    return { data: newsletter };
  });

  // POST /api/newsletters/trigger — manually trigger a journalist cycle
  app.post("/trigger", async () => {
    const newsletter = await runJournalistCycle();
    return { data: newsletter };
  });
}
