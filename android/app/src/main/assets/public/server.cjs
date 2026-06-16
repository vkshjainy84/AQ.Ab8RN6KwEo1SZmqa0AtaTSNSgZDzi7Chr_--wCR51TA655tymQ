var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/lib/firebase-admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "expanded-galaxy-8jk7s",
  appId: "1:1013740651232:web:bbc6e3e2dcd4dc065a0685",
  apiKey: "AIzaSyBWMUAqc9aVyzG_uHsfCd2HBN1I6vPZb2Q",
  authDomain: "expanded-galaxy-8jk7s.firebaseapp.com",
  storageBucket: "expanded-galaxy-8jk7s.firebasestorage.app",
  messagingSenderId: "1013740651232",
  measurementId: ""
};

// src/lib/firebase-admin.ts
if (!(0, import_app.getApps)().length) {
  (0, import_app.initializeApp)({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = (0, import_auth.getAuth)();

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  userSettings: () => userSettings,
  users: () => users,
  usersRelations: () => usersRelations
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_orm = require("drizzle-orm");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  uid: (0, import_pg_core.text)("uid").notNull().unique(),
  // Firebase Auth UID
  email: (0, import_pg_core.text)("email").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var userSettings = (0, import_pg_core.pgTable)("user_settings", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  activeScriptIds: (0, import_pg_core.text)("active_script_ids").notNull(),
  // JSON array of active scripts
  openedWidgetIds: (0, import_pg_core.text)("opened_widget_ids").notNull(),
  // JSON array of open widgets
  widgetCustomizations: (0, import_pg_core.text)("widget_customizations").notNull(),
  // JSON serialized object
  activeWallpaperId: (0, import_pg_core.text)("active_wallpaper_id").notNull(),
  isSystemDarkMode: (0, import_pg_core.boolean)("is_system_dark_mode").notNull().default(true),
  isPremiumUnlocked: (0, import_pg_core.boolean)("is_premium_unlocked").notNull().default(false),
  refreshIntervalSec: (0, import_pg_core.integer)("refresh_interval_sec").notNull().default(25),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var usersRelations = (0, import_drizzle_orm.relations)(users, ({ one }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId]
  })
}));

// src/db/index.ts
var { Pool } = import_pg.default;
var createPool = () => {
  const host = process.env.SQL_HOST;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;
  if (!host || !user || !password || !database) {
    console.warn("SQL environment variables are not fully configured yet. Running with offline fallback.");
  }
  return new Pool({
    host: host || "localhost",
    user: user || "postgres",
    password: password || "postgres",
    database: database || "postgres",
    connectionTimeoutMillis: 15e3
  });
};
var pool = createPool();
pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// src/db/users.ts
var import_drizzle_orm2 = require("drizzle-orm");
async function getOrCreateUser(uid, email) {
  try {
    const result = await db.insert(users).values({
      uid,
      email
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email
      }
    }).returning();
    const user = result[0];
    if (!user) {
      throw new Error("Failed to register or retrieve user record.");
    }
    let settings = await db.select().from(userSettings).where((0, import_drizzle_orm2.eq)(userSettings.userId, user.id)).limit(1);
    if (settings.length === 0) {
      const defaultSettings = {
        userId: user.id,
        activeScriptIds: JSON.stringify(["cry-btc", "us-aapl", "in-reliance", "cmd-gold", "forex-usdinr"]),
        openedWidgetIds: JSON.stringify(["cry-btc", "in-reliance"]),
        widgetCustomizations: JSON.stringify({
          "cry-btc": { size: "medium", isDark: true, theme: "glassmorphism" },
          "in-reliance": { size: "large", isDark: true, theme: "glassmorphism" },
          "us-aapl": { size: "small", isDark: true, theme: "wallpaper-match" }
        }),
        activeWallpaperId: "sunset",
        isSystemDarkMode: true,
        isPremiumUnlocked: false,
        refreshIntervalSec: 25
      };
      const settingsResult = await db.insert(userSettings).values(defaultSettings).onConflictDoNothing().returning();
      if (settingsResult.length > 0) {
        settings = settingsResult;
      } else {
        settings = await db.select().from(userSettings).where((0, import_drizzle_orm2.eq)(userSettings.userId, user.id)).limit(1);
      }
    }
    return { user, settings: settings[0] };
  } catch (error) {
    console.error("Database operation failed in getOrCreateUser:", error);
    throw new Error("Unable to retrieve user information from the database.", { cause: error });
  }
}
async function updateUserSettings(uid, data) {
  try {
    const userResult = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.uid, uid)).limit(1);
    if (userResult.length === 0) {
      throw new Error("User record not found in database.");
    }
    const user = userResult[0];
    await db.update(userSettings).set({
      activeScriptIds: data.activeScriptIds,
      openedWidgetIds: data.openedWidgetIds,
      widgetCustomizations: data.widgetCustomizations,
      activeWallpaperId: data.activeWallpaperId,
      isSystemDarkMode: data.isSystemDarkMode,
      isPremiumUnlocked: data.isPremiumUnlocked,
      refreshIntervalSec: data.refreshIntervalSec,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm2.eq)(userSettings.userId, user.id));
  } catch (error) {
    console.error("Database operation failed in updateUserSettings:", error);
    throw new Error("Unable to update settings in the database.", { cause: error });
  }
}

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/user/sync", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
      const email = req.user.email || `${uid}@clickex.com`;
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
          refreshIntervalSec: settings.refreshIntervalSec
        }
      });
    } catch (error) {
      console.error("Error in /api/user/sync GET:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/user/sync", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
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
        refreshIntervalSec
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/user/sync POST:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
