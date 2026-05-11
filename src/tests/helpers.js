const request = require("supertest");
const app = require("../app");
const prisma = require("../lib/prisma");

async function resetDb() {
  
  await prisma.attempt.deleteMany().catch(() => {});
  await prisma.post.deleteMany().catch(() => {});
  await prisma.keyword.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
}

async function registerAndLogin(email = "a@test.io", name = "A") {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "pw12345", name });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "pw12345" });

  return res.body.token;
}

async function createPost(token, overrides = {}) {
  const res = await request(app)
    .post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      question: "T",
      answer: "C",
      date: "2026-01-01",
      ...overrides,
    });

  return res.body;
}

module.exports = {
  resetDb,
  registerAndLogin,
  createPost,
  request,
  app,
  prisma,
};