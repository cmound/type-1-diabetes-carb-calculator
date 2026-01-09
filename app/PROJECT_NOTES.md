# Type 1 Diabetes Carb Calculator

A desktop-first Progressive Web App for managing carbohydrate calculations for Type 1 Diabetes.

## Project Structure

```
C:\Dev\type-1-diabetes-carb-calculator\
├── T1D-Icon-*.png (app icons at root)
└── app/
    ├── src/
    │   ├── components/
    │   │   ├── AppLayout.tsx      # Main app shell with header and navigation
    │   │   └── AppLayout.css
    │   ├── pages/
    │   │   ├── Dashboard.tsx      # Overview and quick actions
    │   │   ├── Templates.tsx      # Meal templates management
    │   │   ├── MealJournal.tsx    # Meal logging and history
    │   │   ├── Analytics.tsx      # Trends and insights
    │   │   └── Settings.tsx       # App configuration
    │   ├── data/
    │   │   ├── types.ts           # TypeScript enums (MealCategory, MealSource)
    │   │   ├── db.ts              # IndexedDB wrapper stub
    │   │   └── seed.ts            # Database seeding placeholder
    │   ├── styles/
    │   │   └── globals.css        # High-contrast, accessible base styles
    │   ├── App.tsx                # React Router setup
    │   └── main.tsx               # App entry point
    ├── package.json
    ├── tsconfig.json              # TypeScript strict mode enabled
    └── vite.config.ts
```

## Features

### Current Implementation
- ✅ Vite + React 19 + TypeScript (strict mode)
- ✅ React Router v7 with tab-based navigation
- ✅ High-contrast, colorblind-safe styling with CSS variables
- ✅ Keyboard-accessible navigation with strong focus indicators
- ✅ Five main sections: Dashboard, Templates, Meal Journal, Analytics, Settings
- ✅ Placeholder data layer for IndexedDB (idb library installed)
- ✅ ESLint + TypeScript ESLint configured

### Not Yet Implemented
- ⏳ PWA manifest and service worker
- ⏳ IndexedDB database schema and operations
- ⏳ Medical/carb calculation logic
- ⏳ Image upload/OCR features
- ⏳ Offline-first capabilities

## Accessibility Features

- Large, readable base font (16px)
- High-contrast color palette
- 3px focus outlines with 2px offset
- Text decoration and weight changes (not color-only)
- Keyboard navigable tabs
- Semantic HTML structure

## Commands

```bash
# Navigate to project
cd C:\Dev\type-1-diabetes-carb-calculator\app

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Development Notes

- TypeScript strict mode is enabled in `tsconfig.app.json`
- All placeholder pages render with clear H2 headings
- Database stubs are ready for implementation with idb library
- CSS custom properties defined in `globals.css` for theming
- Icon files preserved at project root for future PWA manifest

## Next Steps

1. Implement IndexedDB schema in `src/data/db.ts`
2. Add PWA manifest.json and link icons
3. Create service worker for offline support
4. Build out meal template and journal UIs
5. Add carb calculation logic (medical consultation required)
