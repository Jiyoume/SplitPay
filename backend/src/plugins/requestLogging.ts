import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { REDACT_PATHS } from "../utils/logger.js";

/** Pino logger options for the Fastify constructor (ARCHITECTURE §8.1). */
export function loggerOptions() {
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
  };
}

/** One structured log line per request on completion: method, path, status, ms, userId if authed. */
export function registerRequestLogging(app: FastifyInstance): void {
  app.addHook("onResponse", async (request, reply) => {
    const userId = request.user?.id;
    request.log.info(
      {
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
        ...(userId ? { userId } : {}),
      },
      "request completed"
    );
  });
}
