import type { FastifyInstance } from "fastify";
import { loginBodySchema, registerBodySchema } from "./auth.schemas.js";
import { loginUser, registerUser } from "./auth.service.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    const { user, wallet } = await registerUser(body);
    const token = app.jwt.sign({ sub: user.id, email: user.email });
    reply.status(201).send({ user, wallet, token });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const { user } = await loginUser(body);
    const token = app.jwt.sign({ sub: user.id, email: user.email });
    reply.status(200).send({ user, token });
  });
}
