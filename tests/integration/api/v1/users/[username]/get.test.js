import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With exact case match", async () => {
      const createdUser = await orchestrator.createUser({
        username: "username",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/username",
      );
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "username",
        email: createdUser.email,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("With exact mismatch", async () => {
      const createdUser = await orchestrator.createUser({
        username: "username2",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/UserName2",
      );
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "username2",
        email: createdUser.email,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("With nonexisting username", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/nonexistent",
      );
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username não foi encontrado",
        action: "Verifique se o username está digitado corretamente",
        status_code: 404,
      });
    });
  });
});
