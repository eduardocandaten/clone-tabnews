import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import migrator from "models/migrator";

const router = createRouter();

router.get(getHandler).post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const pendingMigrations = await migrator.listPendingMigrations();
  return response.status(200).json(pendingMigrations);
}

async function postHandler(request, response) {
  const pendingMigrations = await migrator.runPendingMigrations();
  const statusCode = pendingMigrations.length > 0 ? 201 : 200;
  return response.status(statusCode).json(pendingMigrations);
}
