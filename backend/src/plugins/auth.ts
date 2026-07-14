import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export interface JwtPayload {
  sub: string;
  email: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// @fastify/jwt augments FastifyRequest.user itself with FastifyJWT['user'] — declare that shape
// here as `{ id, email }` (ARCHITECTURE §4.1: "the authenticate hook sets request.user = { id, email }").
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: { id: string; email: string };
  }
}

/** @fastify/jwt registration + the `authenticate` onRequest decorator (ARCHITECTURE §7 plugins/auth.ts). */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<JwtPayload>();
      request.user = { id: payload.sub, email: payload.email };
    } catch {
      throw new AppError("UNAUTHORIZED", "Missing or invalid authentication token");
    }
  });
}
