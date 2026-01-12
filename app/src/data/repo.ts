/**
 * Repository layer - Data access functions
 */

import { openDb, getAllByIndex, putOne, deleteOne } from './db';
import { newId } from '../utils/id';
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
  MacroTotals,
} from './types';

// ============================================================================
// Templates - Food
// ============================================================================

export async function upsertFoodTemplate(template: Omit<FoodTemplate, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<FoodTemplate> {
  const now = Date.now();
  const fullTemplate: FoodTemplate = {
    ...template,
    id: template.id || newId('food'),
    createdAt: template.id ? (await getFoodTemplateById(template.id))?.createdAt ?? now : now,
    updatedAt: now,
    nameLower: template.name.toLowerCase(),
  } as FoodTemplate;

  await putOne('foodTemplates', fullTemplate);
  return fullTemplate;
}

export async function getFoodTemplateById(id: string): Promise<FoodTemplate | undefined> {
  const db = await openDb();
  return await db.get('foodTemplates', id);
}

export async function searchFoodTemplatesByName(query: string): Promise<FoodTemplate[]> {
  const db = await openDb();
  const all = await db.getAll('foodTemplates');
  const lowerQuery = query.toLowerCase();
  return all.filter((t) => t.nameLower.includes(lowerQuery));
}

// ============================================================================
// Templates - Recipe
// ============================================================================

export async function upsertRecipeTemplate(recipe: Omit<RecipeTemplate, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<RecipeTemplate> {
  const now = Date.now();
  const fullRecipe: RecipeTemplate = {
    ...recipe,
    id: recipe.id || newId('recipe'),
    createdAt: recipe.id ? (await getRecipeTemplateById(recipe.id))?.createdAt ?? now : now,
    updatedAt: now,
    nameLower: recipe.name.toLowerCase(),
  } as RecipeTemplate;

  await putOne('recipeTemplates', fullRecipe);
  return fullRecipe;
}

export async function getRecipeTemplateById(id: string): Promise<RecipeTemplate | undefined> {
  const db = await openDb();
  return await db.get('recipeTemplates', id);
}

export async function searchRecipeTemplatesByName(query: string): Promise<RecipeTemplate[]> {
  const db = await openDb();
  const all = await db.getAll('recipeTemplates');
  const lowerQuery = query.toLowerCase();
  return all.filter((t) => t.nameLower.includes(lowerQuery));
}

export async function upsertRecipeIngredient(ingredient: Omit<RecipeIngredient, 'id' | 'nameLower'> & { id?: string }): Promise<RecipeIngredient> {
  const fullIngredient: RecipeIngredient = {
    ...ingredient,
    id: ingredient.id || newId('ingredient'),
    nameLower: ingredient.name.toLowerCase(),
  } as RecipeIngredient;

  await putOne('recipeIngredients', fullIngredient);
  return fullIngredient;
}

export async function getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  return await getAllByIndex<RecipeIngredient>('recipeIngredients', 'recipeId', recipeId);
}

/**
 * Save a recipe template with its ingredients in a single transaction
 */
export async function saveRecipeTemplate(
  recipe: Omit<RecipeTemplate, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'>,
  ingredients: Omit<RecipeIngredient, 'id' | 'recipeId' | 'nameLower'>[]
): Promise<{ recipe: RecipeTemplate; ingredients: RecipeIngredient[] }> {
  // First create the recipe
  const savedRecipe = await upsertRecipeTemplate(recipe);

  // Then create all ingredients with the recipe ID
  const savedIngredients: RecipeIngredient[] = [];
  for (const ing of ingredients) {
    const savedIng = await upsertRecipeIngredient({
      ...ing,
      recipeId: savedRecipe.id,
    });
    savedIngredients.push(savedIng);
  }

  return { recipe: savedRecipe, ingredients: savedIngredients };
}

// ============================================================================
// Ingredient Library
// ============================================================================

export async function upsertIngredientLibraryItem(input: Omit<IngredientLibraryItem, 'id' | 'nameLower' | 'lastUsedAt'> & { id?: string; lastUsedAt?: number }): Promise<IngredientLibraryItem> {
  const now = Date.now();
  const id = input.id || newId('ingredient-lib');
  const fullItem: IngredientLibraryItem = {
    ...input,
    id,
    nameLower: input.name.toLowerCase(),
    lastUsedAt: input.lastUsedAt ?? now,
  } as IngredientLibraryItem;

  await putOne('ingredientLibrary', fullItem);
  return fullItem;
}

export async function searchIngredientLibraryByPrefix(prefix: string, limit = 10): Promise<IngredientLibraryItem[]> {
  const db = await openDb();
  const all = await db.getAll('ingredientLibrary');
  const lower = prefix.trim().toLowerCase();
  if (!lower) return all.slice(0, limit);
  return all.filter((item) => item.nameLower.startsWith(lower)).slice(0, limit);
}

export async function getIngredientLibraryItemByNameLower(nameLower: string): Promise<IngredientLibraryItem | undefined> {
  const db = await openDb();
  const all = await db.getAll('ingredientLibrary');
  return all.find((item) => item.nameLower === nameLower);
}

// ============================================================================
// Vendors
// ============================================================================

export async function upsertVendor(vendor: Omit<Vendor, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Vendor> {
  const now = Date.now();
  const fullVendor: Vendor = {
    ...vendor,
    id: vendor.id || newId('vendor'),
    createdAt: vendor.id ? (await getVendorById(vendor.id))?.createdAt ?? now : now,
    updatedAt: now,
    nameLower: vendor.name.toLowerCase(),
  } as Vendor;

  await putOne('vendors', fullVendor);
  return fullVendor;
}

export async function getVendorById(id: string): Promise<Vendor | undefined> {
  const db = await openDb();
  return await db.get('vendors', id);
}

export async function listVendors(): Promise<Vendor[]> {
  const db = await openDb();
  return await db.getAll('vendors');
}

export async function upsertVendorMenuItem(item: Omit<VendorMenuItem, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<VendorMenuItem> {
  const now = Date.now();
  const fullItem: VendorMenuItem = {
    ...item,
    id: item.id || newId('menu-item'),
    createdAt: item.id ? (await getVendorMenuItemById(item.id))?.createdAt ?? now : now,
    updatedAt: now,
    nameLower: item.name.toLowerCase(),
  } as VendorMenuItem;

  await putOne('vendorMenuItems', fullItem);
  return fullItem;
}

export async function getVendorMenuItemById(id: string): Promise<VendorMenuItem | undefined> {
  const db = await openDb();
  return await db.get('vendorMenuItems', id);
}

export async function listVendorMenuItems(vendorId: string): Promise<VendorMenuItem[]> {
  return await getAllByIndex<VendorMenuItem>('vendorMenuItems', 'vendorId', vendorId);
}

// ============================================================================
// Current Meal Session
// ============================================================================

export async function createMealSession(session: Omit<MealSession, 'id'>): Promise<MealSession> {
  const fullSession: MealSession = {
    id: newId('session'),
    ...session,
  };

  await putOne('mealSessions', fullSession);
  return fullSession;
}

export async function getMealSessionById(id: string): Promise<MealSession | undefined> {
  const db = await openDb();
  return await db.get('mealSessions', id);
}

export async function updateMealSession(id: string, patch: Partial<Omit<MealSession, 'id'>>): Promise<void> {
  const existing = await getMealSessionById(id);
  if (!existing) throw new Error(`Session ${id} not found`);
  
  const updated: MealSession = {
    ...existing,
    ...patch,
  };
  
  await putOne('mealSessions', updated);
}

// Upsert a full meal session (explicit save)
export async function saveMealSession(session: MealSession): Promise<void> {
  await putOne('mealSessions', session);
}

// List all saved meal sessions, sorted by timestamp (newest first)
export async function listMealSessions(): Promise<MealSession[]> {
  const db = await openDb();
  const all = await db.getAll('mealSessions');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteMealSession(id: string): Promise<void> {
  await deleteOne('mealSessions', id);
}

// ============================================================================
// Meal Line Items (current meal)
// ============================================================================

export async function addMealLineItem(item: Omit<MealLineItem, 'id' | 'nameLower' | 'createdAt'>): Promise<MealLineItem> {
  const fullItem: MealLineItem = {
    ...item,
    id: newId('line-item'),
    createdAt: Date.now(),
    nameLower: item.name.toLowerCase(),
  };

  await putOne('mealLineItems', fullItem);
  return fullItem;
}

export async function getMealLineItemById(id: string): Promise<MealLineItem | undefined> {
  const db = await openDb();
  return await db.get('mealLineItems', id);
}

export async function listMealLineItems(sessionId: string): Promise<MealLineItem[]> {
  return await getAllByIndex<MealLineItem>('mealLineItems', 'sessionId', sessionId);
}

export async function updateMealLineItem(id: string, patch: Partial<Omit<MealLineItem, 'id' | 'createdAt'>>): Promise<void> {
  const existing = await getMealLineItemById(id);
  if (!existing) throw new Error(`Line item ${id} not found`);

  const updated: MealLineItem = {
    ...existing,
    ...patch,
  };

  if (patch.name) {
    updated.nameLower = patch.name.toLowerCase();
  }

  await putOne('mealLineItems', updated);
}

export async function deleteMealLineItem(id: string): Promise<void> {
  await deleteOne('mealLineItems', id);
}

// ============================================================================
// Meal Journal (history)
// ============================================================================

export async function addMealJournalEntryFromSession(
  sessionId: string,
  notes?: string,
  guidanceUsed?: string
): Promise<MealJournalEntry> {
  const session = await getMealSessionById(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const lineItems = await listMealLineItems(sessionId);

  // Calculate totals
  const totals: MacroTotals = lineItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.macros.calories,
      fatG: acc.fatG + item.macros.fatG,
      sodiumMg: acc.sodiumMg + item.macros.sodiumMg,
      carbsG: acc.carbsG + item.macros.carbsG,
      fiberG: acc.fiberG + item.macros.fiberG,
      sugarG: acc.sugarG + item.macros.sugarG,
      proteinG: acc.proteinG + item.macros.proteinG,
    }),
    {
      calories: 0,
      fatG: 0,
      sodiumMg: 0,
      carbsG: 0,
      fiberG: 0,
      sugarG: 0,
      proteinG: 0,
    }
  );

  // Get unique sources
  const sources = new Set(lineItems.map((item) => item.source));
  const secondarySources = Array.from(sources).filter((s) => s !== session.primarySource);

  const journalEntry: MealJournalEntry = {
    id: newId('journal'),
    timestamp: session.timestamp,
    category: session.category,
    primarySource: session.primarySource,
    secondarySources,
    totals,
    guidanceUsed,
    notes: notes ?? session.notes,
  };

  await putOne('mealJournal', journalEntry);

  // Copy line items to journal
  for (const item of lineItems) {
    const journalLineItem: MealJournalLineItem = {
      id: newId('journal-line'),
      journalId: journalEntry.id,
      name: item.name,
      nameLower: item.nameLower,
      source: item.source,
      quantity: item.quantity,
      macros: item.macros,
      notes: item.notes,
      servingSize: item.servingSize,
      perQuantityRaw: item.perQuantityRaw,
      perType: item.perType,
      order: item.order,
    };
    await putOne('mealJournalLineItems', journalLineItem);
  }

  return journalEntry;
}

export async function getMealJournalEntryById(id: string): Promise<MealJournalEntry | undefined> {
  const db = await openDb();
  return await db.get('mealJournal', id);
}

export async function listMealJournalEntries(range?: { start: number; end: number }): Promise<MealJournalEntry[]> {
  const db = await openDb();
  const all = await db.getAll('mealJournal');
  
  if (!range) return all.sort((a, b) => b.timestamp - a.timestamp);
  
  return all
    .filter((entry) => entry.timestamp >= range.start && entry.timestamp <= range.end)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function listMealJournalLineItems(journalId: string): Promise<MealJournalLineItem[]> {
  return await getAllByIndex<MealJournalLineItem>('mealJournalLineItems', 'journalId', journalId);
}

export async function updateMealJournalNotes(id: string, notes: string): Promise<void> {
  const existing = await getMealJournalEntryById(id);
  if (!existing) throw new Error(`Journal entry ${id} not found`);

  const updated: MealJournalEntry = {
    ...existing,
    notes,
  };

  await putOne('mealJournal', updated);
}
