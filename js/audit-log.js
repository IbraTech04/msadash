// ========== AUDIT LOG VIEWER ==========
// Module for displaying and filtering audit events

(function() {
  'use strict';

  // State
  let auditEvents = [];
  let filteredEvents = [];
  let userNicknameCache = {}; // Cache for resolved usernames
  let currentPage = 1;
  const pageSize = 25;

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    setupAuditLogFilters();
    setupAuditLogPagination();
  });

  // ========== API FUNCTIONS ==========

  async function fetchAuditEvents() {
    try {
      showAuditLoading();
      const response = await window.apiService.request('/api/audit-events');
      auditEvents = Array.isArray(response) ? response : [];
      filteredEvents = [...auditEvents];
      currentPage = 1;
      
      // Resolve usernames for performedBy field
      await resolveUsernames(auditEvents);
      
      renderAuditTable();
      updateAuditStats();
      hideAuditLoading();
    } catch (error) {
      console.error('Failed to fetch audit events:', error);
      showAuditError('Failed to load audit events. Please try again.');
      hideAuditLoading();
    }
  }

  async function fetchAuditEventsByDateRange(startDate, endDate) {
    try {
      showAuditLoading();
      const params = new URLSearchParams({
        start: startDate,
        end: endDate
      });
      const response = await window.apiService.request(`/api/audit-events/daterange?${params}`);
      auditEvents = Array.isArray(response) ? response : [];
      filteredEvents = [...auditEvents];
      currentPage = 1;
      
      // Resolve usernames for performedBy field
      await resolveUsernames(auditEvents);
      
      renderAuditTable();
      updateAuditStats();
      hideAuditLoading();
    } catch (error) {
      console.error('Failed to fetch audit events by date range:', error);
      showAuditError('Failed to load audit events. Please try again.');
      hideAuditLoading();
    }
  }

  async function fetchAuditEventsByType(eventType) {
    try {
      showAuditLoading();
      const response = await window.apiService.request(`/api/audit-events/type/${encodeURIComponent(eventType)}`);
      auditEvents = Array.isArray(response) ? response : [];
      filteredEvents = [...auditEvents];
      currentPage = 1;
      
      // Resolve usernames for performedBy field
      await resolveUsernames(auditEvents);
      
      renderAuditTable();
      updateAuditStats();
      hideAuditLoading();
    } catch (error) {
      console.error('Failed to fetch audit events by type:', error);
      showAuditError('Failed to load audit events. Please try again.');
      hideAuditLoading();
    }
  }

  async function fetchAuditEventsByUser(userId) {
    try {
      showAuditLoading();
      const response = await window.apiService.request(`/api/audit-events/user/${encodeURIComponent(userId)}`);
      auditEvents = Array.isArray(response) ? response : [];
      filteredEvents = [...auditEvents];
      currentPage = 1;
      
      // Resolve usernames for performedBy field
      await resolveUsernames(auditEvents);
      
      renderAuditTable();
      updateAuditStats();
      hideAuditLoading();
    } catch (error) {
      console.error('Failed to fetch audit events by user:', error);
      showAuditError('Failed to load audit events. Please try again.');
      hideAuditLoading();
    }
  }

  async function fetchAuditEventsByEntity(entityType, entityId) {
    try {
      showAuditLoading();
      const response = await window.apiService.request(`/api/audit-events/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`);
      auditEvents = Array.isArray(response) ? response : [];
      filteredEvents = [...auditEvents];
      currentPage = 1;
      
      // Resolve usernames for performedBy field
      await resolveUsernames(auditEvents);
      
      renderAuditTable();
      updateAuditStats();
      hideAuditLoading();
    } catch (error) {
      console.error('Failed to fetch audit events by entity:', error);
      showAuditError('Failed to load audit events. Please try again.');
      hideAuditLoading();
    }
  }

  // ========== USERNAME RESOLUTION ==========

  /**
   * Resolve user IDs to usernames using bulk API
   * - ID of "0" or 0 = Bot
   * - Other IDs = Discord user IDs to resolve
   */
  async function resolveUsernames(events) {
    // Collect unique user IDs that need resolution (exclude 0/bot and already cached)
    const userIdsToResolve = new Set();
    
    for (const event of events) {
      const performedBy = event.performedBy;
      if (!performedBy) continue;
      
      // Skip if it's the bot (id = 0)
      if (performedBy === '0' || performedBy === 0) continue;
      
      // Skip if already cached
      if (userNicknameCache[performedBy]) continue;
      
      // Check if it looks like a numeric ID (Discord snowflake)
      if (/^\d+$/.test(String(performedBy))) {
        userIdsToResolve.add(String(performedBy));
      }
    }

    // If there are IDs to resolve, fetch them in bulk
    if (userIdsToResolve.size > 0) {
      try {
        const userIds = Array.from(userIdsToResolve);
        const nicknames = await window.apiService.bulkGetNicknames(userIds);
        
        // Cache the results
        if (nicknames && typeof nicknames === 'object') {
          Object.assign(userNicknameCache, nicknames);
        }
      } catch (error) {
        console.warn('Failed to resolve usernames:', error);
      }
    }
  }

  /**
   * Get display name for a performedBy value
   */
  function getPerformerDisplayName(performedBy) {
    if (!performedBy) return 'Unknown';
    
    // Bot check (id = 0)
    if (performedBy === '0' || performedBy === 0) {
      return '🤖 Bot';
    }
    
    const performedByStr = String(performedBy);
    
    // Check cache for resolved nickname
    if (userNicknameCache[performedByStr]) {
      return userNicknameCache[performedByStr];
    }
    
    // If it's a numeric ID that wasn't resolved, show it with user prefix
    if (/^\d+$/.test(performedByStr)) {
      return `User #${performedByStr.slice(-4)}`; // Show last 4 digits
    }
    
    // Otherwise return as-is (might already be a username)
    return performedBy;
  }

  // ========== RENDERING FUNCTIONS ==========

  function renderAuditTable() {
    const container = document.getElementById('audit-table-container');
    if (!container) return;

    if (filteredEvents.length === 0) {
      container.innerHTML = `
        <div class="audit-empty">
          <span class="empty-icon">📋</span>
          <p>No audit events found</p>
          <p class="empty-hint">Try adjusting your filters or date range</p>
        </div>
      `;
      updatePaginationInfo();
      return;
    }

    // Paginate
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageEvents = filteredEvents.slice(startIdx, endIdx);

    const tableHtml = `
      <table class="audit-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event Type</th>
            <th>Entity</th>
            <th>Performed By</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${pageEvents.map(event => renderAuditRow(event)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
    updatePaginationInfo();
  }

  function renderAuditRow(event) {
    const timestamp = formatTimestamp(event.eventTimestamp);
    const eventTypeClass = getEventTypeClass(event.eventType);
    const entityDisplay = event.entityType ? `${event.entityType} #${event.entityId || '-'}` : '-';
    const performerDisplay = getPerformerDisplayName(event.performedBy);
    const isBot = event.performedBy === '0' || event.performedBy === 0;
    
    return `
      <tr class="audit-row" data-id="${event.id}">
        <td class="audit-timestamp">
          <span class="timestamp-date">${timestamp.date}</span>
          <span class="timestamp-time">${timestamp.time}</span>
        </td>
        <td>
          <span class="audit-event-type ${eventTypeClass}">${escapeHtml(event.eventType || 'Unknown')}</span>
        </td>
        <td class="audit-entity">
          <span class="entity-type">${escapeHtml(event.entityType || '-')}</span>
          ${event.entityId ? `<span class="entity-id">#${event.entityId}</span>` : ''}
        </td>
        <td class="audit-user ${isBot ? 'is-bot' : ''}">${escapeHtml(performerDisplay)}</td>
        <td class="audit-details">
          <button class="details-btn" onclick="window.MSA_AuditLog.showEventDetails(${event.id})">
            View Details
          </button>
        </td>
      </tr>
    `;
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return { date: '-', time: '-' };
    
    try {
      const date = new Date(timestamp);
      return {
        date: date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      };
    } catch (e) {
      return { date: '-', time: '-' };
    }
  }

  function getEventTypeClass(eventType) {
    if (!eventType) return '';
    const type = eventType.toLowerCase();
    
    if (type.includes('create') || type.includes('add')) return 'event-create';
    if (type.includes('update') || type.includes('modify') || type.includes('edit')) return 'event-update';
    if (type.includes('delete') || type.includes('remove')) return 'event-delete';
    if (type.includes('login') || type.includes('auth')) return 'event-auth';
    if (type.includes('error') || type.includes('fail')) return 'event-error';
    return 'event-default';
  }

  function updateAuditStats() {
    const totalEl = document.getElementById('audit-total-count');
    const filteredEl = document.getElementById('audit-filtered-count');
    
    if (totalEl) totalEl.textContent = auditEvents.length;
    if (filteredEl) filteredEl.textContent = filteredEvents.length;

    // Update event type breakdown
    const typeBreakdown = {};
    filteredEvents.forEach(event => {
      const type = event.eventType || 'Unknown';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    const breakdownContainer = document.getElementById('audit-type-breakdown');
    if (breakdownContainer) {
      const sortedTypes = Object.entries(typeBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      breakdownContainer.innerHTML = sortedTypes.map(([type, count]) => `
        <div class="type-stat">
          <span class="type-name">${escapeHtml(type)}</span>
          <span class="type-count">${count}</span>
        </div>
      `).join('');
    }
  }

  // ========== FILTERING ==========

  function setupAuditLogFilters() {
    // Search input
    const searchInput = document.getElementById('audit-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        applyFilters();
      }, 300));
    }

    // Event type filter
    const typeFilter = document.getElementById('audit-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        applyFilters();
      });
    }

    // Entity type filter
    const entityFilter = document.getElementById('audit-entity-filter');
    if (entityFilter) {
      entityFilter.addEventListener('change', () => {
        applyFilters();
      });
    }

    // Date range filters
    const startDate = document.getElementById('audit-start-date');
    const endDate = document.getElementById('audit-end-date');
    if (startDate && endDate) {
      startDate.addEventListener('change', () => applyFilters());
      endDate.addEventListener('change', () => applyFilters());
    }
  }

  function applyFilters() {
    const searchTerm = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('audit-type-filter')?.value || '';
    const entityFilter = document.getElementById('audit-entity-filter')?.value || '';
    const startDate = document.getElementById('audit-start-date')?.value;
    const endDate = document.getElementById('audit-end-date')?.value;

    filteredEvents = auditEvents.filter(event => {
      // Search filter
      if (searchTerm) {
        const searchFields = [
          event.eventType,
          event.entityType,
          event.performedBy,
          event.eventDetails
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchFields.includes(searchTerm)) return false;
      }

      // Event type filter
      if (typeFilter && event.eventType !== typeFilter) return false;

      // Entity type filter
      if (entityFilter && event.entityType !== entityFilter) return false;

      // Date range filter
      if (startDate || endDate) {
        const eventDate = event.eventTimestamp ? new Date(event.eventTimestamp) : null;
        if (eventDate) {
          if (startDate && eventDate < new Date(startDate)) return false;
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            if (eventDate > endDateTime) return false;
          }
        }
      }

      return true;
    });

    currentPage = 1;
    renderAuditTable();
    updateAuditStats();
    updateActiveFilters();
  }

  function resetFilters() {
    const searchInput = document.getElementById('audit-search');
    const typeFilter = document.getElementById('audit-type-filter');
    const entityFilter = document.getElementById('audit-entity-filter');
    const startDate = document.getElementById('audit-start-date');
    const endDate = document.getElementById('audit-end-date');

    if (searchInput) searchInput.value = '';
    if (typeFilter) typeFilter.value = '';
    if (entityFilter) entityFilter.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';

    filteredEvents = [...auditEvents];
    currentPage = 1;
    renderAuditTable();
    updateAuditStats();
    updateActiveFilters();
  }

  function updateActiveFilters() {
    const container = document.getElementById('audit-active-filters');
    if (!container) return;

    const filters = [];
    
    const searchTerm = document.getElementById('audit-search')?.value;
    if (searchTerm) filters.push({ label: `Search: "${searchTerm}"`, key: 'search' });
    
    const typeFilter = document.getElementById('audit-type-filter')?.value;
    if (typeFilter) filters.push({ label: `Type: ${typeFilter}`, key: 'type' });
    
    const entityFilter = document.getElementById('audit-entity-filter')?.value;
    if (entityFilter) filters.push({ label: `Entity: ${entityFilter}`, key: 'entity' });
    
    const startDate = document.getElementById('audit-start-date')?.value;
    const endDate = document.getElementById('audit-end-date')?.value;
    if (startDate || endDate) {
      const dateLabel = startDate && endDate 
        ? `Date: ${startDate} - ${endDate}`
        : startDate ? `From: ${startDate}` : `Until: ${endDate}`;
      filters.push({ label: dateLabel, key: 'date' });
    }

    container.innerHTML = filters.map(f => `
      <span class="active-filter-tag">
        ${escapeHtml(f.label)}
        <button class="filter-remove" onclick="window.MSA_AuditLog.clearFilter('${f.key}')">&times;</button>
      </span>
    `).join('');
  }

  function clearFilter(key) {
    switch (key) {
      case 'search':
        document.getElementById('audit-search').value = '';
        break;
      case 'type':
        document.getElementById('audit-type-filter').value = '';
        break;
      case 'entity':
        document.getElementById('audit-entity-filter').value = '';
        break;
      case 'date':
        document.getElementById('audit-start-date').value = '';
        document.getElementById('audit-end-date').value = '';
        break;
    }
    applyFilters();
  }

  // ========== PAGINATION ==========

  function setupAuditLogPagination() {
    const prevBtn = document.getElementById('audit-prev-page');
    const nextBtn = document.getElementById('audit-next-page');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderAuditTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredEvents.length / pageSize);
        if (currentPage < maxPage) {
          currentPage++;
          renderAuditTable();
        }
      });
    }
  }

  function updatePaginationInfo() {
    const infoEl = document.getElementById('audit-page-info');
    const prevBtn = document.getElementById('audit-prev-page');
    const nextBtn = document.getElementById('audit-next-page');

    const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
    
    if (infoEl) {
      infoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }
  }

  // ========== EVENT DETAILS MODAL ==========

  function showEventDetails(eventId) {
    const event = auditEvents.find(e => e.id === eventId);
    if (!event) {
      showToast('Event not found', 'error');
      return;
    }

    const timestamp = formatTimestamp(event.eventTimestamp);
    const performerDisplay = getPerformerDisplayName(event.performedBy);
    const isBot = event.performedBy === '0' || event.performedBy === 0;
    let detailsHtml = '';
    
    try {
      const details = event.eventDetails ? JSON.parse(event.eventDetails) : null;
      if (details && typeof details === 'object') {
        detailsHtml = `<pre class="details-json">${escapeHtml(JSON.stringify(details, null, 2))}</pre>`;
      } else {
        detailsHtml = `<p class="details-text">${escapeHtml(event.eventDetails || 'No details available')}</p>`;
      }
    } catch (e) {
      detailsHtml = `<p class="details-text">${escapeHtml(event.eventDetails || 'No details available')}</p>`;
    }

    const modalContent = `
      <div class="audit-detail-modal">
        <div class="audit-detail-header">
          <h3>Audit Event Details</h3>
          <span class="audit-event-type ${getEventTypeClass(event.eventType)}">${escapeHtml(event.eventType || 'Unknown')}</span>
        </div>
        
        <div class="audit-detail-grid">
          <div class="detail-item">
            <label>Event ID</label>
            <span>${event.id}</span>
          </div>
          <div class="detail-item">
            <label>Timestamp</label>
            <span>${timestamp.date} ${timestamp.time}</span>
          </div>
          <div class="detail-item">
            <label>Entity Type</label>
            <span>${escapeHtml(event.entityType || '-')}</span>
          </div>
          <div class="detail-item">
            <label>Entity ID</label>
            <span>${event.entityId || '-'}</span>
          </div>
          <div class="detail-item">
            <label>Performed By</label>
            <span class="${isBot ? 'is-bot' : ''}">${escapeHtml(performerDisplay)}</span>
          </div>
        </div>

        <div class="audit-detail-section">
          <label>Event Details</label>
          ${detailsHtml}
        </div>
      </div>
    `;

    // Use existing modal system if available, otherwise create simple modal
    if (typeof window.showModal === 'function') {
      window.showModal('Audit Event', modalContent);
    } else {
      showSimpleModal(modalContent);
    }
  }

  function showSimpleModal(content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('audit-modal-overlay');
    if (existingModal) existingModal.remove();

    const modalHtml = `
      <div id="audit-modal-overlay" class="audit-modal-overlay" onclick="window.MSA_AuditLog.closeModal(event)">
        <div class="audit-modal-content" onclick="event.stopPropagation()">
          <button class="audit-modal-close" onclick="window.MSA_AuditLog.closeModal()">&times;</button>
          ${content}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('audit-modal-overlay');
    if (modal) modal.remove();
  }

  // ========== UI HELPERS ==========

  function showAuditLoading() {
    const container = document.getElementById('audit-table-container');
    if (container) {
      container.innerHTML = `
        <div class="audit-loading">
          <span class="loading-spinner">🔄</span>
          <p>Loading audit events...</p>
        </div>
      `;
    }
  }

  function hideAuditLoading() {
    // Loading is replaced by content in renderAuditTable
  }

  function showAuditError(message) {
    const container = document.getElementById('audit-table-container');
    if (container) {
      container.innerHTML = `
        <div class="audit-error">
          <span class="error-icon">❌</span>
          <p>${escapeHtml(message)}</p>
          <button class="action-btn" onclick="window.MSA_AuditLog.refresh()">Try Again</button>
        </div>
      `;
    }
  }

  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ========== EXPORT CSV ==========

  function exportAuditCsv() {
    if (filteredEvents.length === 0) {
      showToast('No events to export', 'warning');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Event Type', 'Entity Type', 'Entity ID', 'Performed By', 'Details'];
    const rows = filteredEvents.map(event => [
      event.id,
      event.eventTimestamp || '',
      event.eventType || '',
      event.entityType || '',
      event.entityId || '',
      event.performedBy || '',
      (event.eventDetails || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast('Audit log exported successfully', 'success');
  }

  // ========== POPULATE FILTER OPTIONS ==========

  function populateFilterOptions() {
    // Populate event type options
    const eventTypes = [...new Set(auditEvents.map(e => e.eventType).filter(Boolean))].sort();
    const typeSelect = document.getElementById('audit-type-filter');
    if (typeSelect) {
      const currentValue = typeSelect.value;
      typeSelect.innerHTML = '<option value="">All Event Types</option>' + 
        eventTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
      typeSelect.value = currentValue;
    }

    // Populate entity type options
    const entityTypes = [...new Set(auditEvents.map(e => e.entityType).filter(Boolean))].sort();
    const entitySelect = document.getElementById('audit-entity-filter');
    if (entitySelect) {
      const currentValue = entitySelect.value;
      entitySelect.innerHTML = '<option value="">All Entity Types</option>' + 
        entityTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
      entitySelect.value = currentValue;
    }
  }

  // ========== INITIALIZATION ==========

  async function initAuditLog() {
    await fetchAuditEvents();
    populateFilterOptions();
  }

  function refresh() {
    initAuditLog();
  }

  // ========== EXPOSE PUBLIC API ==========

  window.MSA_AuditLog = {
    init: initAuditLog,
    refresh: refresh,
    fetchAll: fetchAuditEvents,
    fetchByDateRange: fetchAuditEventsByDateRange,
    fetchByType: fetchAuditEventsByType,
    fetchByUser: fetchAuditEventsByUser,
    fetchByEntity: fetchAuditEventsByEntity,
    applyFilters: applyFilters,
    resetFilters: resetFilters,
    clearFilter: clearFilter,
    exportCsv: exportAuditCsv,
    showEventDetails: showEventDetails,
    closeModal: closeModal
  };

})();
