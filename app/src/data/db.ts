/**
 * Database layer - IndexedDB wrapper using idb library
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  FoodTemplate,
  RecipeTemplate,
  RecipeIngredient,
  IngredientLibraryItem,
  Vendor,
  VendorMenuItem,
  MealSession,
  MealLineItem,
  MealJournalEntry,
  MealJournalLineItem,
  MealJournalRecipeIngredient,
  Setting,
} from './types';

const DB_NAME = 't1d-carb-calc';
const DB_VERSION = 2;

export interface AppDBSchema {
  foodTemplates: {
    key: string;
    value: FoodTemplate;
    indexes: { nameLower: string };
  };
  recipeTemplates: {
    key: string;
    value: RecipeTemplate;
    indexes: { nameLower: string };
  };
  recipeIngredients: {
    key: string;
    value: RecipeIngredient;
    indexes: { recipeId: string; nameLower: string };
  };
  ingredientLibrary: {
    key: string;
    value: IngredientLibraryItem;
    indexes: { nameLower: string; lastUsedAt: number };
  };
  vendors: {
    key: string;
    value: Vendor;
    indexes: { nameLower: string };
  };
  vendorMenuItems: {
    key: string;
    value: VendorMenuItem;
    indexes: { vendorId: string; nameLower: string };
  };
  mealSessions: {
    key: string;
    value: MealSession;
    indexes: { timestamp: number };
  };
  mealLineItems: {
    key: string;
    value: MealLineItem;
    indexes: { sessionId: string; nameLower: string };
  };
  mealJournal: {
    key: string;
    value: MealJournalEntry;
    indexes: { timestamp: number; category: string; primarySource: string };
  };
  mealJournalLineItems: {
    key: string;
    value: MealJournalLineItem;
    indexes: { journalId: string; nameLower: string };
  };
  mealJournalRecipeIngredients: {
    key: string;
    value: MealJournalRecipeIngredient;
    indexes: { journalId: string; recipeNameLower: string };
  };
  settings: {
    key: string;
    value: Setting;
  };
}

export type AppDB = IDBPDatabase<AppDBSchema>;
export type StoreNames = keyof AppDBSchema;

let dbInstance: AppDB | null = null;

export async function openDb(): Promise<AppDB> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AppDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Templates
      if (!db.objectStoreNames.contains('foodTemplates')) {
        const foodStore = db.createObjectStore('foodTemplates', { keyPath: 'id' });
        foodStore.createIndex('nameLower', 'nameLower');
      }

      if (!db.objectStoreNames.contains('recipeTemplates')) {
        const recipeStore = db.createObjectStore('recipeTemplates', { keyPath: 'id' });
        recipeStore.createIndex('nameLower', 'nameLower');
      }

      if (!db.objectStoreNames.contains('recipeIngredients')) {
        const ingredientStore = db.createObjectStore('recipeIngredients', { keyPath: 'id' });
        ingredientStore.createIndex('recipeId', 'recipeId');
        ingredientStore.createIndex('nameLower', 'nameLower');
      }

      if (!db.objectStoreNames.contains('ingredientLibrary')) {
        const libraryStore = db.createObjectStore('ingredientLibrary', { keyPath: 'id' });
        libraryStore.createIndex('nameLower', 'nameLower');
        libraryStore.createIndex('lastUsedAt', 'lastUsedAt');
      }

      if (!db.objectStoreNames.contains('vendors')) {
        const vendorStore = db.createObjectStore('vendors', { keyPath: 'id' });
        vendorStore.createIndex('nameLower', 'nameLower');
      }

      if (!db.objectStoreNames.contains('vendorMenuItems')) {
        const menuStore = db.createObjectStore('vendorMenuItems', { keyPath: 'id' });
        menuStore.createIndex('vendorId', 'vendorId');
        menuStore.createIndex('nameLower', 'nameLower');
      }

      // Current meal
      if (!db.objectStoreNames.contains('mealSessions')) {
        const sessionStore = db.createObjectStore('mealSessions', { keyPath: 'id' });
        sessionStore.createIndex('timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('mealLineItems')) {
        const lineStore = db.createObjectStore('mealLineItems', { keyPath: 'id' });
        lineStore.createIndex('sessionId', 'sessionId');
        lineStore.createIndex('nameLower', 'nameLower');
      }

      // Meal journal
      if (!db.objectStoreNames.contains('mealJournal')) {
        const journalStore = db.createObjectStore('mealJournal', { keyPath: 'id' });
        journalStore.createIndex('timestamp', 'timestamp');
        journalStore.createIndex('category', 'category');
        journalStore.createIndex('primarySource', 'primarySource');
      }

      if (!db.objectStoreNames.contains('mealJournalLineItems')) {
        const jLineStore = db.createObjectStore('mealJournalLineItems', { keyPath: 'id' });
        jLineStore.createIndex('journalId', 'journalId');
        jLineStore.createIndex('nameLower', 'nameLower');
      }

      if (!db.objectStoreNames.contains('mealJournalRecipeIngredients')) {
        const jRecipeStore = db.createObjectStore('mealJournalRecipeIngredients', { keyPath: 'id' });
        jRecipeStore.createIndex('journalId', 'journalId');
        jRecipeStore.createIndex('recipeNameLower', 'recipeNameLower');
      }

      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Helper functions

export async function getAllByIndex<T>(
  storeName: StoreNames,
  indexName: string,
  value: string | number
): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  return (await index.getAll(value)) as T[];
}

export async function putOne<T>(storeName: StoreNames, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).put(value as never);
  await tx.done;
}

export async function deleteOne(storeName: StoreNames, key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).delete(key);
  await tx.done;
}

export async function clearStore(storeName: StoreNames): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).clear();
  await tx.done;
}
