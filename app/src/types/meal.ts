export interface MealEntry {
  id: string;
  sessionDate: string;
  sessionTime: string;
  category: string;
  primarySource: string;
  bsl?: number;
  totals?: {
    carbsG: number;
    fatG: number;
    proteinG: number;
    calories: number;
  };
  lineItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    macros: {
      carbsG: number;
      fatG: number;
      proteinG: number;
      calories: number;
      sodiumMg: number;
      fiberG: number;
      sugarG: number;
    };
    source?: string;
    perQuantityRaw?: string;
    perType?: string;
    servingSize?: string;
    notes?: string;
  }>;
  notes?: string;
}