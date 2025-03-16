/*

npm run reset
./node_modules/.bin/tsx src/tools/reset.ts

*/

import { DatabaseConnectionManager } from "../server/config/database"
import { QueueDatabase } from "../server/services/QueueDatabase"
import { config } from "../server/services/ServerConfig"

async function reset() {
	await DatabaseConnectionManager.reset()

	const queue = new QueueDatabase(config.queuePath)
	await queue.reset()
}

if (require.main === module) {
	void (async () => {
		try {
			await reset()
		} catch (error) {
			console.error(error)
			process.exit(1)
		}
	})()
}
