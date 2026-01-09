import { parseQuantity as baseParse } from './parseQuantity';

// Wrapper to keep location-agnostic imports for Recipe Mode
export function parseQuantity(input: string): number | null {
  return baseParse(input);
}
