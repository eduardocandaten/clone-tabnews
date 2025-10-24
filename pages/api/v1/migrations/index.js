import { createRouter } from "next-connect";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import controller from "infra/controller.js";
import database from "infra/database.js";

const router = createRouter();

router.get(getHandler).post(postHandler);

export default router.handler(controller.errorHandlers);

let dbClient;
let defaultMigrationOptions;

async function startClient() {
  dbClient = await database.getNewClient();

  defaultMigrationOptions = {
    dbClient: dbClient,
    dryRun: true,
    dir: resolve("infra", "migrations"),
    direction: "up",
    verbose: true,
    migrationsTable: "pgmigrations",
  };
}

async function getHandler(request, response) {
  await startClient();
  const pendingMigrations = await migrationRunner(defaultMigrationOptions);

  await dbClient?.end();
  return response.status(200).json(pendingMigrations);
}

async function postHandler(request, response) {
  await startClient();

  const migratedMigrations = await migrationRunner({
    ...defaultMigrationOptions,
    dryRun: false,
  });

  const statusCode = migratedMigrations.length > 0 ? 201 : 200;

  await dbClient?.end();
  return response.status(statusCode).json(migratedMigrations);
}
