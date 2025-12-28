import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

import { createFastifyServer } from "../src/fastify/server";

let app: Awaited<ReturnType<typeof createFastifyServer>>["app"];

beforeAll(async () => {
  const built = await createFastifyServer();
  app = built.app;
});

afterAll(async () => {
  await app.close();
});

describe("Fastify adapter basic endpoints", () => {
  it("responds on /api", async () => {
    const res = await request(app.server).get("/api");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("health returns status", async () => {
    const res = await request(app.server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
  });
});
