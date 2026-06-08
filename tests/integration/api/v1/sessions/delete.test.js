import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import orchestrator from "tests/orchestrator.js";
import session from "models/session.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE api/v1/sessions", () => {
  describe("Default user", () => {
    test("With nonexistent session", async () => {
      const nonexistentToken =
        "8edbb9751ebb00031e875d2c63c7964123cf98adc74d88fbe2767cb5e2e27a1f7e6e327e259b0ae8ffb68712a29ec261";

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        status_code: 401,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILISECONDS),
      });

      const createdUser = await orchestrator.createUser({
        username: "UserWithExpiredSession",
      });
      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        status_code: 401,
      });
    });

    test("With valid session", async () => {
      const createdUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      const responseBody = await response.json();

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      const doubleCheckResponse = await fetch(
        "http://localhost:3000/api/v1/user",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      const doubleCheckResponseBody = await doubleCheckResponse.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.user_id,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        expires_at: responseBody.expires_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(
        responseBody.expires_at < sessionObject.expires_at.toISOString(),
      ).toBe(true);
      expect(
        responseBody.updated_at > sessionObject.updated_at.toISOString(),
      ).toBe(true);
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
      expect(doubleCheckResponse.status).toBe(401);
      expect(doubleCheckResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        status_code: 401,
      });
    });
  });
});
