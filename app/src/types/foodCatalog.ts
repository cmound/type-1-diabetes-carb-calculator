export type EatingOutSourceType = 'FAST_FOOD' | 'RESTAURANT';

export type FoodCatalogItem = {
  id: string;
  sourceType: EatingOutSourceType;
  chain: string;
  itemName: string;
  basisQty: number;
  basisUnit: string;
  calories: number;
  fatG: number;
  sodiumMg: number;
  carbsG: number;
  fiberG: number;
  sugarG: number;
  proteinG: number;
  updatedAt: number;
  createdAt: number;
};
