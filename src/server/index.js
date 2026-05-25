import { createServer } from "./app.js";
import { createPersistentComoteState } from "./state.js";

const port = Number(process.env.PORT ?? 16208);
const host = "127.0.0.1";

const state = await createPersistentComoteState({
  ...(process.env.COMOTE_STATE_PATH ? { filePath: process.env.COMOTE_STATE_PATH } : {}),
});
const server = createServer(state);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Comote daemon: port ${port} is already in use.\n` +
        `Another Comote instance is probably already running at http://${host}:${port}.\n` +
        `Open that one, or set PORT to a free port and retry.`,
    );
    process.exit(1);
  }
  console.error(`Comote daemon failed to start: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Comote settings app running at http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  // Force-exit if connections keep the server alive past the grace window.
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
