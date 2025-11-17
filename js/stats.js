// Shared statistics computation module
// Provides computeEventStats(events) returning { total, pending, completed, overdue }
(function(){
  function computeEventStats(events){
    events = Array.isArray(events) ? events : [];
    const today = new Date(); today.setHours(0,0,0,0);
    const stats = { total: events.length, pending:0, completed:0, overdue:0 };
    for (const e of events){
      const status = e.status || '';
      const isDone = status.includes('Done');
      const isBlocked = status.includes('Blocked');
      if (isDone) stats.completed++; else stats.pending++;
      if (!isDone && !isBlocked){
        const due = new Date((e.posting_date||'') + 'T00:00:00');
        if (!isNaN(due) && due < today) stats.overdue++;
      }
    }
    return stats;
  }
  window.computeEventStats = computeEventStats;
})();
