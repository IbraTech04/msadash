// Recent Activity module extracted from script.js
// Depends on global currentEvents array and window.apiService (assigned to api in main script)
window.loadRecentActivity = function loadRecentActivity() {
  const events = window.currentEvents || currentEvents; // fallback to global
  if (!events || events.length === 0) return;

  const recentEvents = events
    .slice() // avoid mutating original
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const container = document.getElementById('recent-events-list');
  if (!container) return;

  if (recentEvents.length === 0) {
    container.innerHTML = '<div class="loading">No recent activity</div>';
    return;
  }

  const api = window.apiService || window.api;
  container.innerHTML = recentEvents.map(event => `
    <div class="recent-item" onclick="showEventModal(${JSON.stringify(event).replace(/"/g, '&quot;')})">
      <div class="recent-title">${escapeHtml(event.title)}</div>
      <div class="recent-meta">
        ${api ? api.formatRequestType(event.request_type) : (event.request_type || '')} • ${new Date(event.created_at).toLocaleDateString()}
      </div>
    </div>
  `).join('');
};