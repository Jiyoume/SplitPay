import Fastify, { type FastifyInstance } from "fastify";
import { env } from "./config/env.js";
import { migrate } from "./db/migrate.js";
import { registerAuth } from "./plugins/auth.js";
import { registerErrorHandler } from "./plugins/errorHandler.js";
import { loggerOptions, registerRequestLogging } from "./plugins/requestLogging.js";

import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerUserRoutes } from "./modules/users/users.routes.js";
import { registerGroupRoutes } from "./modules/groups/groups.routes.js";
import { registerExpenseRoutes } from "./modules/expenses/expenses.routes.js";
import { registerBalanceRoutes } from "./modules/balances/balances.routes.js";
import { registerSettlementRoutes } from "./modules/settlements/settlements.routes.js";
import { registerActivityRoutes } from "./modules/activity/activity.routes.js";

/** Builds and returns a fully-configured Fastify instance (not yet listening). */
export async function buildApp(): Promise<FastifyInstance> {
  await migrate();

  const app = Fastify({ logger: loggerOptions() });

  // Minimal manual CORS (no @fastify/cors dependency — not in the locked dependency list;
  // CORS_ORIGIN is still honored per §6 config).
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", env.CORS_ORIGIN);
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (request.method === "OPTIONS") {
      reply.status(204).send();
    }
  });

  registerErrorHandler(app);
  registerRequestLogging(app);
  await registerAuth(app);

  app.get("/health", async () => ({
    status: "ok",
    network: env.STELLAR_NETWORK,
    time: new Date().toISOString(),
  }));

  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerGroupRoutes(app);
  await registerExpenseRoutes(app);
  await registerBalanceRoutes(app);
  await registerSettlementRoutes(app);
  await registerActivityRoutes(app);

  return app;
}
