// Utilities and Modal module: toast, API status, CSV, debounce, escapeHtml, and event modal
// Depends on window.apiService/window.api for showEventModal

(function(){
  let toastTimeout = null;
  
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Clear any existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    
    // Remove show class first to reset animation
    toast.classList.remove('show');
    
    // Use setTimeout to allow CSS transition to reset
    setTimeout(() => {
      toast.textContent = message;
      toast.className = `toast ${type} show`;
      
      // Set new timeout to hide
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout = null;
      }, 3000);
    }, 10);
  }

  function updateApiStatus(message, type) {
    const statusEl = document.getElementById('api-status');
    if (!statusEl) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      if (message.includes('Connected')) statusEl.textContent = '✅';
      else if (message.includes('Error') || message.includes('Disconnected')) statusEl.textContent = '❌';
      else if (message.includes('Not logged in')) statusEl.textContent = '🔐';
      else statusEl.textContent = '🔄';
    } else {
      statusEl.textContent = message;
    }
    statusEl.className = `api-status ${type}`;
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function debounce(fn, wait) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this,args), wait); };
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showEventModal(event) {
    const api = window.apiService || window.api;
    const discordLink = api.generateDiscordChannelLink(event.channelID);
    const dueDate = new Date(event.posting_date + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const isDone = !!(event.status && event.status.includes('Done'));
    const isBlocked = !!(event.status && event.status.includes('Blocked'));
    const isOverdue = daysUntilDue < 0 && !isDone && !isBlocked;
    const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0 && !isDone && !isBlocked;
    const urgencyClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
    const urgencyText = isOverdue ? `⚠️ ${Math.abs(daysUntilDue)} days overdue` : isUrgent ? `🔥 ${daysUntilDue} days left` : `📅 ${daysUntilDue} days until due`;
    const statusColor = api.getStatusColor(event.status);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modern-modal">
        <button class="modal-close" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="modal-header">
          <div class="modal-title-section">
            <div class="modal-type-badge">${api.formatRequestType(event.request_type)}</div>
            <h2 class="modal-title">${escapeHtml(event.title)}</h2>
          </div>
          <div class="modal-status-badge" style="background-color: ${statusColor}20; color: ${statusColor}; border-color: ${statusColor}">
            ${event.status || 'No Status'}
          </div>
        </div>
        <div class="modal-body">
          <div class="modal-section">
            <div class="modal-section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3>Description</h3>
            </div>
            <p class="modal-description">${escapeHtml(event.description) || 'No description provided'}</p>
          </div>
          <div class="modal-details-grid">
            <div class="modal-detail-card ${urgencyClass}">
              <div class="modal-detail-icon">📅</div>
              <div class="modal-detail-content">
                <div class="modal-detail-label">Due Date</div>
                <div class="modal-detail-value">${dueDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                <div class="modal-detail-sub ${urgencyClass}">${urgencyText}</div>
              </div>
            </div>
            <div class="modal-detail-card">
              <div class="modal-detail-icon">👥</div>
              <div class="modal-detail-content">
                <div class="modal-detail-label">Requested By</div>
                <div class="modal-detail-value">${escapeHtml(event.requester_name || 'Unknown')}</div>
                ${event.department || event.requester_department_name ? `<div class="modal-detail-sub">${escapeHtml(event.department || event.requester_department_name)}</div>` : ''}
              </div>
            </div>
            <div class="modal-detail-card">
              <div class="modal-detail-icon">👤</div>
              <div class="modal-detail-content">
                <div class="modal-detail-label">Assigned To</div>
                <div class="modal-detail-value">${escapeHtml(event.assigned_to_name) || 'Unassigned'}</div>
                ${event.assigned_to_id ? `<div class="modal-detail-sub">ID: ${event.assigned_to_id}</div>` : ''}
              </div>
            </div>
            ${event.room ? `
            <div class="modal-detail-card">
              <div class="modal-detail-icon">📍</div>
              <div class="modal-detail-content">
                <div class="modal-detail-label">Location</div>
                <div class="modal-detail-value">${escapeHtml(event.room)}</div>
              </div>
            </div>` : ''}
            <div class="modal-detail-card">
              <div class="modal-detail-icon">🕒</div>
              <div class="modal-detail-content">
                <div class="modal-detail-label">Created</div>
                <div class="modal-detail-value">${new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div class="modal-detail-sub">${new Date(event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <a href="${discordLink}" target="_blank" class="modal-action-btn primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Open in Discord
            </a>
            ${event.signup_url ? `
            <a href="${escapeHtml(event.signup_url)}" target="_blank" class="modal-action-btn secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open Signup Form
            </a>` : ''}
          </div>
          <div class="modal-metadata">
            <div class="modal-metadata-item"><span class="modal-metadata-label">Channel ID:</span><span class="modal-metadata-value">${event.channelID}</span></div>
            <div class="modal-metadata-item"><span class="modal-metadata-label">Last Updated:</span><span class="modal-metadata-value">${new Date(event.updated_at || event.created_at).toLocaleDateString()} at ${new Date(event.updated_at || event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => { modal.classList.add('modal-active'); });
    const close = () => { modal.classList.add('closing'); setTimeout(() => modal.remove(), 350); };
    modal.querySelector('.modal-close').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
  }

  // Expose globals for backward compatibility
  window.showToast = showToast;
  window.updateApiStatus = updateApiStatus;
  window.downloadCSV = downloadCSV;
  window.debounce = debounce;
  window.escapeHtml = escapeHtml;
  window.showEventModal = showEventModal;
})();
