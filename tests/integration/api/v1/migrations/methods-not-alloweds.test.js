import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
});

describe("DELETE, PUT and PATCH api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Running pending migrations", async () => {
      const methodsNotAlloweds = ["DELETE", "PUT", "PATCH"];

      for (const method of methodsNotAlloweds) {
        const response = await fetch(
          "http://localhost:3000/api/v1/migrations",
          {
            method,
          },
        );
        const responseBody = await response.json();

        expect(response.status).toBe(405);
        expect(responseBody).toEqual({
          name: "MethodNotAllowedError",
          message: "Método não permitido para este endpoint",
          action:
            "Verifique se o método HTTP enviado é válido para este endpoint",
          status_code: 405,
        });
      }
    });
  });
});
