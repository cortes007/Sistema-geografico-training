import { getRouteEnv } from '../../backend/src/config/env.js';
import { createRouteHandler } from '../../backend/src/infrastructure/http/routeServer.js';

const routeHandler = createRouteHandler({
  ...getRouteEnv(),
  trustProxy: true,
});

export default function handler(request, response) {
  return routeHandler(request, response);
}
