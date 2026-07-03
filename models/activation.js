import database from "infra/database.js";
import email from "infra/email.js";
import webserver from "infra/webserver.js";
import user from "models/user.js";
import { NotFoundError } from "infra/errors.js";

const EXPIRATION_IN_MILISECONDS = 60 * 15 * 1000; // 15 minutes

async function findOneValidByToken(activationToken) {
  const activationTokenObjectFound = await runSelectQuery(activationToken);
  return activationTokenObjectFound;

  async function runSelectQuery(activationToken) {
    const result = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT
          1
        ;`,
      values: [activationToken],
    });

    if (result.rowCount === 0) {
      throw new NotFoundError({
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou",
        action: "Faça um novo cadastro",
      });
    }

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

async function markTokenAsUsed(activationToken) {
  const usedActivationTokenObject = await runUpdateQuery(activationToken);
  return usedActivationTokenObject;

  async function runUpdateQuery(activationToken) {
    const result = await database.query({
      text: `
        UPDATE
          user_activation_tokens
        SET
          used_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [activationToken],
    });

    return result.rows[0];
  }
}

async function activateUserByUserId(userId) {
  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
  ]);
  return activatedUser;
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
  findOneValidByToken,
  create,
  markTokenAsUsed,
  activateUserByUserId,
  sendEmailToUser,
};

export default activation;
