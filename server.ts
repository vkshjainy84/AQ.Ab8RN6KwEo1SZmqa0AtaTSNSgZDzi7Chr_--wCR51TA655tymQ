import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, updateUserSettings } from "./src/db/users.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse incoming JSON body
  app.use(express.json());

  // 1. API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Fetch or register user and their settings
  app.get("/api/user/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@clickex.com`;
      
      const { user, settings } = await getOrCreateUser(uid, email);
      
      res.json({
        success: true,
        user,
        settings: {
          activeScriptIds: JSON.parse(settings.activeScriptIds),
          openedWidgetIds: JSON.parse(settings.openedWidgetIds),
          widgetCustomizations: JSON.parse(settings.widgetCustomizations),
          activeWallpaperId: settings.activeWallpaperId,
          isSystemDarkMode: settings.isSystemDarkMode,
          isPremiumUnlocked: settings.isPremiumUnlocked,
          refreshIntervalSec: settings.refreshIntervalSec,
        }
      });
    } catch (error: any) {
      console.error("Error in /api/user/sync GET:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Save/Update user settings
  app.post("/api/user/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const {
        activeScriptIds,
        openedWidgetIds,
        widgetCustomizations,
        activeWallpaperId,
        isSystemDarkMode,
        isPremiumUnlocked,
        refreshIntervalSec
      } = req.body;

      await updateUserSettings(uid, {
        activeScriptIds: JSON.stringify(activeScriptIds),
        openedWidgetIds: JSON.stringify(openedWidgetIds),
        widgetCustomizations: JSON.stringify(widgetCustomizations),
        activeWallpaperId,
        isSystemDarkMode,
        isPremiumUnlocked,
        refreshIntervalSec,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in /api/user/sync POST:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
