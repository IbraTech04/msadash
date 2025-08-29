// Configuration (loaded from config.js)
const API_CONFIG = window.MSA_CONFIG?.api || {
  baseUrl: 'http://localhost:5000',
  apiKey: 'your-secret-api-key',
  timeout: 10000,
  retryAttempts: 3
};

const FEATURES = window.MSA_CONFIG?.features || {
  useApi: true,
  showApiStatus: true,
  enableNotifications: false,
  enableOfflineMode: false
};

// CSV URLs removed – API only mode

// Wait for DOM to fully load
document.addEventListener("DOMContentLoaded", () => {
  toggleCollapsibles();
  setupModeToggle();
  checkApiHealth();
  loadApiEvents();
  loadApiCalendar();
  loadCountdowns();
  loadTeamRoles();
  
  // Auto-expand the calendar section for better UX
  setTimeout(() => {
    const calendarCollapsible = Array.from(document.querySelectorAll('.collapsible'))
      .find(btn => btn.textContent.includes('Interactive Deadline Calendar'));
    
    if (calendarCollapsible) {
      console.log('📅 Auto-expanding calendar section for proper rendering');
      calendarCollapsible.click(); // This will trigger the calendar re-render
    }
  }, 500); // Small delay to ensure everything is loaded
  
  const refreshInterval = window.MSA_CONFIG?.ui?.refreshInterval || 300000;
  setInterval(() => {
    console.log('🔄 Auto-refreshing data...');
    loadApiEvents();
    loadApiCalendar();
    loadCountdowns();
  }, refreshInterval);
});

// API Helper Functions
async function makeApiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  const defaultOptions = {
    headers: {
      'X-API-Key': API_CONFIG.apiKey,
      'Content-Type': 'application/json'
    }
  };
  
  // Add timeout support for older browsers
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    console.log(`🔄 Making API request to: ${url}`); // Debug log
    
    const response = await fetch(url, { 
      ...defaultOptions, 
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`📡 API Response status: ${response.status}`); // Debug log
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const jsonData = await response.json();
    console.log(`📦 API Response data:`, jsonData); // Debug log
    
    return jsonData;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API request error:', error);
    if (FEATURES.showApiStatus) {
      showApiError(error.message);
    }
    return null;
  }
}

// Check API Health
async function checkApiHealth() {
  if (!FEATURES.showApiStatus) return;
  
  const healthData = await makeApiRequest('/api/health');
  
  if (healthData) {
    console.log('✅ API Health Check:', healthData);
    showApiStatus('✅ API Connected', 'success');
  } else {
    showApiStatus('❌ API Disconnected', 'error');
  }
}

// Show API status
function showApiStatus(message, type) {
  const statusEl = document.getElementById('api-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `api-status ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusEl.style.opacity = '0.5';
      }, 3000);
    }
  }
}

// Show API errors
function showApiError(message) {
  const errorEl = document.getElementById('api-error');
  if (errorEl) {
    errorEl.textContent = `API Error: ${message}`;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

// Toggle collapsibles
function toggleCollapsibles() {
  document.querySelectorAll(".collapsible").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const content = btn.nextElementSibling;
      const wasHidden = content.style.display === "none" || content.style.display === "";
      content.style.display = content.style.display === "block" ? "none" : "block";
      
      // If we just opened the calendar section, re-render the calendar
      if (wasHidden && content.style.display === "block") {
        const calendarEl = content.querySelector("#calendar");
        if (calendarEl && window.__msaCalendarInstance) {
          // Small delay to ensure the container is fully visible
          setTimeout(() => {
            console.log('📅 Re-rendering calendar after collapsible opened');
            window.__msaCalendarInstance.updateSize();
            window.__msaCalendarInstance.render();
          }, 100);
        }
      }
    });
  });
}

// Toggle night mode + switch logo
function setupModeToggle() {
  const toggleButton = document.getElementById("toggle-mode");
  toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("night-mode");
    const logo = document.getElementById("logo");
    const isNightMode = document.body.classList.contains("night-mode");
    
    logo.src = isNightMode ? "msa_logo_white.png" : "msa_logo.png";
    toggleButton.textContent = isNightMode ? "☀️ Toggle Day Mode" : "🌙 Toggle Night Mode";
  });
}

// Removed CSV parser – API only mode

// === Load EVENTS from API ===
async function loadApiEvents() {
  const container = document.getElementById("task-container");
  container.innerHTML = '<div class="loading">🔄 Loading events from API...</div>';
  
  const data = await makeApiRequest('/api/events');
  
  console.log('API Events Response:', data); // Debug log
  
  if (!data || !data.success || !Array.isArray(data.events)) {
    container.innerHTML = '<div class="error">❌ Failed to load events from API.</div>';
    console.log('API events payload invalid:', data);
    return;
  }
  
  container.innerHTML = "";
  
  // Group events by status
  const eventsByStatus = {};
  const statusOrder = ['📥 In Queue', '🔄 In Progress', '⏳ Awaiting Approval', '⏳ Awaiting Posting', '✅ Done', ''];
  
  data.events.forEach(event => {
    const status = event.status || 'No Status';
    if (!eventsByStatus[status]) eventsByStatus[status] = [];
    eventsByStatus[status].push(event);
  });
  
  // Create status summary
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "event-summary";
  summaryDiv.innerHTML = `
    <h3>📊 Event Summary (${data.count} total)</h3>
    <div class="status-counts">
      ${statusOrder.map(status => {
        const count = eventsByStatus[status]?.length || 0;
        const displayStatus = status || 'No Status';
        return `<span class="status-badge status-${normalizeStatusForCSS(status)}">${displayStatus}: ${count}</span>`;
      }).join('')}
    </div>
  `;
  container.appendChild(summaryDiv);
  
  // Display events by status
  statusOrder.forEach(status => {
    if (!eventsByStatus[status] || eventsByStatus[status].length === 0) return;
    
    const section = document.createElement("div");
    section.className = "status-section";
    section.innerHTML = `<h3>${status} (${eventsByStatus[status].length})</h3>`;
    
    eventsByStatus[status].forEach(event => {
      const dueDate = new Date(event.posting_date);
      const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;
      const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
      
      const urgencyClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
      
      section.innerHTML += `
        <div class="event-card ${urgencyClass}">
          <div class="event-header">
            <strong>${event.title}</strong>
            <span class="event-type">${event.request_type}</span>
          </div>
          <div class="event-details">
            <div><strong>Description:</strong> ${event.description}</div>
            <div><strong>Department:</strong> ${event.department}${event.subgroup ? ` (${event.subgroup})` : ''}</div>
            <div><strong>Assigned to:</strong> ${event.assigned_to_name || 'Unassigned'}</div>
            <div><strong>Requested by:</strong> ${event.requester_name}</div>
            <div><strong>Due Date:</strong> 
              <span class="due-date ${urgencyClass}">
                ${dueDate.toLocaleDateString()} 
                ${isOverdue ? `(${Math.abs(daysUntilDue)} days overdue!)` : 
                  isUrgent ? `(${daysUntilDue} days left!)` : 
                  `(${daysUntilDue} days left)`}
              </span>
            </div>
            <div><strong>Visibility:</strong> ${event.visibility}</div>
            ${event.notes ? `<div><strong>Notes:</strong> ${event.notes}</div>` : ''}
            <div class="event-meta">
              <small>Created: ${new Date(event.created_at).toLocaleDateString()}</small>
            </div>
          </div>
        </div>
      `;
    });
    
    container.appendChild(section);
  });
}

// Removed legacy loadTasks (CSV)

// === Load COUNTDOWNS (placeholder) ===
function loadCountdowns() {
  const container = document.getElementById("countdowns");
  if (container) {
    container.innerHTML = '<em>No countdown data (API endpoint not implemented)</em>';
  }
}

// === Load TEAM (placeholder) ===
function loadTeamRoles() {
  const container = document.getElementById("team-roles");
  if (container) {
    container.innerHTML = '<em>No team data (API endpoint not implemented)</em>';
  }
}

// Helper function to normalize status for CSS class
function normalizeStatusForCSS(status) {
  if (!status || status === '') return 'nostatus';
  return status.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

// Get color for event status
function getEventColor(status) {
  const statusColors = {
    '📥 In Queue': '#6c757d',          // Gray
    '🔄 In Progress': '#007bff',       // Blue  
    '⏳ Awaiting Approval': '#ffc107', // Yellow
    '⏳ Awaiting Posting': '#ffc107',  // Yellow
    '✅ Done': '#28a745',              // Green
    '': '#6c757d',                     // Default gray for empty status
    'No Status': '#6c757d'             // Default gray for no status
  };
  
  return statusColors[status] || '#6c757d'; // Default to gray
}

// === Load CALENDAR with API Events ===
// === Load CALENDAR with API Events ===
async function loadApiCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;
  
  // Get events from API
  const data = await makeApiRequest('/api/events');
  let events = [];
  
  console.log('API Calendar Response:', data); // Debug log
  
  if (data && data.success && data.events) {
    // Convert API events to calendar format
    events = data.events.map(event => {
      const dueDate = new Date(event.posting_date);
      const isOverdue = dueDate < new Date();
      const isUrgent = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) <= 2;
      
      return {
        title: `${event.title}${event.status ? ` (${event.status})` : ' (No Status)'}`,
        start: event.posting_date.split('T')[0], // Format as YYYY-MM-DD
        extendedProps: {
          description: event.description,
          assignedTo: event.assigned_to_name,
          requester: event.requester_name,
          department: event.department,
          status: event.status,
          requestType: event.request_type,
          notes: event.notes
        },
        backgroundColor: getEventColor(event.status),
        borderColor: getEventColor(event.status),
        classNames: [
          isOverdue ? 'event-overdue' : '',
          isUrgent ? 'event-urgent' : '',
          `status-${normalizeStatusForCSS(event.status)}`
        ].filter(Boolean)
      };
    });
  } else {
    console.warn('Calendar API response invalid; no events rendered');
  }

  // Destroy previous instance first (idempotent)
  if (window.__msaCalendarInstance) {
    try { window.__msaCalendarInstance.destroy(); } catch (e) { /* ignore */ }
    window.__msaCalendarInstance = null;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",
    events,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    eventClick: function(info) {
      showEventModal(info.event);
    },
    eventDidMount: function(info) {
      // Simple tooltip
      const props = info.event.extendedProps;
      const tooltip = document.createElement('div');
      tooltip.className = 'fc-tooltip';
      tooltip.innerHTML = `
        <strong>${info.event.title}</strong><br>
        ${props.department || ''} ${props.requestType || ''}<br>
        ${props.assignedTo ? 'Assigned: ' + props.assignedTo : ''}
      `;
      info.el.appendChild(tooltip);
    }
  });

  calendar.render();
  window.__msaCalendarInstance = calendar;

  // Add ResizeObserver to handle container visibility changes
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        // If the calendar container becomes visible and has size, re-render
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          console.log('📅 Calendar container resized, updating calendar');
          calendar.updateSize();
        }
      }
    });
    resizeObserver.observe(calendarEl);
  }
}

// Modal for calendar events
function showEventModal(event) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">×</button>
      <h2>${event.title}</h2>
      <div class="modal-details">
        <p><strong>Description:</strong> ${event.extendedProps.description || ''}</p>
        <p><strong>Due Date:</strong> ${event.start ? event.start.toLocaleDateString() : ''}</p>
        <p><strong>Status:</strong> ${event.extendedProps.status || ''}</p>
        <p><strong>Type:</strong> ${event.extendedProps.requestType || ''}</p>
        <p><strong>Department:</strong> ${event.extendedProps.department || ''}</p>
        <p><strong>Assigned to:</strong> ${event.extendedProps.assignedTo || 'Unassigned'}</p>
        <p><strong>Requested by:</strong> ${event.extendedProps.requester || ''}</p>
        ${event.extendedProps.notes ? `<p><strong>Notes:</strong> ${event.extendedProps.notes}</p>` : ''}
      </div>
    </div>`;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('.modal-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
}

