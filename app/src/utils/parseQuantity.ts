/**
 * Parse quantity strings including fractions and mixed numbers
 */

export function parseQuantity(input: string): number | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as decimal first
  const decimal = Number(trimmed);
  if (!isNaN(decimal) && isFinite(decimal)) {
    return decimal;
  }

  // Try parsing as fraction (e.g., "2/3")
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  // Try parsing as mixed number (e.g., "2 1/3")
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);
    if (denominator === 0) return null;
    return whole + numerator / denominator;
  }

  return null;
}
