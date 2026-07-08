import orchestrator from "tests/orchestrator.js";
import webserver from "infra/webserver.js";
import activation from "models/activation.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration Flow (All successful)", () => {
  let createUserResponseBody;
  let activationToken;
  let createSessionResponseBody;

  test("Create user account", async () => {
    const createUserResponse = await fetch(`${webserver.origin}/api/v1/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "RegistrationFlow",
        email: "registration.flow@email.com",
        password: "RegistrationFlowPassword",
      }),
    });
    createUserResponseBody = await createUserResponse.json();

    expect(createUserResponse.status).toBe(201);
    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      features: ["read:activation_token"],
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    activationToken = orchestrator.extractUUID(lastEmail.text);
    const activationTokenObject =
      await activation.findOneValidByToken(activationToken);

    expect(lastEmail.sender).toBe("<contato@eduardocandaten.com.br>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@email.com>");
    expect(lastEmail.subject).toBe("Ative seu cadastro no FinTab!");
    expect(lastEmail.text).toContain("RegistrationFlow");
    expect(lastEmail.text).toContain(
      `${webserver.origin}/cadastro/ativar/${activationToken}`,
    );
    expect(activationTokenObject.user_id).toContain(createUserResponseBody.id);
  });

  test("Activate account", async () => {
    const activationResponse = await fetch(
      `${webserver.origin}/api/v1/activations/${activationToken}`,
      {
        method: "PATCH",
      },
    );
    const activationResponseBody = await activationResponse.json();

    const activatedUser = await user.findOneByUsername("RegistrationFlow");

    expect(activationResponse.status).toBe(200);
    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN();
    expect(activatedUser.features).toEqual([
      "create:session",
      "read:session",
      "read:user",
      "update:user",
    ]);
  });

  test("Login", async () => {
    const createSessionResponse = await fetch(
      `${webserver.origin}/api/v1/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "registration.flow@email.com",
          password: "RegistrationFlowPassword",
        }),
      },
    );
    createSessionResponseBody = await createSessionResponse.json();

    expect(createSessionResponse.status).toBe(201);
    expect(createSessionResponseBody.user_id).toBe(createUserResponseBody.id);
  });

  test("Get user information", async () => {
    const userResponse = await fetch(`${webserver.origin}/api/v1/user`, {
      headers: {
        Cookie: `session_id=${createSessionResponseBody.token}`,
      },
    });
    const userResponseBody = await userResponse.json();

    expect(userResponse.status).toBe(200);
    expect(userResponseBody.id).toBe(createSessionResponseBody.user_id);
  });
});
