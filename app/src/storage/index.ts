import { openDB, type DBSchema } from 'idb';
import type { MealEntry } from '../types/meal';
import type { Template } from '../types/template';
import type { FoodCatalogItem } from '../types/foodCatalog';

interface CarbCalculatorDB extends DBSchema {
  mealEntries: {
    key: string;
    value: MealEntry;
  };
  templates: {
    key: string;
    value: Template;
  };
  eatingOutItems: {
    key: string;
    value: FoodCatalogItem;
  };
}

const dbPromise = openDB<CarbCalculatorDB>('CarbCalculatorDB', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('mealEntries')) {
      db.createObjectStore('mealEntries', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('templates')) {
      db.createObjectStore('templates', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('eatingOutItems')) {
      db.createObjectStore('eatingOutItems', { keyPath: 'id' });
    }
  },
});

export const storage = {
  async addMealEntry(entry: MealEntry) {
    const db = await dbPromise;
    await db.put('mealEntries', entry);
    return this.verifyWrite('mealEntries', entry.id);
  },

  async listMealEntries(): Promise<MealEntry[]> {
    const db = await dbPromise;
    return db.getAll('mealEntries');
  },

  async updateMealEntry(entry: MealEntry) {
    const db = await dbPromise;
    await db.put('mealEntries', entry);
    return this.verifyWrite('mealEntries', entry.id);
  },

  async addTemplate(template: Template) {
    const db = await dbPromise;
    await db.put('templates', template);
    return this.verifyWrite('templates', template.id);
  },

  async listTemplates(): Promise<Template[]> {
    const db = await dbPromise;
    return db.getAll('templates');
  },

  async deleteTemplate(id: string): Promise<void> {
    const db = await dbPromise;
    await db.delete('templates', id);
  },

  async addEatingOutItem(item: FoodCatalogItem) {
    const db = await dbPromise;
    await db.put('eatingOutItems', item);
    return this.verifyWrite('eatingOutItems', item.id);
  },

  async listEatingOutItems(): Promise<FoodCatalogItem[]> {
    const db = await dbPromise;
    return db.getAll('eatingOutItems');
  },

  async deleteMealEntry(id: string): Promise<void> {
    const db = await dbPromise;
    await db.delete('mealEntries', id);
  },

  async updateEatingOutItem(item: FoodCatalogItem): Promise<void> {
    const db = await dbPromise;
    await db.put('eatingOutItems', item);
  },

  async deleteEatingOutItem(id: string): Promise<void> {
    const db = await dbPromise;
    await db.delete('eatingOutItems', id);
  },

  async verifyWrite(storeName: 'mealEntries' | 'templates' | 'eatingOutItems', id: string): Promise<boolean> {
    const db = await dbPromise;
    return !!(await db.get(storeName, id));
  },
};