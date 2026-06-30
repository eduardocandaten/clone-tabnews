import database from "infra/database.js";
import email from "infra/email.js";
import webserver from "infra/webserver";

const EXPIRATION_IN_MILISECONDS = 60 * 15 * 1000; // 15 minutes

async function findOneByUserId(userId) {
  const activationTokenObject = await runSelectQuery(userId);
  return activationTokenObject;

  async function runSelectQuery(userId) {
    const result = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          user_id = $1
        LIMIT
          1
      ;`,
      values: [userId],
    });

    return result.rows[0];
  }
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILISECONDS);

  const newTokenObject = await runInsertQuery(userId, expiresAt);
  return newTokenObject;

  async function runInsertQuery(userId, expiresAt) {
    const result = await database.query({
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING
          *
      ;`,
      values: [userId, expiresAt],
    });

    return result.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "FinTab <contato@fintab.com.br>",
    to: user.email,
    subject: "Ative seu cadastro no FinTab!",
    text: `${user.username}, clique no link abaixo para ativar seu cadastro no FinTab!

${webserver.origin}/cadastro/ativar/${activationToken}

Atenciosamente,
Equipe FinTab`,
  });
}

const activation = {
  findOneByUserId,
  create,
  sendEmailToUser,
};

export default activation;
