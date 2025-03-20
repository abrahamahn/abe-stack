import { QueueDatabase } from "@core/queue/QueueDatabase";
import { DatabaseConnectionManager } from "@database/config";
import { env as config } from "@server/config/environment";

async function reset(): Promise<void> {
  await DatabaseConnectionManager.reset();

  const queue = new QueueDatabase(config.QUEUE_PATH);
  await queue.reset();
}

if (require.main === module) {
  void (async () => {
    try {
      await reset();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}
