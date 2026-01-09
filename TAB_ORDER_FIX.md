# Tab Order and Validation Fix - Home Meal Form

## Date: January 3, 2026

## Root Causes Identified

1. **Native HTML5 validation tooltips:** Input fields had `required` attribute, which triggers browser validation even with `noValidate` on the form in some browsers.
2. **Tab order was correct in DOM** but browser validation was interfering.
3. **Focus ring overflow** was already fixed via inset box-shadow.

## Changes Made

### File: app/src/pages/Dashboard.tsx

**Change: Removed ALL `required` attributes from form inputs**

This completely disables HTML5 validation, ensuring no browser tooltips appear during tabbing or on blur. Validation only runs in our `handleAddFood` function when the form is submitted.

#### 1. Food Name Input
```tsx
// BEFORE:
<input
  type="text"
  id="food-name"
  value={formData.name}
  onChange={(e) => handleFormChange('name', e.target.value)}
  required  // ❌ REMOVED
/>

// AFTER:
<input
  type="text"
  id="food-name"
  value={formData.name}
  onChange={(e) => handleFormChange('name', e.target.value)}
/>
```

#### 2. Serving Size Input
```tsx
// BEFORE:
<input
  type="number"
  id="serving-size"
  value={formData.servingSizeAmount}
  onChange={(e) => handleFormChange('servingSizeAmount', e.target.value)}
  min="0"
  step="0.01"
  required  // ❌ REMOVED
/>

// AFTER:
<input
  type="number"
  id="serving-size"
  value={formData.servingSizeAmount}
  onChange={(e) => handleFormChange('servingSizeAmount', e.target.value)}
  min="0"
  step="0.01"
/>
```

#### 3. Per Quantity Input
```tsx
// BEFORE:
<input
  type="text"
  id="per-quantity"
  value={formData.perQuantityRaw}
  onChange={(e) => handleFormChange('perQuantityRaw', e.target.value)}
  placeholder="1 or 2/3"
  title="Enter decimal or fraction (e.g., 1, 0.5, 1/2, 2 1/3)"
  required  // ❌ REMOVED
/>

// AFTER:
<input
  type="text"
  id="per-quantity"
  value={formData.perQuantityRaw}
  onChange={(e) => handleFormChange('perQuantityRaw', e.target.value)}
  placeholder="1 or 2/3"
  title="Enter decimal or fraction (e.g., 1, 0.5, 1/2, 2 1/3)"
/>
```

#### 4. Per Type Select
```tsx
// BEFORE:
<select
  id="per-type"
  value={formData.perType}
  onChange={(e) => handleFormChange('perType', e.target.value)}
  required  // ❌ REMOVED
>

// AFTER:
<select
  id="per-type"
  value={formData.perType}
  onChange={(e) => handleFormChange('perType', e.target.value)}
>
```

#### 5. Amount Having Input
```tsx
// BEFORE:
<input
  type="number"
  id="amount-having"
  value={formData.amountHaving}
  onChange={(e) => handleFormChange('amountHaving', e.target.value)}
  min="0"
  step="0.01"
  required  // ❌ REMOVED
/>

// AFTER:
<input
  type="number"
  id="amount-having"
  value={formData.amountHaving}
  onChange={(e) => handleFormChange('amountHaving', e.target.value)}
  min="0"
  step="0.01"
/>
```

## Verification Checklist

### ✅ Before Testing (Code Verification)
- [x] Form has `noValidate` attribute
- [x] No `required` attributes on any inputs
- [x] No `onBlur` handlers that might trigger validation
- [x] No `.focus()` calls that could cause focus jumps
- [x] No duplicate Per Quantity inputs in DOM
- [x] DOM order matches desired tab order
- [x] Custom validation runs only in `handleAddFood` on submit
- [x] `formError` state displays inline errors instead of alerts

### ✅ After Rebuild (Runtime Testing)
Test at http://localhost:4173/

**Tab Order Test:**
1. Click into Food Name → Tab
2. Should move to Serving Size (number input) → Tab
3. Should move to Serving Size unit (select) → Tab
4. Should move to Per Quantity → Tab
5. Should move to Per Type → Tab
6. Should move to Calories → Tab
7. Continue through all fields sequentially
8. ❌ NO focus jumps back to Per Quantity
9. ❌ NO validation tooltips appear

**Validation Test:**
1. With empty form, click "Add to Meal Log" button
2. Should show inline error: "Please enter a food name"
3. ❌ NO browser tooltip "Please fill out this field"
4. Fill in Food Name, click Add again
5. Should show error about invalid Per Quantity or Serving Size
6. ❌ NO browser tooltips at any point

**Focus Ring Test:**
1. Tab through all inputs and selects
2. Yellow focus ring should stay INSIDE the element boundaries
3. ❌ NO overflow or bleeding outside borders

**Per Type Functionality:**
1. Per Type defaults to "serving"
2. Can select: serving, g, oz, ml, cup, tbsp, tsp, can, bottle, bag, bar, piece
3. After adding item, check "Size" column in logged items
4. Should display format: "150g (per 1 serving)" or similar
5. perType is persisted and displays correctly

## Technical Notes

### Why This Fix Works

1. **`noValidate` alone is not enough:** Some browsers (especially Chrome/Edge) still show validation tooltips on certain interactions even with `noValidate`. The `required` attribute itself triggers the validation API.

2. **`required` attribute removal:** By removing ALL `required` attributes, we completely disconnect from HTML5 validation APIs. No `reportValidity()`, `checkValidity()`, or constraint validation messages can fire.

3. **Manual validation:** Our `handleAddFood` function performs all validation logic and sets `formError` state, which displays inline. This is more accessible and consistent across browsers.

4. **DOM order:** Tab order follows natural DOM structure (no `tabindex` manipulation needed):
   - Food Name
   - Serving Size input
   - Serving Size select
   - Per Quantity
   - Per Type
   - Nutrition fields...
   - Amount Having
   - Submit button

5. **No focus manipulation:** No `useRef` + `.focus()` calls, no `autoFocus` (except in edit mode), no focus trapping that could cause jumps.

### CSS Confirmation

Focus ring styling (already correct):
```css
input:focus-visible,
select:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-focus);
  border-color: var(--color-focus);
}
```

- `inset` keeps shadow inside element
- `border-color` highlights the border without adding space
- `outline: none` removes default outline that could overflow
- No `outline-offset`, no `focus-within` on containers

## Files Changed

1. **app/src/pages/Dashboard.tsx** - Removed `required` from 5 inputs/selects

## Build Status

✅ Build successful  
✅ Preview server running at http://localhost:4173/  
✅ No TypeScript errors  
✅ No linting errors  

## Next Steps

1. Open http://localhost:4173/ in browser
2. Navigate to Dashboard (Home Meal mode should be active by default)
3. Run through verification checklist above
4. Confirm:
   - ✅ Tab order is sequential and correct
   - ✅ NO validation tooltips during tabbing
   - ✅ NO focus jumps back to Per Quantity
   - ✅ Focus ring stays within boundaries
   - ✅ Per Type works and displays correctly
   - ✅ Form validation only runs on submit
   - ✅ Inline error messages display instead of alerts

## Rollback Plan

If issues persist, check:
1. Browser cache - hard refresh (Ctrl+Shift+R)
2. Service worker cache - clear in DevTools → Application → Storage → Clear site data
3. Verify correct bundle is served - check Network tab for latest bundle hash
4. Check browser DevTools console for any JS errors
