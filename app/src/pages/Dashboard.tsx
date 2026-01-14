/**
 * Dashboard - Meal Session Tracker
 * 
 * Meal Source Behavior:
 * - Home Meal & Packaged Meal: Standard form with Food Name, Serving Size, Per Quantity, Per Unit
 * - Fast Food & Restaurant: Chain + Food Item fields, no Per Unit (removed)
 * - Recipe: Shows Recipe Builder instead of food form
 * - Custom: Currently same as Home Meal (TODO: implement custom behavior)
 * 
 * Form adapts automatically when Meal Source changes.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  createMealSession,
  getMealSessionById,
  updateMealSession,
  saveMealSession,
  listMealSessions,
  addMealLineItem,
  listMealLineItems,
  updateMealLineItem,
  deleteMealLineItem,
} from '../data/repo';
import {
  findByKey as findCatalogItemByKey,
  listFoodCatalogItems,
  normalizeKey,
  upsertFoodCatalogItem,
} from '../data/foodCatalogRepo';
import type { MealSession, MealLineItem, MealCategory, MealSource, MacroTotals } from '../data/types';
import type { EatingOutSourceType, FoodCatalogItem } from '../types/foodCatalog';
import { parseQuantity } from '../utils/parseQuantity';
import { formatNutrient } from '../utils/format';
import { RecipeBuilder } from '../components/RecipeBuilder/RecipeBuilder';
import './Dashboard.css';

const ACTIVE_SESSION_KEY = 'activeSessionId';

type ServingUnit = 'g' | 'mL' | 'cup' | 'tbsp' | 'tsp' | 'fl oz' | 'oz' | 'piece';
type PerUnitOption = 'serving' | 'g' | 'oz' | 'ml' | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'can' | 'bottle' | 'bag';
const perUnitOptions: PerUnitOption[] = ['serving', 'g', 'oz', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'can', 'bottle', 'bag'];
type PerQuantityUnit =
  | 'burger'
  | 'sandwich'
  | 'taco'
  | 'wrap'
  | 'slice'
  | 'piece'
  | 'order'
  | 'basket'
  | 'drink'
  | 'packet'
  | 'oz'
  | 'fl oz'
  | 'cup'
  | 'g'
  | 'mL'
  | 'serving';

const perQuantityUnitOptions: PerQuantityUnit[] = [
  'burger',
  'sandwich',
  'taco',
  'wrap',
  'slice',
  'piece',
  'order',
  'basket',
  'drink',
  'packet',
  'oz',
  'fl oz',
  'cup',
  'g',
  'mL',
  'serving',
];

function mapMealSourceToCatalogType(source: MealSource): EatingOutSourceType | null {
  if (source === 'Fast Food') return 'FAST_FOOD';
  if (source === 'Restaurant') return 'RESTAURANT';
  return null;
}

function isPhysicalBasisUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  const physical = ['g', 'ml', 'mL', 'oz', 'fl oz', 'cup', 'tbsp', 'tsp'];
  return physical.includes(unit);
}

interface FoodFormData {
  name: string;
  chain: string; // For Fast Food and Restaurant
  foodItem: string; // For Fast Food and Restaurant
  servingSizeAmount: string;
  servingSizeUnit: ServingUnit;
  perQuantityRaw: string;
  perUnit: PerUnitOption;
  perQuantityUnit?: PerQuantityUnit; // For Fast Food and Restaurant (optional)
  calories: string;
  fatG: string;
  sodiumMg: string;
  carbsG: string;
  fiberG: string;
  sugarG: string;
  proteinG: string;
  amountHaving: string;
}

const initialFormData: FoodFormData = {
  name: '',
  chain: '',
  foodItem: '',
  servingSizeAmount: '',
  servingSizeUnit: 'g',
  perQuantityRaw: '1',
  perUnit: 'serving',
  perQuantityUnit: 'order',
  calories: '0',
  fatG: '0',
  sodiumMg: '0',
  carbsG: '0',
  fiberG: '0',
  sugarG: '0',
  proteinG: '0',
  amountHaving: '1',
};

export function Dashboard() {
  const [session, setSession] = useState<MealSession | null>(null);
  const [lineItems, setLineItems] = useState<MealLineItem[]>([]);
  const [formData, setFormData] = useState<FoodFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Meal Session Header state
  const [currentBsl, setCurrentBsl] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>('');
  const [sessionTime, setSessionTime] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [savedSessions, setSavedSessions] = useState<MealSession[]>([]);
  const [priorNotes, setPriorNotes] = useState<MealSession[]>([]);
  const [foodCatalog, setFoodCatalog] = useState<FoodCatalogItem[]>([]);
  const [perQuantityDirty, setPerQuantityDirty] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogChainFilter, setCatalogChainFilter] = useState('');
  const [saveToCatalog, setSaveToCatalog] = useState(true);

  function getMealSignature(items: MealLineItem[]): string {
    return items
      .map((item) => (item.name || '').trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join('|');
  }

  async function loadSavedSessions() {
    try {
      const sessionsList = await listMealSessions();
      setSavedSessions(sessionsList);
    } catch (error) {
      console.error('[Dashboard] Failed to load saved sessions:', error);
    }
  }

  async function loadFoodCatalog() {
    try {
      const catalog = await listFoodCatalogItems();
      setFoodCatalog(catalog);
    } catch (error) {
      console.error('[Dashboard] Failed to load food catalog:', error);
    }
  }

  // Helper to update session timestamp and date/time
  function touchSessionTime() {
    const now = Date.now();
    const date = new Date(now);
    
    // Format date as MM/DD/YYYY
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;
    
    // Format time as h:mm AM/PM (no leading zero on hour)
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format, 0 becomes 12
    const formattedTime = `${hours}:${minutes} ${ampm}`;
    
    setSessionDate(formattedDate);
    setSessionTime(formattedTime);
  }

  // Initialize or restore active session
  useEffect(() => {
    async function initSession() {
      try {
        const storedId = localStorage.getItem(ACTIVE_SESSION_KEY);
        let activeSession: MealSession | null = null;

        if (storedId) {
          const found = await getMealSessionById(storedId);
          activeSession = found ?? null;
        }

        if (!activeSession) {
          // Create new session
          activeSession = await createMealSession({
            timestamp: Date.now(),
            category: 'Breakfast',
            primarySource: 'Home Meal',
          });
          localStorage.setItem(ACTIVE_SESSION_KEY, activeSession.id);
        }

        setSession(activeSession);
        await loadLineItems(activeSession.id);
      } catch (error) {
        console.error('[Dashboard] Failed to initialize session:', error);
      } finally {
        setLoading(false);
      }
    }

    initSession();
    loadSavedSessions();
    loadFoodCatalog();
  }, []);

  useEffect(() => {
    if (session) {
      setSessionNotes(session.notes ?? '');
    }
  }, [session]);

  useEffect(() => {
    const signature = getMealSignature(lineItems);
    if (!signature) {
      setPriorNotes([]);
      return;
    }

    const matches = savedSessions
      .filter((s) => (s.notes ?? '').trim() !== '' && s.lineItems && s.lineItems.length > 0)
      .filter((s) => getMealSignature(s.lineItems!) === signature)
      .sort((a, b) => (b.createdAt ?? b.timestamp ?? 0) - (a.createdAt ?? a.timestamp ?? 0))
      .slice(0, 3);

    setPriorNotes(matches);
  }, [lineItems, savedSessions]);

  const activeCatalogSource = useMemo(
    () => (session ? mapMealSourceToCatalogType(session.primarySource) : null),
    [session]
  );

  useEffect(() => {
    // Refresh catalog when the relevant source changes so picker stays in sync
    if (activeCatalogSource) {
      loadFoodCatalog();
    }
  }, [activeCatalogSource]);

  const chainOptions = useMemo(() => {
    if (!activeCatalogSource) return [] as string[];
    const seen = new Set<string>();
    for (const item of foodCatalog) {
      if (item.sourceType === activeCatalogSource) {
        seen.add(item.chain);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [activeCatalogSource, foodCatalog]);

  const foodItemOptions = useMemo(() => {
    if (!activeCatalogSource) return [] as string[];
    const chainNormalized = normalizeKey(formData.chain || '');
    const seen = new Set<string>();
    for (const item of foodCatalog) {
      if (item.sourceType !== activeCatalogSource) continue;
      if (chainNormalized && normalizeKey(item.chain) !== chainNormalized) continue;
      seen.add(item.itemName);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [activeCatalogSource, foodCatalog, formData.chain]);

  const filteredCatalogItems = useMemo(() => {
    if (!activeCatalogSource) return [] as FoodCatalogItem[];
    const query = catalogSearch.trim();
    const queryNorm = query ? normalizeKey(query) : '';
    const chainNorm = catalogChainFilter ? normalizeKey(catalogChainFilter) : '';

    return foodCatalog
      .filter((item) => item.sourceType === activeCatalogSource)
      .filter((item) => (chainNorm ? normalizeKey(item.chain) === chainNorm : true))
      .filter((item) =>
        queryNorm
          ? normalizeKey(item.chain).includes(queryNorm) || normalizeKey(item.itemName).includes(queryNorm)
          : true
      )
      .slice(0, 12);
  }, [activeCatalogSource, catalogChainFilter, catalogSearch, foodCatalog]);

  async function loadLineItems(sessionId: string) {
    try {
      const items = await listMealLineItems(sessionId);
      setLineItems(items.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('[Dashboard] Failed to load line items:', error);
    }
  }

  function deriveBaseMacros(lineItem: MealLineItem): MacroTotals {
    const isFastFoodOrRestaurant = lineItem.source === 'Fast Food' || lineItem.source === 'Restaurant';
    const isPhysical = isPhysicalBasisUnit(lineItem.perType);
    
    // For Fast Food/Restaurant with physical units, base macros are per serving (quantity)
    // For others, derive base macros using perQuantityRaw
    if (isFastFoodOrRestaurant && isPhysical) {
      const divisor = lineItem.quantity > 0 ? lineItem.quantity : 1;
      return {
        calories: Math.round((lineItem.macros.calories / divisor) * 100) / 100,
        fatG: Math.round((lineItem.macros.fatG / divisor) * 100) / 100,
        sodiumMg: Math.round((lineItem.macros.sodiumMg / divisor) * 100) / 100,
        carbsG: Math.round((lineItem.macros.carbsG / divisor) * 100) / 100,
        fiberG: Math.round((lineItem.macros.fiberG / divisor) * 100) / 100,
        sugarG: Math.round((lineItem.macros.sugarG / divisor) * 100) / 100,
        proteinG: Math.round((lineItem.macros.proteinG / divisor) * 100) / 100,
      };
    }
    
    const perQuantity = parseQuantity(lineItem.perQuantityRaw ?? '1') ?? 1;
    const multiplier = perQuantity > 0 ? lineItem.quantity / perQuantity : 1;
    const divisor = multiplier > 0 ? multiplier : 1;

    return {
      calories: Math.round((lineItem.macros.calories / divisor) * 100) / 100,
      fatG: Math.round((lineItem.macros.fatG / divisor) * 100) / 100,
      sodiumMg: Math.round((lineItem.macros.sodiumMg / divisor) * 100) / 100,
      carbsG: Math.round((lineItem.macros.carbsG / divisor) * 100) / 100,
      fiberG: Math.round((lineItem.macros.fiberG / divisor) * 100) / 100,
      sugarG: Math.round((lineItem.macros.sugarG / divisor) * 100) / 100,
      proteinG: Math.round((lineItem.macros.proteinG / divisor) * 100) / 100,
    };
  }

  async function upsertEatingOutCatalogFromSession(items: MealLineItem[]) {
    for (const item of items) {
      const sourceType = mapMealSourceToCatalogType(item.source);
      if (!sourceType) continue;

      let chain = (item.chain ?? '').trim();
      let foodItem = (item.foodItem ?? '').trim();

      if ((!chain || !foodItem) && item.name.includes(' - ')) {
        const [chainPart, ...rest] = item.name.split(' - ');
        chain = chain || chainPart.trim();
        foodItem = foodItem || rest.join(' - ').trim();
      }

      if (!chain || !foodItem) continue;

      const existing = await findCatalogItemByKey(sourceType, chain, foodItem);
      if (existing) {
        await upsertFoodCatalogItem({
          id: existing.id,
          sourceType: existing.sourceType,
          chain: existing.chain,
          itemName: existing.itemName,
          basisQty: existing.basisQty,
          basisUnit: existing.basisUnit,
          calories: existing.calories,
          fatG: existing.fatG,
          sodiumMg: existing.sodiumMg,
          carbsG: existing.carbsG,
          fiberG: existing.fiberG,
          sugarG: existing.sugarG,
          proteinG: existing.proteinG,
        });
        continue;
      }

      const baseMacros = deriveBaseMacros(item);
      const basisQty = parseQuantity(item.perQuantityRaw ?? '1') ?? 1;
      const safeBasisQty = basisQty > 0 ? basisQty : 1;
      const basisUnit = item.perType || 'order';

      await upsertFoodCatalogItem({
        sourceType,
        chain,
        itemName: foodItem,
        basisQty: safeBasisQty,
        basisUnit,
        calories: baseMacros.calories,
        fatG: baseMacros.fatG,
        sodiumMg: baseMacros.sodiumMg,
        carbsG: baseMacros.carbsG,
        fiberG: baseMacros.fiberG,
        sugarG: baseMacros.sugarG,
        proteinG: baseMacros.proteinG,
      });
    }
  }

  async function handleCategoryChange(category: MealCategory) {
    if (!session) return;
    try {
      await updateMealSession(session.id, { category });
      setSession({ ...session, category });
    } catch (error) {
      console.error('[Dashboard] Failed to update category:', error);
    }
  }

  async function handleSourceChange(source: MealSource) {
    if (!session) return;
    try {
      await updateMealSession(session.id, { primarySource: source });
      setSession({ ...session, primarySource: source });
      const isEatingOut = source === 'Fast Food' || source === 'Restaurant';
      setFormData((prev) => ({
        ...prev,
        perQuantityUnit: isEatingOut ? (prev.perQuantityUnit ?? 'order') : undefined,
        chain: isEatingOut ? prev.chain : '',
        foodItem: isEatingOut ? prev.foodItem : '',
      }));
      setPerQuantityDirty(false);
    } catch (error) {
      console.error('[Dashboard] Failed to update source:', error);
    }
  }

  function handleFormChange(field: keyof FoodFormData, value: string) {
    if (field === 'perQuantityRaw') {
      setPerQuantityDirty(true);
    }
    setFormData({ ...formData, [field]: value });
  }

  function applyCatalogSelection(catalogItem: FoodCatalogItem) {
    setFormData((prev) => ({
      ...prev,
      chain: catalogItem.chain,
      foodItem: catalogItem.itemName,
      perQuantityUnit: (catalogItem.basisUnit as PerQuantityUnit) || prev.perQuantityUnit,
      perQuantityRaw: perQuantityDirty ? prev.perQuantityRaw : catalogItem.basisQty.toString(),
      calories: catalogItem.calories.toString(),
      fatG: catalogItem.fatG.toString(),
      sodiumMg: catalogItem.sodiumMg.toString(),
      carbsG: catalogItem.carbsG.toString(),
      fiberG: catalogItem.fiberG.toString(),
      sugarG: catalogItem.sugarG.toString(),
      proteinG: catalogItem.proteinG.toString(),
    }));
  }

  function handleFoodItemChange(nextValue: string) {
    setFormData((prev) => ({ ...prev, foodItem: nextValue }));
    const catalogSource = session ? mapMealSourceToCatalogType(session.primarySource) : null;
    if (!catalogSource) return;

    const chainNormalized = normalizeKey((formData.chain || '').trim());
    const itemNormalized = normalizeKey(nextValue);
    const match = foodCatalog.find((item) => {
      if (item.sourceType !== catalogSource) return false;
      if (normalizeKey(item.itemName) !== itemNormalized) return false;
      if (chainNormalized) return normalizeKey(item.chain) === chainNormalized;
      return true;
    });

    if (match) {
      applyCatalogSelection(match);
    }
  }

  function handleCatalogPick(item: FoodCatalogItem) {
    setPerQuantityDirty(false);
    setFormData((prev) => ({
      ...prev,
      chain: item.chain,
      foodItem: item.itemName,
      perQuantityUnit: (item.basisUnit as PerQuantityUnit) || prev.perQuantityUnit || 'order',
      perQuantityRaw: item.basisQty ? item.basisQty.toString() : '1',
      calories: item.calories.toString(),
      fatG: item.fatG.toString(),
      sodiumMg: item.sodiumMg.toString(),
      carbsG: item.carbsG.toString(),
      fiberG: item.fiberG.toString(),
      sugarG: item.sugarG.toString(),
      proteinG: item.proteinG.toString(),
      amountHaving: '1',
    }));
  }

  function handleBslChange(value: string) {
    if (currentBsl === '' && value !== '') {
      touchSessionTime();
    }
    setCurrentBsl(value);
  }

  async function handleAddFood(e?: React.FormEvent | React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    if (!session) return;

    setFormError(null);

    const source = session.primarySource;
    const isFastFoodOrRestaurant = source === 'Fast Food' || source === 'Restaurant';

    // Parse quantities
    const perQuantity = parseQuantity(formData.perQuantityRaw);
    const amountHaving = Number(formData.amountHaving);
    const servingSizeAmount = Number(formData.servingSizeAmount);

    // Validate based on Meal Source
    if (isFastFoodOrRestaurant) {
      if (!formData.chain.trim()) {
        setFormError('Please enter a chain name');
        return;
      }
      if (!formData.foodItem.trim()) {
        setFormError('Please enter a food item');
        return;
      }
      if (!formData.perQuantityUnit || !formData.perQuantityUnit.trim()) {
        setFormError('Please select a Per Qty Unit');
        return;
      }
    } else {
      if (!formData.name.trim()) {
        setFormError('Please enter a food name');
        return;
      }
      // Serving Size validation only for non-Fast Food/Restaurant
      if (isNaN(servingSizeAmount) || servingSizeAmount <= 0) {
        setFormError('Invalid "Serving Size"');
        return;
      }
    }

    if (perQuantity === null || perQuantity <= 0) {
      setFormError('Invalid "Per Quantity" - use decimal or fraction (e.g., 0.5 or 1/2)');
      return;
    }

    if (isNaN(amountHaving) || amountHaving <= 0) {
      setFormError('Invalid "Amount Having"');
      return;
    }

    // Parse base macros
    const baseMacros: MacroTotals = {
      calories: Number(formData.calories) || 0,
      fatG: Number(formData.fatG) || 0,
      sodiumMg: Number(formData.sodiumMg) || 0,
      carbsG: Number(formData.carbsG) || 0,
      fiberG: Number(formData.fiberG) || 0,
      sugarG: Number(formData.sugarG) || 0,
      proteinG: Number(formData.proteinG) || 0,
    };

    // Calculate macros for the amount having
    // For Fast Food/Restaurant with physical units (g, mL, oz, etc.), Amount Having = number of servings
    // For other units (burger, order, etc.), use the perQuantity division
    const isPhysical = isFastFoodOrRestaurant && isPhysicalBasisUnit(formData.perQuantityUnit);
    const multiplier = isPhysical ? amountHaving : (amountHaving / perQuantity);
    const calculatedMacros: MacroTotals = {
      calories: Math.round(baseMacros.calories * multiplier * 100) / 100,
      fatG: Math.round(baseMacros.fatG * multiplier * 100) / 100,
      sodiumMg: Math.round(baseMacros.sodiumMg * multiplier * 100) / 100,
      carbsG: Math.round(baseMacros.carbsG * multiplier * 100) / 100,
      fiberG: Math.round(baseMacros.fiberG * multiplier * 100) / 100,
      sugarG: Math.round(baseMacros.sugarG * multiplier * 100) / 100,
      proteinG: Math.round(baseMacros.proteinG * multiplier * 100) / 100,
    };

    try {
      // Build serving size and notes based on source
      let servingSize: string | undefined;
      let perType: string;
      let notes: string;
      
      if (isFastFoodOrRestaurant) {
        // For Fast Food/Restaurant: no servingSize, perType is perQuantityUnit
        servingSize = undefined;
        perType = formData.perQuantityUnit ?? 'order';
        notes = `${formData.perQuantityRaw} ${formData.perQuantityUnit ?? 'order'}`;
      } else {
        // For other sources: use servingSizeAmount/Unit, perType is perUnit
        servingSize = `${servingSizeAmount}${formData.servingSizeUnit}`;
        perType = formData.perUnit;
        notes = `${formData.perQuantityRaw} ${formData.perUnit}`;
      }
      
      // Build name based on source
      const itemName = isFastFoodOrRestaurant 
        ? `${formData.chain} - ${formData.foodItem}` 
        : formData.name;

      await addMealLineItem({
        sessionId: session.id,
        name: itemName,
        source: session.primarySource,
        chain: formData.chain.trim() || undefined,
        foodItem: formData.foodItem.trim() || undefined,
        quantity: amountHaving,
        macros: calculatedMacros,
        order: lineItems.length + 1,
        notes,
        servingSize,
        perQuantityRaw: formData.perQuantityRaw,
        perType,
      });

      // Optionally persist manual entry into the Eating Out library
      if (isFastFoodOrRestaurant && saveToCatalog) {
        const catalogType = mapMealSourceToCatalogType(source);
        const safeBasisQty = perQuantity > 0 ? perQuantity : 1;
        if (catalogType) {
          await upsertFoodCatalogItem({
            sourceType: catalogType,
            chain: formData.chain.trim(),
            itemName: formData.foodItem.trim(),
            basisQty: safeBasisQty,
            basisUnit: formData.perQuantityUnit || 'order',
            calories: baseMacros.calories,
            fatG: baseMacros.fatG,
            sodiumMg: baseMacros.sodiumMg,
            carbsG: baseMacros.carbsG,
            fiberG: baseMacros.fiberG,
            sugarG: baseMacros.sugarG,
            proteinG: baseMacros.proteinG,
          });
          loadFoodCatalog();
        }
      }

      await loadLineItems(session.id);
      setFormData(initialFormData);
      setPerQuantityDirty(false);
      setFormError(null);
      touchSessionTime();
    } catch (error) {
      console.error('[Dashboard] Failed to add food:', error);
      setFormError('Failed to add food item');
    }
  }

  function handleEditStart(item: MealLineItem) {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditQuantity('');
  }

  async function handleEditSave(item: MealLineItem) {
    const newQuantity = Number(editQuantity);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      alert('Invalid quantity');
      return;
    }

    try {
      // Recalculate macros based on new quantity
      const ratio = newQuantity / item.quantity;
      const newMacros: MacroTotals = {
        calories: Math.round(item.macros.calories * ratio * 100) / 100,
        fatG: Math.round(item.macros.fatG * ratio * 100) / 100,
        sodiumMg: Math.round(item.macros.sodiumMg * ratio * 100) / 100,
        carbsG: Math.round(item.macros.carbsG * ratio * 100) / 100,
        fiberG: Math.round(item.macros.fiberG * ratio * 100) / 100,
        sugarG: Math.round(item.macros.sugarG * ratio * 100) / 100,
        proteinG: Math.round(item.macros.proteinG * ratio * 100) / 100,
      };

      await updateMealLineItem(item.id, {
        quantity: newQuantity,
        macros: newMacros,
      });

      await loadLineItems(session!.id);
      handleEditCancel();
      touchSessionTime();
    } catch (error) {
      console.error('[Dashboard] Failed to update item:', error);
      alert('Failed to update item');
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm('Delete this item?')) return;

    try {
      await deleteMealLineItem(itemId);
      await loadLineItems(session!.id);
      touchSessionTime();
    } catch (error) {
      console.error('[Dashboard] Failed to delete item:', error);
      alert('Failed to delete item');
    }
  }

  async function handleSaveSession() {
    if (!session) return;
    
    // Don't save empty sessions
    if (lineItems.length === 0) {
      alert('Cannot save an empty meal session. Please add at least one food item.');
      return;
    }

    try {
      // Build complete session object with all current data
      const completeSession: MealSession = {
        ...session,
        timestamp: Date.now(),
        bsl: currentBsl ? Number(currentBsl) : undefined,
        sessionDate: sessionDate || undefined,
        sessionTime: sessionTime || undefined,
        lineItems: [...lineItems], // snapshot of current items
        totals: { ...totals }, // snapshot of current totals
        saved: true, // mark as saved
        notes: sessionNotes ?? '',
        createdAt: session.createdAt ?? Date.now(),
      };

      await saveMealSession(completeSession);
      await upsertEatingOutCatalogFromSession(lineItems);
      await loadFoodCatalog();
      
      // Clear the working state after successful save
      // Delete all line items for this session
      for (const item of lineItems) {
        await deleteMealLineItem(item.id);
      }
      
      // Reset line items display
      setLineItems([]);
      
      // Reset form to initial state
      setFormData(initialFormData);
      setPerQuantityDirty(false);
      
      // Clear BSL and notes
      setCurrentBsl('');
      setSessionNotes('');
      
      // Update timestamp for next meal
      touchSessionTime();

      // Refresh saved sessions for prior notes panel
      loadSavedSessions();
      
      alert('✓ Meal session saved successfully!');
    } catch (error) {
      console.error('[Dashboard] Failed to save session:', error);
      alert('Failed to save session. Please try again.');
    }
  }

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
    { calories: 0, fatG: 0, sodiumMg: 0, carbsG: 0, fiberG: 0, sugarG: 0, proteinG: 0 }
  );

  if (loading) {
    return (
      <div>
        <h2>Dashboard</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <h2>Dashboard</h2>
        <p>Failed to initialize session</p>
      </div>
    );
  }

  const isRecipeMode = session.primarySource === 'Recipe';
  const isEatingOut = session.primarySource === 'Fast Food' || session.primarySource === 'Restaurant';

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <div className="session-header-row">
        <div className="session-header-field">
          <label htmlFor="current-bsl">Current BSL:</label>
          <input
            type="number"
            id="current-bsl"
            value={currentBsl}
            onChange={(e) => handleBslChange(e.target.value)}
            placeholder="mg/dL"
            min="0"
            step="1"
          />
        </div>

        <div className="session-header-datetime">
          <div className="datetime-field">
            <label htmlFor="session-date">Date:</label>
            <input
              type="text"
              id="session-date"
              value={sessionDate}
              placeholder="mm/dd/yyyy"
              readOnly
            />
          </div>
          <div className="datetime-field">
            <label htmlFor="session-time">Time:</label>
            <input
              type="text"
              id="session-time"
              value={sessionTime}
              placeholder="h:mm AM/PM"
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="toolbarRow">
        <div className="control-group">
          <label htmlFor="meal-category">Meal Category:</label>
          <select
            id="meal-category"
            value={session.category}
            onChange={(e) => handleCategoryChange(e.target.value as MealCategory)}
          >
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="meal-source">Meal Source:</label>
          <select
            id="meal-source"
            value={session.primarySource}
            onChange={(e) => handleSourceChange(e.target.value as MealSource)}
          >
            <option value="Home Meal">Home Meal</option>
            <option value="Fast Food">Fast Food</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Recipe">Recipe</option>
            <option value="Packaged Meal">Packaged Meal</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="surface" style={{ marginBottom: '1rem' }}>
        <h3>Prior Meal Notes (last 3)</h3>
        {priorNotes.length === 0 ? (
          <p className="empty-message">No prior notes for this meal yet.</p>
        ) : (
          <div className="notes-list">
            {priorNotes.map((noteSession) => (
              <div key={noteSession.id} className="note-entry">
                <div className="note-meta">
                  <span>{noteSession.sessionDate || '—'}</span>
                  <span>{noteSession.sessionTime || ''}</span>
                  <span>{noteSession.primarySource}</span>
                </div>
                <div className="note-text">{noteSession.notes || ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isRecipeMode ? (
        <RecipeBuilder
          sessionId={session.id}
          onAfterAdd={async () => {
            await loadLineItems(session.id);
            touchSessionTime();
          }}
          onIngredientAdd={() => {
            touchSessionTime();
          }}
        />
      ) : (
        <form 
          className="food-form surface" 
          onSubmit={(e) => e.preventDefault()} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
              e.preventDefault();
              handleAddFood();
            }
          }}
          noValidate
        >
        <h3>Add Food Item</h3>

        {formError && <div className="form-error">{formError}</div>}

        {/* Conditional form rendering based on Meal Source */}
        {isEatingOut ? (
          // Fast Food / Restaurant: Chain, Food Item, Per Quantity, Per Qty Unit (NO Serving Size)
          <div className="form-row food-top-row food-top-row-fastfood">
            <div className="form-field">
              <label htmlFor="chain">Chain *</label>
              <input
                type="text"
                id="chain"
                value={formData.chain}
                onChange={(e) => handleFormChange('chain', e.target.value)}
                placeholder="ex: Chick-fil-A"
                list="chain-options"
                aria-required="true"
              />
            </div>

            <div className="form-field">
              <label htmlFor="food-item">Food Item *</label>
              <input
                type="text"
                id="food-item"
                value={formData.foodItem}
                onChange={(e) => handleFoodItemChange(e.target.value)}
                placeholder="ex: Nuggets"
                list="food-item-options"
                aria-required="true"
              />
            </div>

            <div className="form-field form-field-small">
              <label htmlFor="per-quantity">Per Quantity *</label>
              <input
                type="text"
                id="per-quantity"
                value={formData.perQuantityRaw}
                onChange={(e) => handleFormChange('perQuantityRaw', e.target.value)}
                placeholder="1 or 2/3"
                title="Enter decimal or fraction (e.g., 1, 0.5, 1/2, 2 1/3)"
                aria-required="true"
              />
            </div>

            <div className="form-field form-field-small">
              <label htmlFor="per-qty-unit">Per Qty Unit *</label>
              <select
                id="per-qty-unit"
                value={formData.perQuantityUnit ?? 'order'}
                onChange={(e) => handleFormChange('perQuantityUnit', e.target.value as PerQuantityUnit)}
                aria-required="true"
              >
                {perQuantityUnitOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          // Home Meal, Packaged Meal, Custom: Standard form with Per Unit
          <div className="form-row food-top-row">
            <div className="form-field">
              <label htmlFor="food-name">Food Name *</label>
              <input
                type="text"
                id="food-name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                aria-required="true"
              />
            </div>

            <div className="form-field form-field-small">
              <label htmlFor="serving-size">Serving Size *</label>
              <div className="serving-size-controls">
                <input
                  type="number"
                  id="serving-size"
                  value={formData.servingSizeAmount}
                  onChange={(e) => handleFormChange('servingSizeAmount', e.target.value)}
                  min="0"
                  step="any"
                  aria-required="true"
                />
                <select
                  value={formData.servingSizeUnit}
                  onChange={(e) => handleFormChange('servingSizeUnit', e.target.value)}
                  aria-label="Serving size unit"
                >
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="fl oz">fl oz</option>
                  <option value="oz">oz</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>

            <div className="form-field form-field-small">
              <label htmlFor="per-quantity">Per Quantity *</label>
              <input
                type="text"
                id="per-quantity"
                value={formData.perQuantityRaw}
                onChange={(e) => handleFormChange('perQuantityRaw', e.target.value)}
                placeholder="1 or 2/3"
                title="Enter decimal or fraction (e.g., 1, 0.5, 1/2, 2 1/3)"
                aria-required="true"
              />
            </div>

            <div className="form-field form-field-small">
              <label htmlFor="per-unit">Per Unit *</label>
              <select
                id="per-unit"
                value={formData.perUnit}
                onChange={(e) => handleFormChange('perUnit', e.target.value)}
                aria-required="true"
              >
                {perUnitOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isEatingOut && (
          <div className="eo-picker">
            <div className="eo-picker-header">Pick from Eating Out Library</div>
            <div className="eo-picker-controls">
              <div className="form-field">
                <label htmlFor="eo-chain-filter">Chain Filter</label>
                <select
                  id="eo-chain-filter"
                  value={catalogChainFilter}
                  onChange={(e) => setCatalogChainFilter(e.target.value)}
                >
                  <option value="">All Chains</option>
                  {chainOptions.map((chain) => (
                    <option key={chain} value={chain}>
                      {chain}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="eo-search">Search (chain or item)</label>
                <input
                  id="eo-search"
                  type="search"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="e.g., burrito or Chipotle"
                />
              </div>
            </div>

            {filteredCatalogItems.length > 0 ? (
              <div className="eo-picker-results" role="list">
                {filteredCatalogItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="eo-picker-row"
                    onClick={() => handleCatalogPick(item)}
                    role="listitem"
                  >
                    <div className="eo-row-main">
                      <span className="eo-chain">{item.chain}</span>
                      <span className="eo-separator">•</span>
                      <span className="eo-item">{item.itemName}</span>
                    </div>
                    <div className="eo-row-sub">
                      <span>
                        Basis: {item.basisQty} {item.basisUnit}
                      </span>
                      <span className="eo-dot">•</span>
                      <span>Carbs {item.carbsG}g</span>
                      <span className="eo-dot">•</span>
                      <span>Calories {item.calories}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-message" style={{ margin: '0.25rem 0 0' }}>
                No matches in library.
              </p>
            )}
          </div>
        )}

        <datalist id="chain-options">
          {chainOptions.map((chain) => (
            <option key={chain} value={chain} />
          ))}
        </datalist>
        <datalist id="food-item-options">
          {foodItemOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <div className="form-row">
          <div className="form-field form-field-small">
            <label htmlFor="calories">Calories</label>
            <input
              type="number"
              id="calories"
              value={formData.calories}
              onChange={(e) => handleFormChange('calories', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field form-field-small">
            <label htmlFor="fat">Fat (g)</label>
            <input
              type="number"
              id="fat"
              value={formData.fatG}
              onChange={(e) => handleFormChange('fatG', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field form-field-small">
            <label htmlFor="sodium">Sodium (mg)</label>
            <input
              type="number"
              id="sodium"
              value={formData.sodiumMg}
              onChange={(e) => handleFormChange('sodiumMg', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field form-field-small">
            <label htmlFor="carbs">Carbs (g)</label>
            <input
              type="number"
              id="carbs"
              value={formData.carbsG}
              onChange={(e) => handleFormChange('carbsG', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field form-field-small">
            <label htmlFor="fiber">Fiber (g)</label>
            <input
              type="number"
              id="fiber"
              value={formData.fiberG}
              onChange={(e) => handleFormChange('fiberG', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field form-field-small">
            <label htmlFor="sugar">Sugar (g)</label>
            <input
              type="number"
              id="sugar"
              value={formData.sugarG}
              onChange={(e) => handleFormChange('sugarG', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field form-field-small">
            <label htmlFor="protein">Protein (g)</label>
            <input
              type="number"
              id="protein"
              value={formData.proteinG}
              onChange={(e) => handleFormChange('proteinG', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field form-field-small">
            <label htmlFor="amount-having">Amount Having *</label>
            <input
              type="number"
              id="amount-having"
              value={formData.amountHaving}
              onChange={(e) => handleFormChange('amountHaving', e.target.value)}
              min="0"
              step="0.01"
              aria-required="true"
            />
          </div>

          {isEatingOut && (
            <div className="form-field form-field-small" style={{ alignSelf: 'flex-end' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={saveToCatalog}
                  onChange={(e) => setSaveToCatalog(e.target.checked)}
                />
                Save manual entry to Eating Out Library
              </label>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={handleAddFood}>
              Add to Meal Log
            </button>
          </div>
        </div>
      </form>
      )}

      <div className="meal-log surface">
        <h3>Logged Food Items</h3>
        {lineItems.length === 0 ? (
          <p className="empty-message">No items logged yet. Add food items above.</p>
        ) : (
          <div className="table-container">
            <table className="food-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Size</th>
                  <th>Calories</th>
                  <th>Fat (g)</th>
                  <th>Sodium (mg)</th>
                  <th>Carbs (g)</th>
                  <th>Fiber (g)</th>
                  <th>Sugar (g)</th>
                  <th>Protein (g)</th>
                  <th>Qty Having</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => {
                  // Determine display format based on source
                  let sizeDisplay: string;
                  if (item.source === 'Fast Food' || item.source === 'Restaurant') {
                    // Fast Food/Restaurant: show "1 burger (x 2)" format if quantity > 1
                    const qty = item.perQuantityRaw || '1';
                    const unit = item.perType || 'order'; // fallback to 'order' for older entries
                    const amountDisplay = item.quantity !== 1 ? ` (x ${item.quantity})` : '';
                    sizeDisplay = `${qty} ${unit}${amountDisplay}`;
                  } else {
                    // Other sources: show serving size with per quantity info
                    sizeDisplay = item.servingSize 
                      ? `${item.servingSize} (per ${item.perQuantityRaw || '1'} ${item.perType || 'serving'})` 
                      : (item.notes || '-');
                  }
                  return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="size-cell">{sizeDisplay}</td>
                    <td className="num-cell">{formatNutrient(item.macros.calories, 'calories')}</td>
                    <td className="num-cell">{formatNutrient(item.macros.fatG, 'fat')}</td>
                    <td className="num-cell">{formatNutrient(item.macros.sodiumMg, 'sodium')}</td>
                    <td className="num-cell">{formatNutrient(item.macros.carbsG, 'carbs')}</td>
                    <td className="num-cell">{formatNutrient(item.macros.fiberG, 'fiber')}</td>
                    <td className="num-cell">{formatNutrient(item.macros.sugarG, 'sugar')}</td>
                    <td className="num-cell">{formatNutrient(item.macros.proteinG, 'protein')}</td>
                    <td className="num-cell">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="inline-edit"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                      ) : (
                        item.quantity.toFixed(2)
                      )}
                    </td>
                    <td className="actions-cell">
                      {editingId === item.id ? (
                        <>
                          <button
                            className="btn-small btn-save"
                            onClick={() => handleEditSave(item)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-small btn-cancel"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-small btn-edit"
                            onClick={() => handleEditStart(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-delete"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={2}><strong>TOTALS</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.calories, 'calories')}</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.fatG, 'fat')}</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.sodiumMg, 'sodium')}</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.carbsG, 'carbs')}</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.fiberG, 'fiber')}</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.sugarG, 'sugar')}</strong></td>
                  <td className="num-cell"><strong>{formatNutrient(totals.proteinG, 'protein')}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="surface" style={{ marginTop: '1rem' }}>
        <label htmlFor="post-meal-notes" className="notes-label">Post Meal Notes</label>
        <textarea
          id="post-meal-notes"
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Last time: 60/40 over 1 hr, spiked to 280. Next time try 50/50."
          rows={3}
        />
      </div>

      <div className="session-actions">
        <button className="btn-primary" onClick={handleSaveSession}>
          Save Meal Session
        </button>
      </div>
    </div>
  );
}
