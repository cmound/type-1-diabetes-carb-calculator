import React, { useState, useEffect } from 'react';
import { storage } from '../storage';
import './MealJournal.css';
import type { MealEntry } from '../types/meal';

export function MealJournal() {
  const [sessions, setSessions] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const allSessions = await storage.listMealEntries();
      setSessions(allSessions);
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

  function truncatedNotes(text: string, max = 60): string {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  const handleDraftChange = (sessionId: string, value: string) => {
    setNotesDrafts((prev) => ({ ...prev, [sessionId]: value }));
  };

  async function handleSaveNotes(sessionId: string) {
    const newNotes = notesDrafts[sessionId];
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedSession = {
      ...session,
      notes: newNotes,
    };

    await storage.updateMealEntry(updatedSession);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updatedSession : s)));
  }

  async function handleDeleteMealEntry(sessionId: string) {
    await storage.deleteMealEntry(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  function toggleRowExpansion(sessionId: string) {
    setExpandedRows((prev) => {
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
                  <th>Notes</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const itemCount = session.lineItems?.length || 0;
                  const totals = session.totals;
                  const isExpanded = expandedRows.has(session.id);

                  return (
                    <React.Fragment key={session.id}>
                      <tr key={session.id}>
                        <td>{session.sessionDate || '-'}</td>
                        <td>{session.sessionTime || '-'}</td>
                        <td>{session.category}</td>
                        <td>{session.primarySource}</td>
                        <td className="num-cell">{session.bsl ?? '-'}</td>
                        <td className="num-cell">{totals ? totals.carbsG : '-'}</td>
                        <td className="num-cell">{totals ? totals.fatG : '-'}</td>
                        <td className="num-cell">{totals ? totals.proteinG : '-'}</td>
                        <td className="num-cell">{totals ? totals.calories : '-'}</td>
                        <td className="num-cell">{itemCount}</td>
                        <td>{truncatedNotes(session.notes ?? '')}</td>
                        <td>
                          <button
                            className="btn-small btn-edit"
                            onClick={() => toggleRowExpansion(session.id)}
                          >
                            {isExpanded ? 'Hide items' : 'Show items'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-small btn-edit"
                            onClick={() => alert('Edit functionality not implemented yet')}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-delete"
                            onClick={() => handleDeleteMealEntry(session.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {isExpanded && session.lineItems && session.lineItems.length > 0 && (
                        <tr key={`${session.id}-details`} className="details-row">
                          <td colSpan={13} className="details-cell">
                            <div className="meal-items-detail">
                              <div className="notes-box">
                                <label className="notes-box-label" htmlFor={`notes-${session.id}`}>
                                  Notes
                                </label>
                                <textarea
                                  id={`notes-${session.id}`}
                                  value={notesDrafts[session.id] ?? ''}
                                  onChange={(e) => handleDraftChange(session.id, e.target.value)}
                                  rows={3}
                                />
                                <div className="notes-actions">
                                  <button
                                    className="btn-small btn-save"
                                    onClick={() => handleSaveNotes(session.id)}
                                  >
                                    Save Notes
                                  </button>
                                </div>
                              </div>

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
                                      let sizeDisplay: string;
                                      if (item.source === 'Fast Food' || item.source === 'Restaurant') {
                                        const qty = item.perQuantityRaw || '1';
                                        const unit = item.perType || 'order';
                                        sizeDisplay = `${qty} ${unit}`;
                                      } else {
                                        sizeDisplay = item.servingSize
                                          ? `${item.servingSize} (per ${item.perQuantityRaw || '1'} ${item.perType || 'serving'})`
                                          : item.notes || '-';
                                      }

                                      return (
                                        <tr key={item.id}>
                                          <td>{item.name}</td>
                                          <td className="size-cell">{sizeDisplay}</td>
                                          <td className="num-cell">{item.quantity.toFixed(2)}</td>
                                          <td className="num-cell">{item.macros.carbsG}</td>
                                          <td className="num-cell">{item.macros.fatG}</td>
                                          <td className="num-cell">{item.macros.proteinG}</td>
                                          <td className="num-cell">{item.macros.calories}</td>
                                          <td className="num-cell">{item.macros.sodiumMg}</td>
                                          <td className="num-cell">{item.macros.fiberG}</td>
                                          <td className="num-cell">{item.macros.sugarG}</td>
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
                    </React.Fragment>
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
