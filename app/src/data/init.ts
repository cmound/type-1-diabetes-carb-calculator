/**
 * Database initialization
 */

import { openDb } from './db';

export async function initDb(): Promise<void> {
  try {
    await openDb();
    if (import.meta.env.DEV) {
      console.log('[db] initialized t1d-carb-calc');
    }
  } catch (error) {
    console.error('[db] init failed', error);
  }
}
