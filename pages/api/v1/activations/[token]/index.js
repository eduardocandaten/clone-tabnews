import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation.js";
import authorization from "models/authorization.js";

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .patch(controller.canRequest("read:activation_token"), patchHandler)
  .handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const userTryingToPatch = request.context.user;
  const token = request.query.token;

  const validActivationTokenObject =
    await activation.findOneValidByToken(token);

  await activation.activateUserByUserId(validActivationTokenObject.user_id);

  const activationTokenObjectUsed = await activation.markTokenAsUsed(
    validActivationTokenObject.id,
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    "read:activation_token",
    activationTokenObjectUsed,
  );

  return response.status(200).json(secureOutputValues);
}
