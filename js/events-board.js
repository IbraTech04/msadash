// Events board module: loads events and renders the requests list and summary
// Relies on window.apiService (aliased to api in main script), escapeHtml, showEventModal, showToast

(function(){
  function toggleStatusSection(statusSection) {
    const content = statusSection.querySelector('.status-content');
    const icon = statusSection.querySelector('.collapse-icon');
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.textContent = '▼';
      statusSection.classList.remove('collapsed');
    } else {
      content.style.display = 'none';
      icon.textContent = '▶';
      statusSection.classList.add('collapsed');
    }
  }

  function createEventCard(event, api) {
    const meta = (window.MSA && window.MSA.date && window.MSA.date.computeDueMeta) ? window.MSA.date.computeDueMeta(event.posting_date) : null;
    const isDone = !!(event.status && event.status.includes('Done'));
    const isBlocked = !!(event.status && event.status.includes('Blocked'));
    let urgencyClass = '', urgencyText = '', urgencyBadgeClass = '';
    if (meta) {
      if (meta.isOverdue && !isDone && !isBlocked) { urgencyText = `⚠️ ${Math.abs(meta.daysUntilDue)} days overdue`; urgencyClass='overdue'; urgencyBadgeClass='overdue'; }
      else if (meta.isUrgent && !isDone && !isBlocked) { urgencyText = `🔥 ${meta.daysUntilDue} ${meta.daysUntilDue === 1 ? 'day' : 'days'} left`; urgencyClass='urgent'; urgencyBadgeClass='urgent'; }
      else if (meta.isSoon && !isDone && !isBlocked) { urgencyText = `⏰ ${meta.daysUntilDue} ${meta.daysUntilDue === 1 ? 'day' : 'days'} left`; urgencyBadgeClass='moderate'; }
      else { urgencyText = `📅 ${meta.daysUntilDue} days left`; urgencyBadgeClass='normal'; }
    }
    const dueDate = meta ? meta.dueDate : new Date(event.posting_date + 'T00:00:00');

    const statusColor = api.getStatusColor(event.status);
    const discordLink = api.generateDiscordChannelLink(event.channelID);

    const card = document.createElement('div');
    card.className = `modern-event-card ${urgencyClass}`;
    card.innerHTML = `
      <div class="event-card-header">
        <div class="event-card-badges">
          <span class="event-card-type-badge">${api.formatRequestType(event.request_type)}</span>
          <span class="event-card-status-badge" style="background-color: ${statusColor}20; color: ${statusColor}; border-color: ${statusColor}">
            ${event.status || 'No Status'}
          </span>
        </div>
        <div class="event-card-urgency ${urgencyBadgeClass}">${urgencyText}</div>
      </div>
      <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
      <p class="event-card-description">${escapeHtml(event.description) || 'No description provided'}</p>
      <div class="event-card-grid">
        <div class="event-card-detail">
          <div class="event-card-detail-icon">👥</div>
          <div class="event-card-detail-content">
            <div class="event-card-detail-label">Requested By</div>
            <div class="event-card-detail-value">${escapeHtml(event.requester_name || 'Unknown')}</div>
            ${event.department || event.requester_department_name ? `<div class="event-card-detail-sub">${escapeHtml(event.department || event.requester_department_name)}</div>` : ''}
          </div>
        </div>
        <div class="event-card-detail">
          <div class="event-card-detail-icon">👤</div>
          <div class="event-card-detail-content">
            <div class="event-card-detail-label">Assigned To</div>
            <div class="event-card-detail-value">${escapeHtml(event.assigned_to_name) || 'Unassigned'}</div>
          </div>
        </div>
        <div class="event-card-detail">
          <div class="event-card-detail-icon">📅</div>
          <div class="event-card-detail-content">
            <div class="event-card-detail-label">Due Date</div>
            <div class="event-card-detail-value">${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
        ${event.room ? `
        <div class="event-card-detail">
          <div class="event-card-detail-icon">📍</div>
          <div class="event-card-detail-content">
            <div class="event-card-detail-label">Location</div>
            <div class="event-card-detail-value">${escapeHtml(event.room)}</div>
          </div>
        </div>` : ''}
      </div>
      <div class="event-card-footer">
        <div class="event-card-meta"><small>Created ${new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div>
        <div class="event-card-actions">
          ${event.signup_url ? `<a href="${escapeHtml(event.signup_url)}" target="_blank" class="event-card-action-btn signup-btn" onclick="event.stopPropagation()">🔗 Signup</a>` : ''}
          <a href="${discordLink}" target="_blank" class="event-card-action-btn discord-btn" onclick="event.stopPropagation()">💬 Discord</a>
        </div>
      </div>`;
    card.addEventListener('click', (e) => { if (!e.target.closest('.event-card-action-btn')) { showEventModal(event); } });
    return card;
  }

  function displayEvents(events, api) {
    const container = document.getElementById('task-container');
    if (!container) return;
    container.innerHTML = '';
    if (!events || events.length === 0) {
      container.innerHTML = '<div class="loading">No marketing requests found. Create your first request in Discord!</div>';
      return;
    }
    const eventsByStatus = {};
    const statusOrder = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','✅ Done','🚫 Blocked'];
    events.forEach(ev => { const status = ev.status || 'No Status'; (eventsByStatus[status] ||= []).push(ev); });
    statusOrder.forEach(status => {
      if (!eventsByStatus[status] || eventsByStatus[status].length === 0) return;
      const section = document.createElement('div');
      section.className = 'status-section';
      const header = document.createElement('div');
      header.className = 'status-header';
      header.innerHTML = `<h3>${status} (${eventsByStatus[status].length})</h3><span class="collapse-icon">▼</span>`;
      header.addEventListener('click', () => toggleStatusSection(section));
      const content = document.createElement('div');
      content.className = 'status-content';
      eventsByStatus[status].forEach(ev => content.appendChild(createEventCard(ev, api)));
      section.appendChild(header); section.appendChild(content); container.appendChild(section);
    });
  }

  function displayEventsError() {
    const container = document.getElementById('task-container');
    if (!container) return;
    container.innerHTML = `<div class="loading error"><p>❌ Failed to load marketing requests</p><p>Please check your connection and try again.</p><button class="action-btn" onclick="refreshData()">🔄 Retry</button></div>`;
  }

  function updateEventsSummary(events) {
    const summaryContainer = document.getElementById('events-summary');
    if (!summaryContainer) return;
    const statusCounts = (window.computeEventStats ? window.computeEventStats(events) : { total:0,pending:0,completed:0,overdue:0 });
    summaryContainer.innerHTML = `<h3>📊 Request Summary</h3><div class="summary-stats">
      <div class="summary-stat"><span class="summary-number">${statusCounts.total}</span><span class="summary-label">Total Requests</span></div>
      <div class="summary-stat"><span class="summary-number">${statusCounts.pending}</span><span class="summary-label">Pending</span></div>
      <div class="summary-stat"><span class="summary-number">${statusCounts.completed}</span><span class="summary-label">Completed</span></div>
      <div class="summary-stat ${statusCounts.overdue > 0 ? 'overdue' : ''}"><span class="summary-number">${statusCounts.overdue}</span><span class="summary-label">Overdue</span></div>
    </div>`;
  }

  async function loadEvents() {
    if (window.eventsLoadingPromise) return window.eventsLoadingPromise;
    const api = window.apiService || window.api;
    window.eventsLoadingPromise = (async () => {
      try {
        const requests = await api.getAllRequests();
        window.currentEvents = await api.transformRequestsToEvents(requests);
        displayEvents(window.currentEvents, api);
        updateEventsSummary(window.currentEvents);
        return window.currentEvents;
      } catch (error) {
        console.error('❌ Failed to load events:', error);
        window.currentEvents = [];
        displayEventsError();
        return [];
      }
    })();
    try { return await window.eventsLoadingPromise; } finally { window.eventsLoadingPromise = null; }
  }

  // Expose API
  window.loadEvents = loadEvents;
  window.updateEventsSummary = updateEventsSummary;
  window.displayEvents = (events) => displayEvents(events, window.apiService || window.api);
})();
