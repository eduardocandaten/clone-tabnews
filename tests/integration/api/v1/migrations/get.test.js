import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Retrieving pending migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations");
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        message: "Você não possui permissão para executar essa ação",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("Retrieving pending migrations", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser.id);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        message: "Você não possui permissão para executar essa ação",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Privileged user", () => {
    test("With `read:migration`", async () => {
      const privilegedUser = await orchestrator.createUser();
      const activatedPrivileged = await orchestrator.activateUser(
        privilegedUser.id,
      );

      await orchestrator.addFeaturesToUser(privilegedUser, ["read:migration"]);

      const privilegedUserSession = await orchestrator.createSession(
        activatedPrivileged.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: {
          Cookie: `session_id=${privilegedUserSession.token}`,
        },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(responseBody)).toBe(true);
    });
  });
});
