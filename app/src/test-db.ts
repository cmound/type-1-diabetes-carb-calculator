/**
 * Database testing script
 * Open browser DevTools console and run: await testDb()
 */

import { openDb } from './data/db';
import {
  upsertFoodTemplate,
  searchFoodTemplatesByName,
  createMealSession,
  addMealLineItem,
  listMealLineItems,
  addMealJournalEntryFromSession,
  listMealJournalEntries,
} from './data/repo';
import type { MacroTotals } from './data/types';

export async function testDb() {
  console.log('🔍 Testing IndexedDB schema...');

  try {
    // 1. Open database
    console.log('1️⃣ Opening database...');
    const db = await openDb();
    console.log('✅ Database opened:', db.name, 'v' + db.version);

    // List all object stores
    const stores = Array.from(db.objectStoreNames);
    console.log('📦 Object stores:', stores);

    // 2. Create a food template
    console.log('\n2️⃣ Creating food template...');
    const macros: MacroTotals = {
      calories: 150,
      fatG: 5,
      sodiumMg: 200,
      carbsG: 20,
      fiberG: 3,
      sugarG: 5,
      proteinG: 8,
    };

    const foodTemplate = await upsertFoodTemplate({
      name: 'Whole Wheat Bread',
      description: 'Test bread item',
      macros,
      servingSize: '2 slices',
    });
    console.log('✅ Food template created:', foodTemplate.id);

    // 3. Search for the template
    console.log('\n3️⃣ Searching for templates...');
    const results = await searchFoodTemplatesByName('bread');
    console.log('✅ Found', results.length, 'templates:', results.map(r => r.name));

    // 4. Create a meal session
    console.log('\n4️⃣ Creating meal session...');
    const session = await createMealSession({
      timestamp: Date.now(),
      category: 'Breakfast',
      primarySource: 'Home Meal',
      notes: 'Test breakfast',
    });
    console.log('✅ Meal session created:', session.id);

    // 5. Add line item to session
    console.log('\n5️⃣ Adding meal line item...');
    const lineItem = await addMealLineItem({
      sessionId: session.id,
      name: 'Whole Wheat Bread',
      source: 'Home Meal',
      sourceId: foodTemplate.id,
      quantity: 1,
      macros,
      order: 1,
      notes: 'Toasted',
    });
    console.log('✅ Line item added:', lineItem.id);

    // 6. List line items
    console.log('\n6️⃣ Listing meal line items...');
    const items = await listMealLineItems(session.id);
    console.log('✅ Found', items.length, 'line items');

    // 7. Log meal to journal
    console.log('\n7️⃣ Logging meal to journal...');
    const journalEntry = await addMealJournalEntryFromSession(
      session.id,
      'Finished breakfast',
      'No insulin guidance yet'
    );
    console.log('✅ Journal entry created:', journalEntry.id);
    console.log('   Totals:', journalEntry.totals);

    // 8. List journal entries
    console.log('\n8️⃣ Listing journal entries...');
    const entries = await listMealJournalEntries();
    console.log('✅ Found', entries.length, 'journal entries');

    console.log('\n✨ All tests passed! Database is working correctly.');
    console.log('\n💡 Open DevTools → Application → IndexedDB → t1d-carb-calc to inspect data');

    return {
      success: true,
      database: db.name,
      stores: stores.length,
      foodTemplate,
      session,
      lineItem,
      journalEntry,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error };
  }
}

// Make it available globally in dev mode
if (import.meta.env.DEV) {
  (window as { testDb?: typeof testDb }).testDb = testDb;
}
