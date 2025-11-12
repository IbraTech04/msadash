// Kanban Board module
// Depends on window.currentEvents, window.loadEvents, window.apiService/window.api, window.showEventModal

(function(){
  async function loadKanbanBoard(){
    try {
      if (!window.currentEvents || window.currentEvents.length === 0) {
        const container = document.getElementById('kanban-container');
        if (container) container.innerHTML = '<div class="loading">🔄 Loading data...</div>';
        await window.loadEvents();
      }
      const filtered = applyKanbanDeptFilter(window.currentEvents);
      displayKanbanBoard(filtered);
    } catch (error) {
      console.error('❌ Error loading Kanban board:', error);
      const container = document.getElementById('kanban-container');
      if (container) container.innerHTML = '<div class="loading error">❌ Error loading Kanban board</div>';
    }
  }

  function applyKanbanDeptFilter(events){
    const sel = document.getElementById('kanban-filter');
    if (!sel) return events;
    const val = (sel.value || '').toLowerCase().trim();
    if (!val) return events;
    // Normalize: social-media -> social media
    const needle = val.replace(/-/g,' ');
    return events.filter(e => {
      const dept = (e.department || e.requester_department_name || '').toLowerCase();
      return dept.includes(needle);
    });
  }

  function displayKanbanBoard(events){
    const container = document.getElementById('kanban-container');
    if (!container) return;
    const statuses = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','✅ Done','🚫 Blocked'];
    const eventsByStatus = statuses.reduce((acc, status) => { acc[status] = events.filter(event => event.status === status); return acc; }, {});
    container.innerHTML = statuses.map(status => {
      const statusEvents = eventsByStatus[status] || [];
      const cards = statusEvents.map(event => createKanbanCard(event)).join('');
      return `
        <div class="kanban-column" data-status="${status}">
          <div class="kanban-header">
            <div class="kanban-title">${status}</div>
            <div class="kanban-count">${statusEvents.length}</div>
          </div>
          <div class="kanban-cards">${cards || '<div class="kanban-empty">No items</div>'}</div>
        </div>`;
    }).join('');
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => {
        const eventId = card.dataset.eventId;
        const event = events.find(e => String(e.channelID) === eventId);
        if (event) window.showEventModal(event);
      });
    });
  }

  function createKanbanCard(event){
    const api = window.apiService || window.api;
    const meta = (window.MSA && window.MSA.date && window.MSA.date.computeDueMeta) ? window.MSA.date.computeDueMeta(event.posting_date) : null;
    const isDone = !!(event.status && event.status.includes('Done'));
    const isBlocked = !!(event.status && event.status.includes('Blocked'));
    const dueClass = meta ? (meta.isOverdue ? 'overdue' : meta.isUrgent ? 'urgent' : '') : '';
    const dueText = (!meta) ? '' : meta.isOverdue ? `${Math.abs(meta.daysUntilDue)} days overdue` : meta.isUrgent ? `${meta.daysUntilDue} days left` : `Due ${meta.dueDate.toLocaleDateString()}`;
    return `
      <div class="kanban-card" data-event-id="${event.channelID}">
        <div class="kanban-card-type">${api.formatRequestType(event.request_type)}</div>
        <div class="kanban-card-title">${escapeHtml(event.title)}</div>
        <div class="kanban-card-department">${escapeHtml(event.department || event.requester_department_name || 'No Department')}</div>
        <div class="kanban-card-meta">
          <div class="kanban-card-due ${dueClass}">${dueText}</div>
          ${event.assigned_to_name ? `<div>👤 ${escapeHtml(event.assigned_to_name)}</div>` : '<div>👤 Unassigned</div>'}
          ${event.room ? `<div>📍 ${escapeHtml(event.room)}</div>` : ''}
        </div>
      </div>`;
  }

  function refreshKanban(){ loadKanbanBoard(); }

  // Wire up filter change once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('kanban-filter');
    if (sel) sel.addEventListener('change', () => loadKanbanBoard());
  });

  window.loadKanbanBoard = loadKanbanBoard;
  window.refreshKanban = refreshKanban;
})();
