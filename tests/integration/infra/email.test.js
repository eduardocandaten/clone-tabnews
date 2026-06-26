import email from "infra/email.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.js", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmails();

    await email.send({
      from: "Eduardo <eduardocandaten@icloud.com>",
      to: "eduardocandaten10@gmail.com",
      subject: "First subject test",
      text: "First body test",
    });
    await email.send({
      from: "Eduardo <eduardocandaten@icloud.com>",
      to: "eduardocandaten10@gmail.com",
      subject: "Last subject test",
      text: "Last body test",
    });

    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toEqual("<eduardocandaten@icloud.com>");
    expect(lastEmail.recipients[0]).toEqual("<eduardocandaten10@gmail.com>");
    expect(lastEmail.subject).toEqual("Last subject test");
    expect(lastEmail.text).toEqual("Last body test\n");
  });
});
