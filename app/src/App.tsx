import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FastFood } from './pages/EatingOut';
import { Templates } from './pages/Templates';
import { MealJournal } from './pages/MealJournal';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}> {/* Set basename for GitHub Pages */}
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/eating-out" element={<FastFood />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/journal" element={<MealJournal />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} /> {/* Catch-all route */}
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
