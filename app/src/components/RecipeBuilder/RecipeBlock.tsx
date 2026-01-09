import { useMemo, useState } from 'react';
import type { RecipeBlockState, IngredientLibraryItem } from '../../data/types';
import { parseQuantity } from '../../utils/quantity';
import { formatNutrient } from '../../utils/format';

export interface IngredientInput {
  name: string;
  servingSize?: string;
  perRaw: string;
  perType: string;
  calories: string;
  fat: string;
  sodium: string;
  carbs: string;
  fiber: string;
  sugar: string;
  protein: string;
}

interface RecipeBlockProps {
  block: RecipeBlockState;
  onUpdate(blockId: string, updated: Partial<RecipeBlockState>): void;
  onAddIngredient(blockId: string, ingredient: IngredientInput): void;
  onDeleteIngredient(blockId: string, ingredientId: string): void;
  onDone(blockId: string): void;
  onAddToMealLog(blockId: string): void;
  onFetchSuggestions(query: string): Promise<IngredientLibraryItem[]>;
  onSelectSuggestion(blockId: string, suggestion: IngredientLibraryItem): void;
}

const perTypeOptions = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'g', 'mL', 'piece', 'serving', 'can'];

export function RecipeBlock({
  block,
  onUpdate,
  onAddIngredient,
  onDeleteIngredient,
  onDone,
  onAddToMealLog,
  onFetchSuggestions,
  onSelectSuggestion,
}: RecipeBlockProps) {
  const [entry, setEntry] = useState<IngredientInput>({
    name: '',
    servingSize: '',
    perRaw: '1',
    perType: 'serving',
    calories: '0',
    fat: '0',
    sodium: '0',
    carbs: '0',
    fiber: '0',
    sugar: '0',
    protein: '0',
  });
  const [perError, setPerError] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<IngredientLibraryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const recipeTotals = useMemo(() => {
    return block.ingredients.reduce(
      (acc, ing) => {
        const parsed = parseQuantity(ing.perRaw);
        const factor = parsed !== null ? parsed : 1;
        return {
          calories: acc.calories + ing.calories * factor,
          fat: acc.fat + ing.fat * factor,
          sodium: acc.sodium + ing.sodium * factor,
          carbs: acc.carbs + ing.carbs * factor,
          fiber: acc.fiber + ing.fiber * factor,
          sugar: acc.sugar + ing.sugar * factor,
          protein: acc.protein + ing.protein * factor,
        };
      },
      { calories: 0, fat: 0, sodium: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0 }
    );
  }, [block.ingredients]);

  async function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseQuantity(entry.perRaw);
    if (parsed === null || parsed <= 0) {
      setPerError('Invalid Per value (use decimal or fraction)');
      return;
    }
    setPerError(undefined);
    onAddIngredient(block.id, entry);
    setEntry((prev) => ({ ...prev, name: '', servingSize: '', perRaw: '1', perType: 'serving', calories: '0', fat: '0', sodium: '0', carbs: '0', fiber: '0', sugar: '0', protein: '0' }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleSelectSuggestion(item: IngredientLibraryItem) {
    onSelectSuggestion(block.id, item);
    setEntry({
      name: item.name,
      servingSize: item.defaults.servingSize ?? '',
      perRaw: item.defaults.perRaw,
      perType: item.defaults.perType,
      calories: String(item.defaults.calories ?? 0),
      fat: String(item.defaults.fat ?? 0),
      sodium: String(item.defaults.sodium ?? 0),
      carbs: String(item.defaults.carbs ?? 0),
      fiber: String(item.defaults.fiber ?? 0),
      sugar: String(item.defaults.sugar ?? 0),
      protein: String(item.defaults.protein ?? 0),
    });
    setShowSuggestions(false);
  }

  async function handleNameChange(value: string) {
    setEntry({ ...entry, name: value });
    if (value.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = await onFetchSuggestions(value);
    setSuggestions(results);
    setShowSuggestions(true);
  }

  return (
    <div className="surface recipe-block">
      <div className="form-row">
        <div className="form-field">
          <label>Recipe Name *</label>
          <input
            type="text"
            value={block.name}
            onChange={(e) => onUpdate(block.id, { name: e.target.value })}
            disabled={block.done}
          />
        </div>
        <div className="form-field form-field-small">
          <label>Total Yield *</label>
          <input
            type="text"
            value={block.totalYield}
            onChange={(e) => onUpdate(block.id, { totalYield: e.target.value })}
            placeholder="e.g., 2 cups"
            disabled={block.done}
          />
        </div>
        <div className="form-field form-field-small">
          <label>Favorite</label>
          <label className="favorite-toggle">
            <input
              type="checkbox"
              checked={block.isFavorite}
              onChange={() => onUpdate(block.id, { isFavorite: !block.isFavorite })}
              disabled={block.done}
            />
            <span>⭐</span>
          </label>
        </div>
      </div>

      {!block.done && (
        <form className="ingredient-entry" onSubmit={handleAddIngredient}>
          <div className="ingredient-row-top">
            <div className="form-field">
              <label>Ingredient Name *</label>
              <input
                type="text"
                value={entry.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                onFocus={() => entry.name && setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="autocomplete-list">
                  {suggestions.map((sug) => (
                    <li key={sug.id} onClick={() => handleSelectSuggestion(sug)}>
                      {sug.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-field form-field-small">
              <label>Serving Size (optional)</label>
              <input
                type="text"
                value={entry.servingSize}
                onChange={(e) => setEntry({ ...entry, servingSize: e.target.value })}
                placeholder="e.g., 100g"
              />
            </div>

            <div className="form-field form-field-small">
              <label>Per *</label>
              <input
                type="text"
                value={entry.perRaw}
                onChange={(e) => setEntry({ ...entry, perRaw: e.target.value })}
                placeholder="1 or 2/3"
                required
              />
              {perError && <span className="field-error">{perError}</span>}
            </div>

            <div className="form-field form-field-small">
              <label>Per Type *</label>
              <select
                value={entry.perType}
                onChange={(e) => setEntry({ ...entry, perType: e.target.value })}
              >
                {perTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            {([
              ['Calories', 'calories'],
              ['Fat (g)', 'fat'],
              ['Sodium (mg)', 'sodium'],
              ['Carbs (g)', 'carbs'],
              ['Fiber (g)', 'fiber'],
              ['Sugar (g)', 'sugar'],
              ['Protein (g)', 'protein'],
            ] as const).map(([label, key]) => (
              <div className="form-field form-field-small" key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entry[key]}
                  onChange={(e) => setEntry({ ...entry, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Add Ingredient</button>
          </div>
        </form>
      )}

      {block.ingredients.length > 0 && (
        <div className="table-container ingredients-table">
          <table className="food-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Serving Size</th>
                <th>Per</th>
                <th>Type</th>
                <th>Calories</th>
                <th>Fat</th>
                <th>Sodium</th>
                <th>Carbs</th>
                <th>Fiber</th>
                <th>Sugar</th>
                <th>Protein</th>
                {!block.done && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {block.ingredients.map((ing) => (
                <tr key={ing.id}>
                  <td>{ing.name}</td>
                  <td className="size-cell">{ing.servingSize || '-'}</td>
                  <td className="num-cell">{ing.perRaw}</td>
                  <td>{ing.perType}</td>
                  <td className="num-cell">{formatNutrient(ing.calories, 'calories')}</td>
                  <td className="num-cell">{formatNutrient(ing.fat, 'fat')}</td>
                  <td className="num-cell">{formatNutrient(ing.sodium, 'sodium')}</td>
                  <td className="num-cell">{formatNutrient(ing.carbs, 'carbs')}</td>
                  <td className="num-cell">{formatNutrient(ing.fiber, 'fiber')}</td>
                  <td className="num-cell">{formatNutrient(ing.sugar, 'sugar')}</td>
                  <td className="num-cell">{formatNutrient(ing.protein, 'protein')}</td>
                  {!block.done && (
                    <td className="actions-cell">
                      <button className="btn-small btn-delete" onClick={() => onDeleteIngredient(block.id, ing.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={4}><strong>Recipe Totals</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.calories, 'calories')}</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.fat, 'fat')}</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.sodium, 'sodium')}</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.carbs, 'carbs')}</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.fiber, 'fiber')}</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.sugar, 'sugar')}</strong></td>
                <td className="num-cell"><strong>{formatNutrient(recipeTotals.protein, 'protein')}</strong></td>
                {!block.done && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!block.done ? (
        <div className="recipe-actions">
          <button className="btn-primary" onClick={() => onDone(block.id)} disabled={block.ingredients.length === 0 || !block.name.trim()}>
            Done with Ingredients
          </button>
        </div>
      ) : (
        <div className="surface recipe-portion">
          <div className="form-row">
            <div className="form-field form-field-small">
              <label>Amount Having</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={block.amountHaving}
                onChange={(e) => onUpdate(block.id, { amountHaving: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={() => onAddToMealLog(block.id)}>
                Add Recipe to Meal Log
              </button>
            </div>
          </div>
          <div className="recipe-portion-preview">
            <p><strong>Recipe Totals:</strong> {formatNutrient(recipeTotals.calories, 'calories')} kcal, {formatNutrient(recipeTotals.carbs, 'carbs')}g carbs</p>
          </div>
        </div>
      )}
    </div>
  );
}
