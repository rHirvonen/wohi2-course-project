const request = require("supertest");
const app = require("../app");
const { resetDb, registerAndLogin } = require("./helpers");

beforeEach(resetDb);

describe("post tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown post", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .get("/api/questions/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("returns 400 for invalid post body", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "" });

    expect(res.status).toBe(400);
  });
});