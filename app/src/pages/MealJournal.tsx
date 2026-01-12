import { useState, useEffect } from 'react';
import { listMealSessions } from '../data/repo';
import type { MealSession } from '../data/types';
import { formatNutrient } from '../utils/format';
import './MealJournal.css';

export function MealJournal() {
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const allSessions = await listMealSessions();
      // Filter to only show saved sessions (those with lineItems)
      const savedSessions = allSessions.filter(s => s.saved && s.lineItems && s.lineItems.length > 0);
      setSessions(savedSessions);
    } catch (err) {
      console.error('[MealJournal] Failed to load sessions:', err);
      setError('Failed to load meal history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  function toggleRowExpansion(sessionId: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div>
        <h2>Meal Journal</h2>
        <p>Loading meal history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>Meal Journal</h2>
        <div className="form-error">{error}</div>
        <button className="btn-primary" onClick={loadSessions}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Meal Journal</h2>
      
      <div className="surface" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p>Your saved meal history</p>
          <button className="btn-primary" onClick={loadSessions}>
            Refresh
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="surface">
          <p className="empty-message">No saved meals yet. Save a meal from the Dashboard to see it here.</p>
        </div>
      ) : (
        <div className="surface">
          <div className="table-container">
            <table className="food-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Meal Category</th>
                  <th>Meal Source</th>
                  <th>BSL (mg/dL)</th>
                  <th>Total Carbs (g)</th>
                  <th>Total Fat (g)</th>
                  <th>Total Protein (g)</th>
                  <th>Total Calories</th>
                  <th>Items</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const itemCount = session.lineItems?.length || 0;
                  const totals = session.totals;
                  const isExpanded = expandedRows.has(session.id);
                  
                  return (
                    <>
                      <tr key={session.id}>
                        <td>{session.sessionDate || '-'}</td>
                        <td>{session.sessionTime || '-'}</td>
                        <td>{session.category}</td>
                        <td>{session.primarySource}</td>
                        <td className="num-cell">{session.bsl ?? '-'}</td>
                        <td className="num-cell">
                          {totals ? formatNutrient(totals.carbsG, 'carbs') : '-'}
                        </td>
                        <td className="num-cell">
                          {totals ? formatNutrient(totals.fatG, 'fat') : '-'}
                        </td>
                        <td className="num-cell">
                          {totals ? formatNutrient(totals.proteinG, 'protein') : '-'}
                        </td>
                        <td className="num-cell">
                          {totals ? formatNutrient(totals.calories, 'calories') : '-'}
                        </td>
                        <td className="num-cell">{itemCount}</td>
                        <td>
                          <button
                            className="btn-small btn-edit"
                            onClick={() => toggleRowExpansion(session.id)}
                          >
                            {isExpanded ? 'Hide items' : 'Show items'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && session.lineItems && session.lineItems.length > 0 && (
                        <tr key={`${session.id}-details`} className="details-row">
                          <td colSpan={11} className="details-cell">
                            <div className="meal-items-detail">
                              <h4>Meal Items</h4>
                              <div className="detail-table-container">
                                <table className="detail-table">
                                  <thead>
                                    <tr>
                                      <th>Item</th>
                                      <th>Size/Serving</th>
                                      <th>Qty Having</th>
                                      <th>Carbs (g)</th>
                                      <th>Fat (g)</th>
                                      <th>Protein (g)</th>
                                      <th>Calories</th>
                                      <th>Sodium (mg)</th>
                                      <th>Fiber (g)</th>
                                      <th>Sugar (g)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {session.lineItems.map((item) => {
                                      // Determine display format based on source
                                      let sizeDisplay: string;
                                      if (item.source === 'Fast Food' || item.source === 'Restaurant') {
                                        const qty = item.perQuantityRaw || '1';
                                        const unit = item.perType || 'order';
                                        sizeDisplay = `${qty} ${unit}`;
                                      } else {
                                        sizeDisplay = item.servingSize 
                                          ? `${item.servingSize} (per ${item.perQuantityRaw || '1'} ${item.perType || 'serving'})` 
                                          : (item.notes || '-');
                                      }
                                      
                                      return (
                                        <tr key={item.id}>
                                          <td>{item.name}</td>
                                          <td className="size-cell">{sizeDisplay}</td>
                                          <td className="num-cell">{item.quantity.toFixed(2)}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.carbsG, 'carbs')}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.fatG, 'fat')}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.proteinG, 'protein')}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.calories, 'calories')}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.sodiumMg, 'sodium')}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.fiberG, 'fiber')}</td>
                                          <td className="num-cell">{formatNutrient(item.macros.sugarG, 'sugar')}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
