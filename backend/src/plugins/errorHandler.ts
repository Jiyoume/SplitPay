import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

/**
 * Global error handler (ARCHITECTURE §8.3). Every error — AppError, zod validation error,
 * Fastify's own validation error, or an unexpected throw — is rendered as the uniform
 * `{ error: { code, message, details? } }` envelope.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      reply.status(error.status).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues,
        },
      });
      return;
    }

    // Fastify's own request validation errors carry a `validation` array.
    const fastifyErr = error as { validation?: unknown; statusCode?: number; message?: string };
    if (fastifyErr && fastifyErr.validation) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: fastifyErr.validation,
        },
      });
      return;
    }

    request.log.error({ err: error }, "unhandled error");
    reply.status(500).send({
      error: {
        code: "INTERNAL",
        message: "Something went wrong",
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
      },
    });
  });
}
