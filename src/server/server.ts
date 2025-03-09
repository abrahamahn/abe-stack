// abe-stack\src\server\server.ts
import injectLiveReload from "connect-livereload"
import express from "express"
import helmet from "helmet"
import http from "http"
import livereload from "livereload"
import morgan from "morgan"
import { ApiServer } from "./ApiServer"
import { FileServer } from "./FileServer"
import { PubsubServer } from "./PubsubServer"
import { QueueServer } from "./QueueServer"
import { path } from "./helpers/path"
import { Database } from "./services/Database"
import { QueueDatabase } from "./services/QueueDatabase"
import { config } from "./services/ServerConfig"
import { ServerEnvironment } from "./services/ServerEnvironment"

async function startServer() {
  const app = express()

  if (config.production) {
    // Basic server hardening settings including CORS
    app.use(helmet())
  }

  // Request logging.
  app.use(morgan('dev', {
    stream: {
      write: (message) => console.log(`express: ${message.trim()}`)
    }
  }))

  if (!config.production) {
    // Injects into the html file so the browser reloads when files change.
    app.use(injectLiveReload())

    // Watch for changed to send a message over websocket.
    livereload.createServer().watch(path("build"))
  }

  // Initialize databases
  const db = new Database(config.dbPath);
  await db.initialize(); // Add this line to initialize the connection
  const queue = new QueueDatabase(config.queuePath);

  const server = http.createServer(app)
  const pubsub = PubsubServer({ config, db }, server)

  // Setup the server environment.
  const environment: ServerEnvironment = { config, db, queue, pubsub }

  FileServer(environment, app)
  QueueServer(environment)
  ApiServer(environment, app)

  server.listen(config.port, () => console.log(`Listening: http://localhost:${config.port}`))
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})