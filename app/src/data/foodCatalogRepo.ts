import { openDb, deleteOne, type FoodCatalogRecord } from './db';
import { newId } from '../utils/id';
import type { EatingOutSourceType, FoodCatalogItem } from '../types/foodCatalog';

const STORE_NAME = 'foodCatalog';

export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildKey(sourceType: EatingOutSourceType, chain: string, itemName: string): string {
  return `${sourceType}|${normalizeKey(chain)}|${normalizeKey(itemName)}`;
}

function toCatalogItem(record: FoodCatalogRecord): FoodCatalogItem {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key: _key, chainNormalized: _chainNormalized, itemNormalized: _itemNormalized, ...rest } = record;
  return rest;
}

export async function listFoodCatalogItems(): Promise<FoodCatalogItem[]> {
  const db = await openDb();
  const records = (await db.getAll(STORE_NAME)) as FoodCatalogRecord[];
  return records
    .map((r) => toCatalogItem(r))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function searchFoodCatalogItems(params: {
  sourceType?: EatingOutSourceType;
  chain?: string;
  query?: string;
}): Promise<FoodCatalogItem[]> {
  const db = await openDb();
  const records = (await db.getAll(STORE_NAME)) as FoodCatalogRecord[];
  const queryNormalized = params.query ? normalizeKey(params.query) : '';
  const chainNormalized = params.chain ? normalizeKey(params.chain) : '';

  return records
    .filter((r) => (params.sourceType ? r.sourceType === params.sourceType : true))
    .filter((r) => (chainNormalized ? r.chainNormalized === chainNormalized : true))
    .filter((r) =>
      queryNormalized
        ? r.chainNormalized.includes(queryNormalized) || r.itemNormalized.includes(queryNormalized)
        : true
    )
    .map((r) => toCatalogItem(r))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function findByKey(
  sourceType: EatingOutSourceType,
  chain: string,
  itemName: string
): Promise<FoodCatalogItem | null> {
  const db = await openDb();
  const key = buildKey(sourceType, chain, itemName);
  const index = db.transaction(STORE_NAME, 'readonly').store.index('key');
  const record = (await index.get(key)) as FoodCatalogRecord | undefined;
  return record ? toCatalogItem(record) : null;
}

export async function upsertFoodCatalogItem(
  item: Omit<FoodCatalogItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<FoodCatalogItem> {
  const now = Date.now();
  const chainNormalized = normalizeKey(item.chain);
  const itemNormalized = normalizeKey(item.itemName);
  const key = buildKey(item.sourceType, item.chain, item.itemName);

  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;

  const existingByKey = (await store.index('key').get(key)) as FoodCatalogRecord | undefined;
  const existingById = item.id ? ((await store.get(item.id)) as FoodCatalogRecord | undefined) : undefined;
  const target = existingById ?? existingByKey;

  const id = target?.id ?? item.id ?? newId('catalog');
  const createdAt = target?.createdAt ?? now;

  const record: FoodCatalogRecord = {
    ...target,
    ...item,
    id,
    createdAt,
    updatedAt: now,
    key,
    chainNormalized,
    itemNormalized,
  } as FoodCatalogRecord;

  await store.put(record as never);
  await tx.done;

  return toCatalogItem(record);
}

export async function deleteFoodCatalogItem(id: string): Promise<void> {
  await deleteOne(STORE_NAME, id);
}

export async function upsertFoodCatalogItems(
  items: Array<Omit<FoodCatalogItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>
): Promise<FoodCatalogItem[]> {
  const results: FoodCatalogItem[] = [];
  for (const item of items) {
    const saved = await upsertFoodCatalogItem(item);
    results.push(saved);
  }
  return results;
}

// Convenience aliases matching feature wording
export async function addEatingOutItem(
  item: Omit<FoodCatalogItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FoodCatalogItem> {
  return upsertFoodCatalogItem(item);
}

export async function listEatingOutItems(): Promise<FoodCatalogItem[]> {
  return listFoodCatalogItems();
}
