const request = require("supertest");
const app = require("../app");
const prisma = require("../lib/prisma");

describe("Auth API", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
  });

  it("registers a user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "password123",
      name: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
  });

  it("logs in user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "test@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});