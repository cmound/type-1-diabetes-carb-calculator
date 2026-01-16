import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { upsertFoodCatalogItems } from '../data/foodCatalogRepo';
import { storage } from '../storage';
import type { FoodCatalogItem, EatingOutSourceType } from '../types/foodCatalog';
import './EatingOut.css';

const basisUnitOptions = [
  'burger',
  'sandwich',
  'taco',
  'wrap',
  'order',
  'basket',
  'drink',
  'cup',
  'piece',
  'slice',
  'packet',
  'oz',
  'g',
  'mL',
];

type CsvMapping = {
  chain: string | null;
  itemName: string | null;
  servingSize: string | null;
  calories: string | null;
  fatG: string | null;
  sodiumMg: string | null;
  carbsG: string | null;
  fiberG: string | null;
  sugarG: string | null;
  proteinG: string | null;
};

type CanonicalImportItem = {
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
};

interface HeaderOption {
  raw: string;
  normalized: string;
}

const requiredFields: Array<keyof CsvMapping> = ['chain', 'itemName', 'servingSize'];

const fieldSynonyms: Record<keyof CsvMapping, string[]> = {
  chain: ['chain', 'restaurant', 'brand', 'vendor', 'place'],
  itemName: ['food item', 'item', 'menu item', 'product', 'name', 'food'],
  servingSize: ['serving size', 'serving', 'size', 'grams', 'g'],
  calories: ['calories', 'kcal', 'cal'],
  fatG: ['fat', 'fat g', 'total fat'],
  sodiumMg: ['sodium', 'sodium mg', 'salt', 'salt mg'],
  carbsG: ['carbs', 'carbohydrates', 'carb g', 'carbs g'],
  fiberG: ['fiber', 'fibre', 'fiber g'],
  sugarG: ['sugar', 'sugars', 'sugar g'],
  proteinG: ['protein', 'protein g'],
};

function normalizeHeaderName(header: string): string {
  return header
    .toLowerCase()
    .replace(/[()/_.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function autoDetectMapping(headers: HeaderOption[]): CsvMapping {
  const mapping: CsvMapping = {
    chain: null,
    itemName: null,
    servingSize: null,
    calories: null,
    fatG: null,
    sodiumMg: null,
    carbsG: null,
    fiberG: null,
    sugarG: null,
    proteinG: null,
  };

  for (const header of headers) {
    (Object.keys(mapping) as Array<keyof CsvMapping>).forEach((field) => {
      if (mapping[field]) return;
      const targetSynonyms = fieldSynonyms[field];
      for (const syn of targetSynonyms) {
        if (header.normalized === syn || header.normalized.includes(syn)) {
          mapping[field] = header.normalized;
          break;
        }
      }
    });
  }

  return mapping;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  return 0;
}

type FilterType = 'ALL' | EatingOutSourceType;

interface FormState {
  sourceType: EatingOutSourceType;
  chain: string;
  itemName: string;
  basisQty: string;
  basisUnit: string;
  calories: string;
  fatG: string;
  sodiumMg: string;
  carbsG: string;
  fiberG: string;
  sugarG: string;
  proteinG: string;
}

const initialFormState: FormState = {
  sourceType: 'FAST_FOOD',
  chain: '',
  itemName: '',
  basisQty: '1',
  basisUnit: 'burger',
  calories: '0',
  fatG: '0',
  sodiumMg: '0',
  carbsG: '0',
  fiberG: '0',
  sugarG: '0',
  proteinG: '0',
};

function toFormState(item: FoodCatalogItem): FormState {
  return {
    sourceType: item.sourceType,
    chain: item.chain,
    itemName: item.itemName,
    basisQty: item.basisQty.toString(),
    basisUnit: item.basisUnit,
    calories: item.calories.toString(),
    fatG: item.fatG.toString(),
    sodiumMg: item.sodiumMg.toString(),
    carbsG: item.carbsG.toString(),
    fiberG: item.fiberG.toString(),
    sugarG: item.sugarG.toString(),
    proteinG: item.proteinG.toString(),
  };
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? (Math.round(value * 10) / 10).toString() : '0';
}

type SortField = 'sourceType' | 'chain' | 'itemName' | 'basisQty' | 'calories' | 'fatG' | 'sodiumMg' | 'carbsG' | 'fiberG' | 'sugarG' | 'proteinG';
type SortDirection = 'asc' | 'desc';
type ColumnWidths = Record<string, string>;

const COLUMN_WIDTHS_KEY = 'eatingOutColumnWidths';
const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  sourceType: '120px',
  chain: '150px',
  itemName: '200px',
  basis: '100px',
  calories: '100px',
  fatG: '80px',
  sodiumMg: '100px',
  carbsG: '80px',
  fiberG: '80px',
  sugarG: '80px',
  proteinG: '100px',
  actions: '150px',
};

function loadColumnWidths(): ColumnWidths {
  try {
    const stored = localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (stored) {
      return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLUMN_WIDTHS;
}

function saveColumnWidths(widths: ColumnWidths) {
  try {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
  } catch {
    // ignore
  }
}

export function EatingOut() {
  const [items, setItems] = useState<FoodCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('chain');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(loadColumnWidths());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodCatalogItem | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSourceType, setImportSourceType] = useState<EatingOutSourceType>('FAST_FOOD');
  const [importHeaders, setImportHeaders] = useState<HeaderOption[]>([]);
  const [importMapping, setImportMapping] = useState<CsvMapping>(autoDetectMapping([]));
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      if (sortField === 'sourceType') {
        valA = a.sourceType;
        valB = b.sourceType;
      } else if (sortField === 'chain') {
        valA = a.chain.toLowerCase();
        valB = b.chain.toLowerCase();
      } else if (sortField === 'itemName') {
        valA = a.itemName.toLowerCase();
        valB = b.itemName.toLowerCase();
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortField, sortDirection]);

  useEffect(() => {
    loadItems();
  }, [filter, searchTerm]);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const results = await storage.listEatingOutItems();
      setItems(results as FoodCatalogItem[]);
    } catch (err) {
      console.error('[EatingOut] Failed to load items', err);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingItem(null);
    setFormState(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(item: FoodCatalogItem) {
    setEditingItem(item);
    setFormState(toFormState(item));
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setFormError(null);
    setEditingItem(null);
  }

  function handleFieldChange<K extends keyof FormState>(field: K, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const chain = formState.chain.trim();
    const itemName = formState.itemName.trim();
    const basisQty = Number(formState.basisQty);
    const basisUnit = formState.basisUnit.trim();

    if (!chain) {
      setFormError('Chain is required');
      return;
    }
    if (!itemName) {
      setFormError('Item name is required');
      return;
    }
    if (!basisUnit) {
      setFormError('Basis unit is required');
      return;
    }
    if (!Number.isFinite(basisQty) || basisQty <= 0) {
      setFormError('Basis quantity must be greater than 0');
      return;
    }

    const now = Date.now();
    const parsed = typeof editingItem?.createdAt === 'string' ? Date.parse(editingItem.createdAt) : NaN;
    const createdAt =
      typeof editingItem?.createdAt === 'number'
        ? editingItem.createdAt
        : Number.isFinite(parsed)
          ? parsed
          : now;
    const updatedAt = now;

    const payload: FoodCatalogItem = {
      id: editingItem?.id || crypto.randomUUID(),
      sourceType: formState.sourceType,
      chain,
      itemName,
      basisQty,
      basisUnit,
      calories: Number(formState.calories) || 0,
      fatG: Number(formState.fatG) || 0,
      sodiumMg: Number(formState.sodiumMg) || 0,
      carbsG: Number(formState.carbsG) || 0,
      fiberG: Number(formState.fiberG) || 0,
      sugarG: Number(formState.sugarG) || 0,
      proteinG: Number(formState.proteinG) || 0,
      createdAt,
      updatedAt,
    };

    try {
      setSaving(true);
      await storage.updateEatingOutItem(payload);
      await loadItems();
      closeModal();
    } catch (err) {
      console.error('[EatingOut] Failed to save item', err);
      setFormError('Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      setDeletingId(id);
      await storage.deleteEatingOutItem(id);
      await loadItems();
    } catch (err) {
      console.error('[EatingOut] Failed to delete item', err);
      setError('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  }

  function openImportModal() {
    setIsImportModalOpen(true);
    setImportError(null);
    setImportSummary(null);
    setImportFileName('');
    setParsedRows([]);
    setImportHeaders([]);
    setImportMapping(autoDetectMapping([]));
  }

  function closeImportModal() {
    setIsImportModalOpen(false);
    setImporting(false);
  }

  function handleResizeStart(column: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = columnWidths[column] || '100px';
    const startWidth = parseInt(currentWidth, 10);
    const startX = e.clientX;
    const minWidth = column === 'itemName' ? 120 : 70;
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, Math.min(600, startWidth + delta));
      setColumnWidths((prev) => {
        const updated = { ...prev, [column]: `${newWidth}px` };
        saveColumnWidths(updated);
        return updated;
      });
    };
    
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handleResetColumnWidths() {
    localStorage.removeItem(COLUMN_WIDTHS_KEY);
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
  }

  function handleMappingChange(field: keyof CsvMapping, value: string) {
    setImportMapping((prev) => ({ ...prev, [field]: value || null }));
  }

  function mapRowToCanonical(row: Record<string, unknown>): CanonicalImportItem | null {
    if (!importMapping.chain || !importMapping.itemName || !importMapping.servingSize) return null;

    const readField = (key: string | null) => {
      const raw = key ? row[key] : undefined;
      if (raw === null || raw === undefined) return '';
      return String(raw);
    };

    const chain = readField(importMapping.chain).trim();
    const itemName = readField(importMapping.itemName).trim();
    const basisQty = Number(readField(importMapping.servingSize));

    if (!chain || !itemName) return null;
    if (!Number.isFinite(basisQty) || basisQty <= 0) return null;

    return {
      sourceType: importSourceType,
      chain,
      itemName,
      basisQty,
      basisUnit: 'g',
      calories: toNumber(readField(importMapping.calories)),
      fatG: toNumber(readField(importMapping.fatG)),
      sodiumMg: toNumber(readField(importMapping.sodiumMg)),
      carbsG: toNumber(readField(importMapping.carbsG)),
      fiberG: toNumber(readField(importMapping.fiberG)),
      sugarG: toNumber(readField(importMapping.sugarG)),
      proteinG: toNumber(readField(importMapping.proteinG)),
    };
  }

  async function handleFileSelected(file: File | null) {
    if (!file) {
      setImportHeaders([]);
      setParsedRows([]);
      setImportFileName('');
      return;
    }

    try {
      const text = await file.text();
      const headerPreview = Papa.parse<string[]>(text, { preview: 1 });
      const firstRow: string[] = (headerPreview.data?.[0] as string[]) || [];
      const headers: HeaderOption[] = firstRow
        .map((raw: string) => ({ raw: String(raw ?? ''), normalized: normalizeHeaderName(String(raw ?? '')) }))
        .filter((h: HeaderOption) => h.normalized);

      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => normalizeHeaderName(header),
      });

      if (parsed.errors && parsed.errors.length > 0) {
        console.error('[EatingOut] CSV parse errors', parsed.errors);
        setImportError('Failed to parse CSV. Please check formatting.');
        return;
      }

      setImportHeaders(headers);
      setParsedRows(parsed.data || []);
      setImportMapping(autoDetectMapping(headers));
      setImportFileName(file.name);
      setImportSummary(null);
      setImportError(null);
    } catch (err) {
      console.error('[EatingOut] Failed to read file', err);
      setImportError('Failed to read file');
    }
  }

  async function handleImportSubmit() {
    if (requiredFields.some((field) => !importMapping[field])) {
      setImportError('Please map Chain, Food Item, and Serving Size.');
      return;
    }
    if (parsedRows.length === 0) {
      setImportError('No rows to import.');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const canonicalItems: CanonicalImportItem[] = [];
      for (const row of parsedRows) {
        const item = mapRowToCanonical(row);
        if (item) {
          canonicalItems.push(item);
        }
      }

      const skipped = parsedRows.length - canonicalItems.length;

      if (canonicalItems.length > 0) {
        await upsertFoodCatalogItems(
          canonicalItems.map((c) => ({
            sourceType: c.sourceType,
            chain: c.chain,
            itemName: c.itemName,
            basisQty: c.basisQty,
            basisUnit: c.basisUnit,
            calories: c.calories,
            fatG: c.fatG,
            sodiumMg: c.sodiumMg,
            carbsG: c.carbsG,
            fiberG: c.fiberG,
            sugarG: c.sugarG,
            proteinG: c.proteinG,
          }))
        );
        await loadItems();
      }

      setImportSummary({ imported: canonicalItems.length, skipped });
    } catch (err) {
      console.error('[EatingOut] Import failed', err);
      setImportError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  const hasResults = sortedItems.length > 0;
  const requiredMissing = requiredFields.some((field) => !importMapping[field]);
  const previewRows = parsedRows.slice(0, 3);

  return (
    <div className="eating-out-page">
      <h2>Fast Food / Restaurants Library</h2>

      <div className="toolbarRow">
        <div className="control-group">
          <label htmlFor="source-filter">Source Type</label>
          <select
            id="source-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
          >
            <option value="ALL">All</option>
            <option value="FAST_FOOD">Fast Food</option>
            <option value="RESTAURANT">Restaurant</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chain or item"
          />
        </div>

        <div className="control-group">
          <label htmlFor="sort-field">Sort By</label>
          <select id="sort-field" value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
            <option value="chain">Chain</option>
            <option value="itemName">Item Name</option>
            <option value="sourceType">Source Type</option>
            <option value="basisQty">Basis Qty</option>
            <option value="calories">Calories</option>
            <option value="fatG">Fat</option>
            <option value="sodiumMg">Sodium</option>
            <option value="carbsG">Carbs</option>
            <option value="fiberG">Fiber</option>
            <option value="sugarG">Sugar</option>
            <option value="proteinG">Protein</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="sort-direction">Direction</label>
          <select id="sort-direction" value={sortDirection} onChange={(e) => setSortDirection(e.target.value as SortDirection)}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        <div className="control-group">
          <label>&nbsp;</label>
          <button className="btn-secondary" onClick={handleResetColumnWidths}>
            Reset Column Widths
          </button>
        </div>

        <div className="spacer" />

        <button className="btn-secondary" onClick={openImportModal}>
          Import CSV
        </button>
        <button className="btn-primary" onClick={openAddModal}>
          Add Item
        </button>
      </div>

      <div className="surface">
        {error && <div className="form-error" role="alert">{error}</div>}

        {loading ? (
          <p className="empty-message">Loading...</p>
        ) : !hasResults ? (
          <p className="empty-message">No items found.</p>
        ) : (
          <div className="table-container">
            <table className="food-table">
              <colgroup>
                <col style={{ width: columnWidths.sourceType }} />
                <col style={{ width: columnWidths.chain }} />
                <col style={{ width: columnWidths.itemName }} />
                <col style={{ width: columnWidths.basis }} />
                <col style={{ width: columnWidths.calories }} />
                <col style={{ width: columnWidths.fatG }} />
                <col style={{ width: columnWidths.sodiumMg }} />
                <col style={{ width: columnWidths.carbsG }} />
                <col style={{ width: columnWidths.fiberG }} />
                <col style={{ width: columnWidths.sugarG }} />
                <col style={{ width: columnWidths.proteinG }} />
                <col style={{ width: columnWidths.actions }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    Source
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('sourceType', e)} />
                  </th>
                  <th>
                    Chain
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('chain', e)} />
                  </th>
                  <th className="eo-itemCol">
                    Item
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('itemName', e)} />
                  </th>
                  <th>
                    Basis
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('basis', e)} />
                  </th>
                  <th className="num">
                    Calories
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('calories', e)} />
                  </th>
                  <th className="num">
                    Fat
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('fatG', e)} />
                  </th>
                  <th className="num">
                    Sodium
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('sodiumMg', e)} />
                  </th>
                  <th className="num">
                    Carbs
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('carbsG', e)} />
                  </th>
                  <th className="num">
                    Fiber
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('fiberG', e)} />
                  </th>
                  <th className="num">
                    Sugar
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('sugarG', e)} />
                  </th>
                  <th className="num">
                    Protein
                    <span className="eo-resizer" onPointerDown={(e) => handleResizeStart('proteinG', e)} />
                  </th>
                  <th className="eo-actionsCol">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.sourceType === 'FAST_FOOD' ? 'Fast Food' : 'Restaurant'}</td>
                    <td>{item.chain}</td>
                    <td className="eo-td eo-itemCol" title={item.itemName}>{item.itemName}</td>
                    <td>{`${item.basisQty} ${item.basisUnit}`}</td>
                    <td className="num">{formatNumber(item.calories)}</td>
                    <td className="num">{formatNumber(item.fatG)}</td>
                    <td className="num">{formatNumber(item.sodiumMg)}</td>
                    <td className="num">{formatNumber(item.carbsG)}</td>
                    <td className="num">{formatNumber(item.fiberG)}</td>
                    <td className="num">{formatNumber(item.sugarG)}</td>
                    <td className="num">{formatNumber(item.proteinG)}</td>
                    <td className="actions-cell eo-actionsCol">
                      <button className="btn-small btn-edit" onClick={() => openEditModal(item)}>
                        Edit
                      </button>
                      <button
                        className="btn-small btn-delete"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Item' : 'Add Item'}</h3>
              <button className="btn-small" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {formError && <div className="form-error" role="alert">{formError}</div>}

            <div className="modal-grid">
              <label>
                Source Type
                <select
                  value={formState.sourceType}
                  onChange={(e) => handleFieldChange('sourceType', e.target.value as EatingOutSourceType)}
                >
                  <option value="FAST_FOOD">Fast Food</option>
                  <option value="RESTAURANT">Restaurant</option>
                </select>
              </label>

              <label>
                Chain
                <input
                  type="text"
                  value={formState.chain}
                  onChange={(e) => handleFieldChange('chain', e.target.value)}
                  placeholder="ex: Chick-fil-A"
                />
              </label>

              <label>
                Item Name
                <input
                  type="text"
                  value={formState.itemName}
                  onChange={(e) => handleFieldChange('itemName', e.target.value)}
                  placeholder="ex: Nuggets"
                />
              </label>

              <label>
                Basis Quantity
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.basisQty}
                  onChange={(e) => handleFieldChange('basisQty', e.target.value)}
                />
              </label>

              <label>
                Basis Unit
                <select
                  value={formState.basisUnit}
                  onChange={(e) => handleFieldChange('basisUnit', e.target.value)}
                >
                  {basisUnitOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Calories
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.calories}
                  onChange={(e) => handleFieldChange('calories', e.target.value)}
                />
              </label>

              <label>
                Fat (g)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.fatG}
                  onChange={(e) => handleFieldChange('fatG', e.target.value)}
                />
              </label>

              <label>
                Sodium (mg)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.sodiumMg}
                  onChange={(e) => handleFieldChange('sodiumMg', e.target.value)}
                />
              </label>

              <label>
                Carbs (g)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.carbsG}
                  onChange={(e) => handleFieldChange('carbsG', e.target.value)}
                />
              </label>

              <label>
                Fiber (g)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.fiberG}
                  onChange={(e) => handleFieldChange('fiberG', e.target.value)}
                />
              </label>

              <label>
                Sugar (g)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.sugarG}
                  onChange={(e) => handleFieldChange('sugarG', e.target.value)}
                />
              </label>

              <label>
                Protein (g)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.proteinG}
                  onChange={(e) => handleFieldChange('proteinG', e.target.value)}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal import-modal">
            <div className="modal-header">
              <h3>Import CSV</h3>
              <button className="btn-small" onClick={closeImportModal} aria-label="Close">
                ✕
              </button>
            </div>

            {importError && <div className="form-error" role="alert">{importError}</div>}
            {importSummary && (
              <div className="import-summary">
                Imported {importSummary.imported} rows, Skipped {importSummary.skipped}
              </div>
            )}

            <div className="import-grid">
              <label className="import-control">
                CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => handleFileSelected(e.target.files ? e.target.files[0] : null)}
                />
                {importFileName && <span className="file-name">{importFileName}</span>}
              </label>

              <label className="import-control">
                Source Type (applies to all rows)
                <select
                  value={importSourceType}
                  onChange={(e) => setImportSourceType(e.target.value as EatingOutSourceType)}
                >
                  <option value="FAST_FOOD">Fast Food</option>
                  <option value="RESTAURANT">Restaurant</option>
                </select>
              </label>
            </div>

            <div className="mapping-section">
              <h4>Header Mapping</h4>
              <div className="mapping-grid">
                {(Object.keys(fieldSynonyms) as Array<keyof CsvMapping>).map((field) => {
                  const isRequired = requiredFields.includes(field);
                  const label =
                    field === 'itemName'
                      ? 'Food Item'
                      : field === 'servingSize'
                        ? 'Serving Size (grams)'
                        : field;
                  return (
                    <label key={field} className="mapping-control">
                      {label}
                      <select
                        value={importMapping[field] ?? ''}
                        onChange={(e) => handleMappingChange(field, e.target.value)}
                      >
                        {!isRequired && <option value="">(not mapped)</option>}
                        {isRequired && <option value="">-- Select --</option>}
                        {importHeaders.map((h) => (
                          <option key={h.normalized} value={h.normalized}>
                            {h.raw || h.normalized}
                          </option>
                        ))}
                      </select>
                      {isRequired && importMapping[field] === null && (
                        <span className="mapping-hint">Required</span>
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="mapping-note">Basis unit will be set to grams (g) for all imported rows.</p>
            </div>

            {previewRows.length > 0 && (
              <div className="preview-section">
                <h4>Preview (first 3 rows)</h4>
                <div className="table-container">
                  <table className="food-table preview-table">
                    <thead>
                      <tr>
                        <th>Chain</th>
                        <th>Food Item</th>
                        <th>Serving Size (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => {
                        const mapped = mapRowToCanonical(row);
                        if (!mapped) return null;
                        return (
                          <tr key={idx}>
                            <td>{mapped.chain}</td>
                            <td>{mapped.itemName}</td>
                            <td>{mapped.basisQty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeImportModal} disabled={importing}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleImportSubmit}
                disabled={importing || requiredMissing || parsedRows.length === 0}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
