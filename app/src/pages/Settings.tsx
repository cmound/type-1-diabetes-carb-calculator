import { useState } from 'react';
import { storage } from '../storage';
import type { MealEntry } from '../types/meal';
import type { Template } from '../types/template';
import type { FoodCatalogItem } from '../types/foodCatalog';

export function Settings() {
  const [integrity, setIntegrity] = useState<{
    mealEntries: number;
    templates: number;
    eatingOutItems: number;
    lastWrite: string | null;
    schemaVersion: number;
  }>({
    mealEntries: 0,
    templates: 0,
    eatingOutItems: 0,
    lastWrite: null,
    schemaVersion: 1,
  });

  async function refreshIntegrity() {
    const mealEntries = (await storage.listMealEntries()).length;
    const templates = (await storage.listTemplates()).length;
    const eatingOutItems = (await storage.listEatingOutItems()).length;
    const lastWrite = localStorage.getItem('lastWriteTimestamp');
    setIntegrity({ mealEntries, templates, eatingOutItems, lastWrite, schemaVersion: 1 });
  }

  async function exportData() {
    const data = {
      mealEntries: await storage.listMealEntries(),
      templates: await storage.listTemplates(),
      eatingOutItems: await storage.listEatingOutItems(),
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carb-calculator-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.schemaVersion !== 1) {
      alert('Unsupported schema version');
      return;
    }
    if (confirm('Replace existing data? This cannot be undone.')) {
      await Promise.all([
        ...data.mealEntries.map((entry: MealEntry) => storage.addMealEntry(entry)),
        ...data.templates.map((template: Template) => storage.addTemplate(template)),
        ...data.eatingOutItems.map((item: FoodCatalogItem) => storage.addEatingOutItem(item)),
      ]);
      localStorage.setItem('lastWriteTimestamp', new Date().toISOString());
      alert('Data imported successfully');
      refreshIntegrity();
    }
  }

  return (
    <div>
      <h2>Settings</h2>
      <div className="surface">
        <h3>Data Integrity</h3>
        <button onClick={refreshIntegrity}>Refresh</button>
        <ul>
          <li>Meal Entries: {integrity.mealEntries}</li>
          <li>Templates: {integrity.templates}</li>
          <li>Fast Food / Restaurants Items: {integrity.eatingOutItems}</li>
          <li>Last Write: {integrity.lastWrite || 'N/A'}</li>
          <li>Schema Version: {integrity.schemaVersion}</li>
        </ul>
      </div>
      <div className="surface">
        <h3>Backup and Restore</h3>
        <button onClick={exportData}>Export Data</button>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              importData(e.target.files[0]);
            }
          }}
        />
      </div>
    </div>
  );
}
