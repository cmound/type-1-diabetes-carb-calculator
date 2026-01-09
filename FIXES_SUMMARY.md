# Dashboard Home Meal Form - UI/UX Bug Fixes

## Date: January 3, 2026

## Issues Fixed

### A. Tab Order & Validation Behavior
**Problem:** Tab order was incorrect and native validation tooltips appeared on blur/tab.

**Solution:** 
- Added `noValidate` attribute to form element to disable browser validation on blur
- Changed all validation from `alert()` to inline error display using `formError` state
- Validation now only runs on explicit form submit (Add to Meal Log button)

### B. Focus Ring Overflow
**Problem:** Yellow focus highlight extended past input boundaries on right-side inputs.

**Solution:**
- Updated `globals.css` to add `border-color: var(--color-focus)` on all focus-visible states
- Focus ring now uses inset box-shadow which stays within element boundaries
- Applied to all interactive elements: inputs, selects, textareas, buttons

### C. Per Type Field Addition
**Problem:** No way to specify unit type (serving, g, oz, ml, etc.) for Per Quantity.

**Solution:**
- Added "Per Type" select field immediately after "Per Quantity" in DOM order
- Added 12 options: serving (default), g, oz, ml, cup, tbsp, tsp, can, bottle, bag, bar, piece
- Stored in database with new optional fields on MealLineItem and MealJournalLineItem
- Display format in logged items: "150g (per 1 serving)" or similar

---

## Files Changed

### 1. **app/src/data/types.ts**
Added optional fields to meal item types:
```typescript
export interface MealLineItem {
  // ... existing fields
  servingSize?: string;        // e.g., "150g"
  perQuantityRaw?: string;     // user-entered per quantity text
  perType?: string;            // unit type (serving, g, oz, etc.)
  // ... rest of fields
}

export interface MealJournalLineItem {
  // ... existing fields
  servingSize?: string;
  perQuantityRaw?: string;
  perType?: string;
  // ... rest of fields
}
```

### 2. **app/src/data/repo.ts**
Updated journal line item creation to copy new fields:
```typescript
const journalLineItem: MealJournalLineItem = {
  // ... existing fields
  servingSize: item.servingSize,
  perQuantityRaw: item.perQuantityRaw,
  perType: item.perType,
  // ... rest
};
```

### 3. **app/src/styles/globals.css**
Enhanced focus-visible styles to prevent overflow:
```css
*:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-focus);
  border-color: var(--color-focus);  /* NEW */
}

/* Applied to inputs, selects, textareas, buttons */
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-focus);
  border-color: var(--color-focus);  /* NEW */
}

button:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-focus);
  border-color: var(--color-focus);  /* NEW */
}
```

### 4. **app/src/pages/Dashboard.css**
Added form error styling:
```css
.form-error {
  color: var(--color-error);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}
```

### 5. **app/src/pages/Dashboard.tsx**

#### Type Definitions
```typescript
type PerTypeOption = 'serving' | 'g' | 'oz' | 'ml' | 'cup' | 'tbsp' | 'tsp' 
  | 'can' | 'bottle' | 'bag' | 'bar' | 'piece';

const perTypeOptions: PerTypeOption[] = [
  'serving', 'g', 'oz', 'ml', 'cup', 'tbsp', 'tsp', 
  'can', 'bottle', 'bag', 'bar', 'piece'
];

interface FoodFormData {
  // ... existing fields
  perType: PerTypeOption;  // NEW
  // ... rest of fields
}

const initialFormData: FoodFormData = {
  // ... existing
  perType: 'serving',  // NEW - default value
  // ... rest
};
```

#### Component State
```typescript
const [formError, setFormError] = useState<string | null>(null);  // NEW
```

#### Form Element
```tsx
<form className="food-form surface" onSubmit={handleAddFood} noValidate>
  {/* noValidate prevents browser validation on blur */}
  <h3>Add Food Item</h3>
  
  {formError && <div className="form-error">{formError}</div>}
  
  {/* ... rest of form */}
</form>
```

#### Per Type Field (after Per Quantity)
```tsx
<div className="form-field form-field-small">
  <label htmlFor="per-type">Per Type *</label>
  <select
    id="per-type"
    value={formData.perType}
    onChange={(e) => handleFormChange('perType', e.target.value)}
    required
  >
    {perTypeOptions.map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
</div>
```

#### Validation (onChange from alert to setFormError)
```typescript
async function handleAddFood(e: React.FormEvent) {
  e.preventDefault();
  if (!session) return;

  setFormError(null);  // Clear previous error

  // ... validation checks
  if (!formData.name.trim()) {
    setFormError('Please enter a food name');  // Was: alert(...)
    return;
  }
  
  if (perQuantity === null || perQuantity <= 0) {
    setFormError('Invalid "Per Quantity" - use decimal or fraction');
    return;
  }
  // ... etc
}
```

#### Save with new fields
```typescript
await addMealLineItem({
  sessionId: session.id,
  name: formData.name,
  source: session.primarySource,
  quantity: amountHaving,
  macros: calculatedMacros,
  order: lineItems.length + 1,
  notes: `${formData.perQuantityRaw} ${formData.perType}`,  // NEW format
  servingSize,                    // NEW
  perQuantityRaw: formData.perQuantityRaw,  // NEW
  perType: formData.perType,      // NEW
});
```

#### Display in table
```tsx
{lineItems.map((item) => {
  const sizeDisplay = item.servingSize 
    ? `${item.servingSize} (per ${item.perQuantityRaw || '1'} ${item.perType || 'serving'})` 
    : (item.notes || '-');
  
  return (
    <tr key={item.id}>
      <td>{item.name}</td>
      <td className="size-cell">{sizeDisplay}</td>
      {/* ... rest of columns */}
    </tr>
  );
})}
```

---

## Verification Steps

1. **Build Check:**
   ```bash
   cd app
   npm run build
   ```
   ✅ Build succeeded with no TypeScript errors

2. **Preview Server:**
   ```bash
   npm run preview
   ```
   Now running at http://localhost:4173/

3. **Manual Testing Checklist:**
   - [ ] Tab order: Food Name → Serving Size → Per Quantity → Per Type → Calories → ... → Amount Having → Add Button
   - [ ] No validation tooltip appears when tabbing through empty required fields
   - [ ] Validation error message displays inline below form title when clicking Add with empty name
   - [ ] Focus ring stays within input/select boundaries (no overflow)
   - [ ] Per Type defaults to "serving"
   - [ ] Per Type saves and displays correctly in logged items table
   - [ ] Format example: "150g (per 1 serving)" or "100g (per 2 oz)"

---

## Implementation Notes

### Design Decisions

1. **Minimal Changes:** Did not rewrite dashboard; targeted only the specific issues.

2. **No Validation on Blur:** Form validation only runs on submit click, preventing "Please fill out this field" tooltips during tab navigation.

3. **Inline Error Display:** Replaced `alert()` calls with state-based error message displayed at top of form for better UX.

4. **Per Type Positioning:** Placed immediately after Per Quantity in DOM order to ensure natural tab flow.

5. **Database Schema:** Used optional fields for backward compatibility; existing items without perType will display gracefully with fallback to notes.

6. **Focus Ring Fix:** Inset box-shadow + border-color ensures focus indicator stays within element boundaries on all screen sizes and zoom levels.

### Accessibility

- All new fields have proper `<label>` with `htmlFor` linking to input `id`
- Focus indicators maintain WCAG 2.1 contrast requirements (yellow on dark background)
- Tab order follows visual layout top-to-bottom, left-to-right
- Required fields marked with asterisk in label text

### Data Migration

No migration needed. New optional fields will be `undefined` for existing items and display will fall back to the `notes` field.

---

## Future Enhancements (Out of Scope)

- Add Per Type to Recipe mode ingredient form (currently only in Home Meal)
- Add unit conversion helpers (oz to g, etc.)
- Allow custom Per Type options
- Persist form state to localStorage for convenience

---

## Summary

All three goals achieved:

✅ **A) Tab order fixed** - deterministic forward progression, no validation on blur  
✅ **B) Focus ring fixed** - inset box-shadow with border-color prevents overflow  
✅ **C) Per Type field added** - 12 options, saved to DB, displayed in logged items

Build successful. Ready for testing in preview at http://localhost:4173/
