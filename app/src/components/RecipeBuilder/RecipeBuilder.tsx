import { useState } from 'react';
import type {
  IngredientRow,
  RecipeBlockState,
  IngredientLibraryItem,
  MacroTotals,
} from '../../data/types';
import { RecipeBlock, type IngredientInput } from './RecipeBlock';
import { parseQuantity } from '../../utils/quantity';
import {
  addMealLineItem,
  saveRecipeTemplate,
  upsertIngredientLibraryItem,
  searchIngredientLibraryByPrefix,
} from '../../data/repo';
import { newId } from '../../utils/id';

interface RecipeBuilderProps {
  sessionId: string;
  onAfterAdd(): Promise<void>;
  onIngredientAdd?(): void;
}

const EMPTY_BLOCK = (): RecipeBlockState => ({
  id: newId('recipe-block'),
  name: '',
  totalYield: '1',
  isFavorite: false,
  ingredients: [],
  done: false,
  amountHaving: '1',
});

function toNumber(value: string): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function computeTotals(ingredients: IngredientRow[]): MacroTotals {
  return ingredients.reduce(
    (acc, ing) => {
      const factor = parseQuantity(ing.perRaw) ?? 1;
      return {
        calories: acc.calories + ing.calories * factor,
        fatG: acc.fatG + ing.fat * factor,
        sodiumMg: acc.sodiumMg + ing.sodium * factor,
        carbsG: acc.carbsG + ing.carbs * factor,
        fiberG: acc.fiberG + ing.fiber * factor,
        sugarG: acc.sugarG + ing.sugar * factor,
        proteinG: acc.proteinG + ing.protein * factor,
      };
    },
    { calories: 0, fatG: 0, sodiumMg: 0, carbsG: 0, fiberG: 0, sugarG: 0, proteinG: 0 }
  );
}

function RecipeBuilderInner({ sessionId, onAfterAdd, onIngredientAdd }: RecipeBuilderProps) {
  const [blocks, setBlocks] = useState<RecipeBlockState[]>([EMPTY_BLOCK()]);

  function handleUpdate(blockId: string, updated: Partial<RecipeBlockState>) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updated } : b)));
  }

  async function handleAddIngredient(blockId: string, input: IngredientInput) {
    const factor = parseQuantity(input.perRaw);
    const perValid = factor !== null && factor > 0 ? input.perRaw : '1';
    const newIng: IngredientRow = {
      id: newId('ingredient-row'),
      name: input.name.trim(),
      servingSize: input.servingSize?.trim() || undefined,
      perRaw: perValid,
      perType: input.perType,
      calories: toNumber(input.calories),
      fat: toNumber(input.fat),
      sodium: toNumber(input.sodium),
      carbs: toNumber(input.carbs),
      fiber: toNumber(input.fiber),
      sugar: toNumber(input.sugar),
      protein: toNumber(input.protein),
    };

    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ingredients: [...b.ingredients, newIng] } : b)));

    // Notify parent that ingredient was added
    onIngredientAdd?.();

    // upsert ingredient library for autocomplete
    await upsertIngredientLibraryItem({
      name: newIng.name,
      defaults: {
        servingSize: newIng.servingSize,
        perRaw: newIng.perRaw,
        perType: newIng.perType,
        calories: newIng.calories,
        fat: newIng.fat,
        sodium: newIng.sodium,
        carbs: newIng.carbs,
        fiber: newIng.fiber,
        sugar: newIng.sugar,
        protein: newIng.protein,
      },
    });
  }

  function handleDeleteIngredient(blockId: string, ingredientId: string) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ingredients: b.ingredients.filter((ing) => ing.id !== ingredientId) } : b)));
  }

  async function handleDone(blockId: string) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, done: true } : b)));

    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    if (!block.name.trim() || block.ingredients.length === 0) return;

    const totalsForSave = computeTotals(block.ingredients);
    await saveRecipeTemplate(
      {
        name: block.name,
        totalYield: block.totalYield || '1',
        isFavorite: block.isFavorite,
        macros: totalsForSave,
        macrosPerServing: totalsForSave,
      },
      block.ingredients.map((ing, index) => ({
        name: ing.name,
        servingSize: ing.servingSize,
        perRaw: ing.perRaw,
        perType: ing.perType,
        calories: ing.calories,
        fat: ing.fat,
        sodium: ing.sodium,
        carbs: ing.carbs,
        fiber: ing.fiber,
        sugar: ing.sugar,
        protein: ing.protein,
        order: index + 1,
      }))
    );
  }

  async function handleAddToMealLog(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const amount = toNumber(block.amountHaving || '1');
    const totals = computeTotals(block.ingredients);
    const portion: MacroTotals = {
      calories: totals.calories * amount,
      fatG: totals.fatG * amount,
      sodiumMg: totals.sodiumMg * amount,
      carbsG: totals.carbsG * amount,
      fiberG: totals.fiberG * amount,
      sugarG: totals.sugarG * amount,
      proteinG: totals.proteinG * amount,
    };

    await addMealLineItem({
      sessionId,
      name: `${block.name || 'Recipe'} (Recipe)`,
      source: 'Recipe',
      quantity: amount,
      macros: portion,
      order: Date.now(),
      notes: `${amount} of ${block.totalYield || '1'} yield`,
    });

    await onAfterAdd();
  }

  async function handleFetchSuggestions(query: string): Promise<IngredientLibraryItem[]> {
    return searchIngredientLibraryByPrefix(query, 8);
  }

  function handleSelectSuggestion(blockId: string, _suggestion: IngredientLibraryItem) {
    void _suggestion;
    // No-op here; selection handled in block via onSelectSuggestion callback
    handleUpdate(blockId, {});
  }

  function handleAddBlock() {
    setBlocks((prev) => [...prev, EMPTY_BLOCK()]);
  }

  return (
    <div className="recipe-builder">
      <div className="recipe-builder-actions">
        <button className="btn-primary" onClick={handleAddBlock}>+ Add Recipe Block</button>
      </div>
      {blocks.map((block) => (
        <RecipeBlock
          key={block.id}
          block={block}
          onUpdate={handleUpdate}
          onAddIngredient={handleAddIngredient}
          onDeleteIngredient={handleDeleteIngredient}
          onDone={handleDone}
          onAddToMealLog={handleAddToMealLog}
          onFetchSuggestions={handleFetchSuggestions}
          onSelectSuggestion={handleSelectSuggestion}
        />
      ))}
    </div>
  );
}
export function RecipeBuilder(props: RecipeBuilderProps) {
  return <RecipeBuilderInner key={props.sessionId} {...props} />;
}
