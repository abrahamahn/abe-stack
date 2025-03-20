import { ServerEnvironment } from "../../config/environment";

export default function QueueServer(
  environment: ServerEnvironment,
): typeof environment.queue {
  // Queue server implementation
  const { queue } = environment;
  // Queue is automatically initialized in its constructor
  return queue;
}
