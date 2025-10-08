import database from "infra/database";
import migrationRunner from "node-pg-migrate";
import path from "node:path";

export default async function migrations(request, response) {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const defaultMigrationOptions = {
      dbClient: dbClient,
      dryRun: true,
      dir: path.join("infra", "migrations"),
      direction: "up",
      verbose: true,
      migrationsTable: "pgmigrations",
    };

    if (request.method === "GET") {
      const pendingMigrations = await migrationRunner(defaultMigrationOptions);

      await dbClient.end();
      return response.status(200).json(pendingMigrations);
    }

    if (request.method === "POST") {
      const migratedMigrations = await migrationRunner({
        ...defaultMigrationOptions,
        dryRun: false,
      });

      const statusCode = migratedMigrations.length > 0 ? 201 : 200;

      await dbClient.end();
      return response.status(statusCode).json(migratedMigrations);
    }

    return response.status(405).json({
      error: `Method "${request.method}" not allowed`,
    });
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await dbClient.end();
  }
}
