import database from "infra/database";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
});

test("Method not allowed to api/v1/migrations should return 405", async () => {
  const methodsNotAlloweds = ["DELETE", "PUT", "PATCH"];

  for (const method of methodsNotAlloweds) {
    const response = await fetch("http://localhost:3000/api/v1/migrations", {
      method,
    });
    const responseBody = await response.json();

    expect(response.status).toBe(405);
    expect(responseBody).toHaveProperty("error");
  }
});
