import { startServer } from "./app";

startServer()
  .then(() => {
    // server started
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
