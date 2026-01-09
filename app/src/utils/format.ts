export type NutrientKey = 'calories' | 'sodium' | 'fat' | 'carbs' | 'fiber' | 'sugar' | 'protein';

/**
 * Convert unknown input to a safe number, returning 0 for NaN/null/undefined
 */
export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Round a number to a specified number of decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Format calories as integer (0 decimals)
 */
export function formatCalories(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return '0';
  return Math.round(value).toString();
}

/**
 * Format sodium as integer (0 decimals)
 */
export function formatSodium(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return '0';
  return Math.round(value).toString();
}

/**
 * Format macro nutrient (fat, carbs, fiber, sugar, protein) with 1 decimal
 */
export function formatMacro(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return '0.0';
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1);
}

/**
 * Format integer nutrients (0 decimals)
 */
export function formatInt(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return '0';
  return Math.round(value).toString();
}

/**
 * Format with 1 decimal place
 */
export function format1(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return '0.0';
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1);
}

/**
 * Format a nutrient value based on its key
 */
export function formatNutrient(value: number | null | undefined, key: NutrientKey): string {
  if (key === 'calories') return formatCalories(value);
  if (key === 'sodium') return formatSodium(value);
  return formatMacro(value);
}
