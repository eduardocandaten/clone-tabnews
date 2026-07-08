import orchestrator from "tests/orchestrator.js";
import webserver from "infra/webserver.js";
import activation from "models/activation.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH api/v1/activations/[token]", () => {
  describe("Anonymous user", () => {
    test("With nonexistent token", async () => {
      const nonexistentToken = "cf1ad671-cbf9-4cdf-b364-c3415c352336";

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${nonexistentToken}`,
        {
          method: "PATCH",
        },
      );
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou",
        action: "Faça um novo cadastro",
        status_code: 404,
      });
    });

    test("With expired token", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - activation.EXPIRATION_IN_MILISECONDS),
      });

      const createdUser = await orchestrator.createUser();
      const tokenObject = await orchestrator.createToken(createdUser.id);

      jest.useRealTimers();

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
        },
      );
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou",
        action: "Faça um novo cadastro",
        status_code: 404,
      });
    });

    test("With used token", async () => {
      const createdUser = await orchestrator.createUser();
      const tokenObject = await orchestrator.createToken(createdUser.id);

      const response1 = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
        },
      );
      const response2 = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
        },
      );
      const response2Body = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(404);
      expect(response2Body).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou",
        action: "Faça um novo cadastro",
        status_code: 404,
      });
    });

    test("With valid token", async () => {
      const createdUser = await orchestrator.createUser();
      const tokenObject = await orchestrator.createToken(createdUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
        },
      );
      const responseBody = await response.json();

      const expiresAt = new Date(responseBody.expires_at);
      const createdAt = new Date(responseBody.created_at);

      expiresAt.setMilliseconds(0);
      createdAt.setMilliseconds(0);

      const activatedUser = await user.findOneById(responseBody.user_id);

      expect(response.status).toBe(200);
      expect(responseBody).toEqual({
        id: responseBody.id,
        used_at: responseBody.used_at,
        user_id: createdUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(Date.parse(responseBody.used_at)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(expiresAt - createdAt).toBe(activation.EXPIRATION_IN_MILISECONDS);
      expect(activatedUser.features).toEqual([
        "create:session",
        "read:session",
        "read:user",
        "update:user",
      ]);
    });

    test("With activated user", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser.id);
      const tokenObject = await orchestrator.createToken(activatedUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
        },
      );
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não pode mais utilizar tokens de ativação",
        action: "Entre em contato com o suporte",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("Retreiving the endpoint", async () => {
      const createdUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);
      const tokenObject = await orchestrator.createToken(createdUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      const responseBody = await response.json();

      const expiresAt = new Date(responseBody.expires_at);
      const createdAt = new Date(responseBody.created_at);

      expiresAt.setMilliseconds(0);
      createdAt.setMilliseconds(0);

      expect(response.status).toBe(200);
      expect(responseBody).toEqual({
        id: responseBody.id,
        used_at: responseBody.used_at,
        user_id: createdUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(Date.parse(responseBody.used_at)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(expiresAt - createdAt).toBe(activation.EXPIRATION_IN_MILISECONDS);
    });

    test("With activated user", async () => {
      const createdUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);
      const activatedUser = await orchestrator.activateUser(createdUser.id);
      const tokenObject = await orchestrator.createToken(activatedUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${tokenObject.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se o seu usuário possui a feature "read:activation_token"',
        status_code: 403,
      });
    });
  });
});
