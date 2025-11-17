// ESM version of shared statistics computation
// Converts existing global computeEventStats into a pure exported function.

export function computeEventStats(events) {
  events = Array.isArray(events) ? events : [];
  const today = new Date(); today.setHours(0,0,0,0);
  let total = 0, pending = 0, completed = 0, overdue = 0;
  for (const e of events) {
    total++;
    const status = e.status || '';
    const isDone = status.includes('Done');
    const isBlocked = status.includes('Blocked');
    if (isDone) completed++; else pending++;
    if (!isDone && !isBlocked) {
      const due = new Date((e.posting_date||'') + 'T00:00:00');
      if (!isNaN(due) && due < today) overdue++;
    }
  }
  return { total, pending, completed, overdue };
}

// Side-effect: attach to window.MSA for backwards compatibility during migration phase
if (typeof window !== 'undefined') {
  window.MSA = window.MSA || {}; window.MSA.data = window.MSA.data || {};
  window.MSA.data.computeEventStats = computeEventStats;
  // If legacy global not present, define it
  if (typeof window.computeEventStats !== 'function') {
    window.computeEventStats = computeEventStats;
  }
}
