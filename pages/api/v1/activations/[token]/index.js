import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.patch(controller.canRequest("read:activation_token"), patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const token = request.query.token;

  const validActivationTokenObject =
    await activation.findOneValidByToken(token);

  await activation.activateUserByUserId(validActivationTokenObject.user_id);

  const activationTokenObjectUsed = await activation.markTokenAsUsed(
    validActivationTokenObject.id,
  );

  return response.status(200).json(activationTokenObjectUsed);
}
