import { createApp, startServer } from "./app";

export { createApp, startServer };

// If this module is executed directly (node ./src/index.ts or ts-node), start the server.
// This prevents the server from starting when the module is imported by tests.
if (require.main === module) {
  startServer().catch((err: any) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
