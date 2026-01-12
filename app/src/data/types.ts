/**
 * Type definitions for the Type 1 Diabetes Carb Calculator
 */

// Meal categories
export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

// Meal sources
export type MealSource = 'Home Meal' | 'Fast Food' | 'Restaurant' | 'Recipe' | 'Packaged Meal' | 'Custom';

// Macro nutritional totals
export interface MacroTotals {
  calories: number;
  fatG: number;
  sodiumMg: number;
  carbsG: number;
  fiberG: number;
  sugarG: number;
  proteinG: number;
}

// Food template (simple food item)
export interface FoodTemplate {
  id: string;
  name: string;
  nameLower: string; // for case-insensitive search
  description?: string;
  macros: MacroTotals;
  servingSize: string; // e.g., "1 cup", "100g"
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

// Recipe ingredient (part of a recipe template)
export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  nameLower: string;
  servingSize?: string; // optional free-text like "100g"
  perRaw: string; // as typed (e.g., "2/3", "0.66")
  perType: string; // cup, cups, tbsp, tsp, oz, g, mL, piece, serving, can, other
  calories: number;
  fat: number;
  sodium: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  order: number; // display order
}

// Recipe template
export interface RecipeTemplate {
  id: string;
  name: string;
  nameLower: string;
  totalYield: string; // stored exactly as entered (e.g., "1 cup", "8 pieces")
  isFavorite: boolean;
  macros: MacroTotals; // totals for entire recipe
  macrosPerServing: MacroTotals;
  createdAt: number;
  updatedAt: number;
}

// Vendor (restaurant, fast food chain, etc.)
export interface Vendor {
  id: string;
  name: string;
  nameLower: string;
  type: 'Fast Food' | 'Restaurant' | 'Other';
  createdAt: number;
  updatedAt: number;
}

// Vendor menu item
export interface VendorMenuItem {
  id: string;
  vendorId: string;
  vendorName: string; // denormalized for display
  name: string;
  nameLower: string;
  description?: string;
  macros: MacroTotals;
  servingSize: string;
  createdAt: number;
  updatedAt: number;
}

// Meal line item (a row in current meal or journal)
export interface MealLineItem {
  id: string;
  sessionId: string; // links to mealSessions
  name: string;
  nameLower: string;
  source: MealSource;
  sourceId?: string; // ID of template/vendor item if applicable
  quantity: number; // multiplier (e.g., 2.5 servings)
  macros: MacroTotals; // snapshot for this quantity
  notes?: string;
  servingSize?: string; // e.g., "150g"
  perQuantityRaw?: string; // user-entered per quantity text
  perType?: string; // unit that perQuantityRaw refers to (serving, g, oz, etc.)
  order: number; // display order
  createdAt: number;
}

// Current meal session (dashboard working state)
export interface MealSession {
  id: string;
  timestamp: number; // when meal started
  category: MealCategory;
  primarySource: MealSource;
  notes?: string;
  // Additional fields for saved sessions
  bsl?: number; // blood sugar level
  sessionDate?: string; // formatted date MM/DD/YYYY
  sessionTime?: string; // formatted time h:mm AM/PM
  lineItems?: MealLineItem[]; // snapshot of line items when saved
  totals?: MacroTotals; // calculated totals when saved
  saved?: boolean; // flag to indicate if this is a saved session
}

// Meal journal entry
export interface MealJournalEntry {
  id: string;
  timestamp: number; // when meal was consumed
  category: MealCategory;
  primarySource: MealSource;
  secondarySources: MealSource[]; // if meal had multiple source types
  totals: MacroTotals; // snapshot of totals at time of logging
  guidanceUsed?: string; // any insulin/guidance notes
  notes?: string;
}

// Meal journal line item (snapshot of what was in the meal)
export interface MealJournalLineItem {
  id: string;
  journalId: string;
  name: string;
  nameLower: string;
  source: MealSource;
  quantity: number;
  macros: MacroTotals;
  notes?: string;
  servingSize?: string;
  perQuantityRaw?: string;
  perType?: string;
  order: number;
}

// Meal journal recipe ingredient (snapshot)
export interface MealJournalRecipeIngredient {
  id: string;
  journalId: string;
  recipeId: string;
  recipeName: string;
  recipeNameLower: string;
  name: string;
  nameLower: string;
  perRaw: string;
  perType: string;
  calories: number;
  fat: number;
  sodium: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  order: number;
}

// Settings key-value
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

// Ingredient library item for autocomplete
export interface IngredientLibraryItem {
  id: string;
  name: string;
  nameLower: string;
  lastUsedAt: number;
  defaults: {
    servingSize?: string;
    perRaw: string;
    perType: string;
    calories: number;
    fat: number;
    sodium: number;
    carbs: number;
    fiber: number;
    sugar: number;
    protein: number;
  };
}

// Ingredient row for Recipe mode (in-memory working state)
export interface IngredientRow {
  id: string;
  name: string;
  servingSize?: string;
  perRaw: string;
  perType: string;
  calories: number;
  fat: number;
  sodium: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
}

// Recipe block state for UI
export interface RecipeBlockState {
  id: string;
  name: string;
  totalYield: string;
  isFavorite: boolean;
  ingredients: IngredientRow[];
  done: boolean;
  amountHaving: string;
  perError?: string;
}
