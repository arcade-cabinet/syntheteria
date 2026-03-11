/**
 * Minimal expo-sqlite stub for Jest.
 *
 * expo-sqlite is a native module that cannot run in a Node test environment.
 * db.ts uses require('expo-sqlite') inside a try/catch so it will gracefully
 * fall back to null — this stub simply ensures the import doesn't throw.
 */

export const openDatabaseSync = () => null;

export default { openDatabaseSync };
