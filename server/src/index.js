import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { startScheduler } from "./services/reminderJob.js";

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

await connectDB();
startScheduler();

const port = process.env.PORT || 5000;
createApp().listen(port, () => console.log(`API listening on port ${port}`));
