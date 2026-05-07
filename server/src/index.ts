import express, { type Request, type Response, type NextFunction } from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import clusterRoutes from "./routes/clusters.js";
import proxyRoutes from "./routes/proxy.js";
import { initClusters } from "./config.js";

const app = express();
const PORT = 3001;

app.use(helmet());
app.use(bodyParser.json());

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENABLE_ADMIN = process.env.ENABLE_ADMIN === 'true';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// ENCRYPTION_KEY is always required
if (!ENCRYPTION_KEY) {
  console.error("\n====================================================================");
  console.error("FATAL ERROR: Missing required environment variable.");
  console.error("ENCRYPTION_KEY must be provided!");
  console.error("====================================================================\n");
  process.exit(1);
}

// If admin mode is enabled, JWT_SECRET and ADMIN_PASSWORD are also required
if (ENABLE_ADMIN && (!JWT_SECRET || !ADMIN_PASSWORD)) {
  console.error("\n====================================================================");
  console.error("FATAL ERROR: ENABLE_ADMIN=true but admin credentials are missing.");
  console.error("JWT_SECRET and ADMIN_PASSWORD must also be provided!");
  console.error("====================================================================\n");
  process.exit(1);
}

// Expose configuration to the frontend
app.get("/api/config", (_req, res) => {
  res.json({ adminEnabled: ENABLE_ADMIN });
});

// Login endpoint – only active when ENABLE_ADMIN=true
if (ENABLE_ADMIN) {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.post("/api/login", loginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: "admin" }, JWT_SECRET as string, { expiresIn: "2h" });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  console.log("[init] Admin mode is ENABLED.");
} else {
  console.log("[init] Admin mode is DISABLED (read-only).");
}

app.use("/api/clusters", clusterRoutes);
app.use("/api/proxy", proxyRoutes);

// Serve static client files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Catch-all for React Router
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    next();
  }
});

initClusters();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
