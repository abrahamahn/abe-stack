import { ServerEnvironment } from './services/ServerEnvironment';

export default function QueueServer(environment: ServerEnvironment) {
  // Queue server implementation
  const { queue } = environment;
  // Queue is automatically initialized in its constructor
  return queue;
}