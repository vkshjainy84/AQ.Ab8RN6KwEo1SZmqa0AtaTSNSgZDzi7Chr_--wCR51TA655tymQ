import { db } from './index.ts';
import { users, userSettings } from './schema.ts';
import { eq } from 'drizzle-orm';

export interface UserStateData {
  activeScriptIds: string;
  openedWidgetIds: string;
  widgetCustomizations: string;
  activeWallpaperId: string;
  isSystemDarkMode: boolean;
  isPremiumUnlocked: boolean;
  refreshIntervalSec: number;
}

export async function getOrCreateUser(uid: string, email: string) {
  try {
    // 1. Get or register user
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    const user = result[0];
    if (!user) {
      throw new Error("Failed to register or retrieve user record.");
    }

    // 2. Fetch settings or insert default ones
    let settings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
    
    if (settings.length === 0) {
      const defaultSettings = {
        userId: user.id,
        activeScriptIds: JSON.stringify(['cry-btc', 'us-aapl', 'in-reliance', 'cmd-gold', 'forex-usdinr']),
        openedWidgetIds: JSON.stringify(['cry-btc', 'in-reliance']),
        widgetCustomizations: JSON.stringify({
          'cry-btc': { size: 'medium', isDark: true, theme: 'glassmorphism' },
          'in-reliance': { size: 'large', isDark: true, theme: 'glassmorphism' },
          'us-aapl': { size: 'small', isDark: true, theme: 'wallpaper-match' }
        }),
        activeWallpaperId: 'sunset',
        isSystemDarkMode: true,
        isPremiumUnlocked: false,
        refreshIntervalSec: 25,
      };

      const settingsResult = await db.insert(userSettings)
        .values(defaultSettings)
        .onConflictDoNothing()
        .returning();

      if (settingsResult.length > 0) {
        settings = settingsResult;
      } else {
        // Fallback fetch if another parallel request inserted it
        settings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
      }
    }

    return { user, settings: settings[0] };
  } catch (error) {
    console.error("Database operation failed in getOrCreateUser:", error);
    throw new Error("Unable to retrieve user information from the database.", { cause: error });
  }
}

export async function updateUserSettings(uid: string, data: UserStateData) {
  try {
    const userResult = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (userResult.length === 0) {
      throw new Error("User record not found in database.");
    }
    const user = userResult[0];

    await db.update(userSettings)
      .set({
        activeScriptIds: data.activeScriptIds,
        openedWidgetIds: data.openedWidgetIds,
        widgetCustomizations: data.widgetCustomizations,
        activeWallpaperId: data.activeWallpaperId,
        isSystemDarkMode: data.isSystemDarkMode,
        isPremiumUnlocked: data.isPremiumUnlocked,
        refreshIntervalSec: data.refreshIntervalSec,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, user.id));
  } catch (error) {
    console.error("Database operation failed in updateUserSettings:", error);
    throw new Error("Unable to update settings in the database.", { cause: error });
  }
}
