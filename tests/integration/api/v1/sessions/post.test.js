import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import orchestrator from "tests/orchestrator.js";
import webserver from "infra/webserver.js";
import session from "models/session.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("With incorrect `email`, but correct `password`", async () => {
      await orchestrator.createUser({
        password: "correct-password",
      });

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "incorrect@email.com",
          password: "correct-password",
        }),
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Os dados de authenticação não conferem",
        action: "Verifique se os dados enviados estão corretos",
        status_code: 401,
      });
    });

    test("With correct `email`, but incorrect `password`", async () => {
      await orchestrator.createUser({
        password: "correct-password",
      });

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "correct@email.com",
          password: "incorrect-password",
        }),
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Os dados de authenticação não conferem",
        action: "Verifique se os dados enviados estão corretos",
        status_code: 401,
      });
    });

    test("With incorrect `email` and incorrect `password`", async () => {
      await orchestrator.createUser();

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "incorrect@email.com",
          password: "incorrect-password",
        }),
      });
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Os dados de authenticação não conferem",
        action: "Verifique se os dados enviados estão corretos",
        status_code: 401,
      });
    });

    test("With correct `email` and correct `password`", async () => {
      const createdUser = await orchestrator.createUser({
        email: "correct@email.com",
        password: "correct-password",
      });
      await orchestrator.activateUser(createdUser);

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "correct@email.com",
          password: "correct-password",
        }),
      });
      const responseBody = await response.json();

      // `expires_at` é calculado na aplicação antes da persistência.
      // `created_at` é calculado depois na camada do banco de dados.
      // Por isso, o tempo real entre as duas datas pode ficar ligeiramente
      // menor do que o tempo de expiração configurado e não bater 30 dias nos
      // milissegundos caso seja calculado apenas `expires_at` - `created_at`.
      // Então a ideia é garantir que no momento `expires_at` seja maior que
      // `created_at`, e também que possa existir distância de até 5 segundos
      // entre as duas datas para cobrir o caso do banco sofrer algum load
      // inesperado nos testes.

      const expiresAt = new Date(responseBody.expires_at);
      const createdAt = new Date(responseBody.created_at);

      const actualLifetimeInMiliseconds = expiresAt - createdAt;
      const lifetimeDifferenceInMiliseconds =
        session.EXPIRATION_IN_MILISECONDS - actualLifetimeInMiliseconds;

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });
      const cacheControl = response.headers.get("Cache-Control");

      expect(response.status).toBe(201);
      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: createdUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(expiresAt >= createdAt).toBe(true);
      expect(lifetimeDifferenceInMiliseconds).toBeLessThanOrEqual(5000);
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: responseBody.token,
        maxAge: session.EXPIRATION_IN_MILISECONDS / 1000,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
      expect(cacheControl).toBe(
        "no-store, no-cache, max-age=0, must-revalidate",
      );
    });
  });
});
