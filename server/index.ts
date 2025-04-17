import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { seedDatabase } from "./seed";
import { registerRoutes } from "./routes";

// Simple logging utility (replace with your actual log function if needed)
function log(message: string) {
  console.log(message);
}

const app = express();

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Serve static files
const staticPath = process.env.STATIC_PATH || path.resolve(__dirname, "../public");
if (!staticPath) {
  log("Error: Static path is undefined. Please set STATIC_PATH environment variable.");
  process.exit(1);
}
log(`Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

(async () => {
  // Seed the database with initial data if needed
  try {
    await seedDatabase();
  } catch (error) {
    console.error("Error seeding database:", error);
  }

  // Register routes
  const server = await registerRoutes(app);

  // Start the server
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server running on port ${port}`);
  });
})();