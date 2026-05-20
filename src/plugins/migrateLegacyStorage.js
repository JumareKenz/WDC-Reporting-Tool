/**
 * One-time migration from localStorage to Capacitor Preferences.
 *
 * Runs on first native app launch. Finds all wdc_* keys in localStorage
 * and copies them to Capacitor Preferences. Sets a migration flag so
 * it never runs again.
 *
 * Safe to call multiple times — it's idempotent after the first run.
 */

import { storage, isNative } from './capacitor';

const MIGRATION_FLAG = 'wdc_storage_migrated_v1';

export async function migrateLegacyLocalStorage() {
  // Only needed on native; web continues to use localStorage directly
  if (!isNative) return;

  // Check if already migrated
  const alreadyMigrated = await storage.get(MIGRATION_FLAG);
  if (alreadyMigrated) return;

  let migratedCount = 0;

  try {
    // Copy all wdc_* keys from localStorage to Preferences
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('wdc_') || key === 'token' || key === 'user')) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          await storage.set(key, value);
          migratedCount++;
        }
      }
    }

    // Mark migration complete
    await storage.set(MIGRATION_FLAG, 'true');

    if (import.meta.env.DEV) {
      console.log(`[Migration] localStorage → Preferences: ${migratedCount} keys migrated`);
    }
  } catch (err) {
    // Non-fatal — app can still function without migration
    console.warn('[Migration] Failed to migrate localStorage:', err);
  }
}
