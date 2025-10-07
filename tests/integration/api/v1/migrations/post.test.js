import database from "infra/database";

beforeAll(cleanDatabase);

async function cleanDatabase() {
  database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
}

test("POST to api/v1/migrations should return 200", async () => {
  for (let i = 0; i < 2; i++) {
    const response = await fetch("http://localhost:3000/api/v1/migrations", {
      method: "POST",
    });
    const responseBody = await response.json();
    const expectedCode = responseBody.length > 0 ? 201 : 200;

    expect(response.status).toBe(expectedCode);
    expect(Array.isArray(responseBody)).toBe(true);
    if (i === 0) expect(responseBody.length).toBeGreaterThan(0);
    else expect(responseBody.length).toBe(0);
  }
});
