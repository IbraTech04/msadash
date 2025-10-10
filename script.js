// ========== MSA MARKETING COMMAND CENTER - DASHBOARD SCRIPT ==========

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

// Global state
let currentEvents = [];
let currentCalendar = null;
let charts = {};
let calendarLoading = false;
let eventsLoadingPromise = null; // prevent duplicate fetches

// Generate a stable hash for events lacking an explicit id (prevents duplicates across reloads)
function generateStableEventId(event) {
  const base = [
    event.title || '',
    event.posting_date || '',
    event.request_type || '',
    event.department || '',
    event.assigned_to_name || '',
    event.requester_name || ''
  ].join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  return `h${Math.abs(hash)}`;
}

// Format request type with icon and styling
function formatRequestType(requestType) {
  if (!requestType) return 'General';
  
  const type = requestType.toLowerCase();
  let icon = '';
  let displayText = requestType;
  
  // Add icons for specific request types
  if (type.includes('reel')) {
    icon = '📹 ';
    displayText = requestType.toUpperCase();
  } else if (type.includes('post')) {
    icon = '📱 ';
    displayText = requestType.toUpperCase();
  } else if (type.includes('story')) {
    icon = '📸 ';
  } else if (type.includes('video')) {
    icon = '🎥 ';
  } else if (type.includes('graphic') || type.includes('design')) {
    icon = '🎨 ';
  } else if (type.includes('flyer') || type.includes('poster')) {
    icon = '📄 ';
  } else if (type.includes('event')) {
    icon = '📅 ';
  } else if (type.includes('photography') || type.includes('photo')) {
    icon = '📷 ';
  }
  
  return `${icon}${displayText}`;
}

// Wait for DOM to fully load
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
  setupNavigation();
  setupModeToggle();
  applyInitialTheme();
  checkApiHealth();
  loadAllData();
  setupAutoRefresh();
});

// Handle viewport changes for mobile responsive API status
window.addEventListener('resize', () => {
  // Re-trigger API status update on resize to adjust mobile/desktop display
  const statusEl = document.getElementById('api-status');
  if (statusEl) {
    const currentClass = statusEl.className;
    const type = currentClass.includes('success') ? 'success' : 
                 currentClass.includes('error') ? 'error' : 'loading';
    const message = statusEl.textContent.includes('✅') || statusEl.textContent === 'Connected' ? '✅ Connected' :
                   statusEl.textContent.includes('❌') || statusEl.textContent === 'Disconnected' ? '❌ Disconnected' : '🔄 Connecting...';
    updateApiStatus(message, type);
  }
});

// ========== INITIALIZATION ==========
function initializeDashboard() {
  console.log('🚀 Initializing MSA Marketing Dashboard...');
  
  // Setup sidebar toggle for mobile
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
  
  // Initialize charts placeholder
  initializeCharts();
  
  // Setup event filters
  setupEventFilters();
  
  console.log('✅ Dashboard initialized');
}

// ========== NAVIGATION ==========
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute('data-section');
      openSection(sectionId);
    });
  });
}

function openSection(sectionId) {
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
  
  // Show section
  document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
  document.getElementById(sectionId)?.classList.add('active');
  
  // Load section-specific data
  switch(sectionId) {
    case 'calendar':
      loadMainCalendar();
      break;
    case 'kanban':
      loadKanbanBoard();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'team':
      loadTeamData();
      break;
  }
  
  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ========== MODE TOGGLE ==========
function setupModeToggle() {
  const toggleButton = document.getElementById("toggle-mode");
  if (!toggleButton) return;
  
  toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("night-mode");
    const logo = document.getElementById("logo");
    const isNightMode = document.body.classList.contains("night-mode");
    
    if (logo) {
      logo.src = isNightMode ? "msa_logo_white.png" : "msa_logo.png";
    }
    toggleButton.textContent = isNightMode ? "☀️" : "🌙";
    // persist user preference
    try { localStorage.setItem('msa_theme', isNightMode ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    
    // Update charts for night mode
    if (isNightMode) {
      updateChartsForNightMode();
    } else {
      updateChartsForDayMode();
    }
  });
}

// Apply initial theme based on config, saved preference, or OS preference
function applyInitialTheme() {
  try {
    const saved = localStorage.getItem('msa_theme');
    const configTheme = window.MSA_CONFIG?.ui?.theme || 'auto';
    let useDark = false;

    if (saved === 'dark') useDark = true;
    else if (saved === 'light') useDark = false;
    else if (configTheme === 'dark') useDark = true;
    else if (configTheme === 'light') useDark = false;
    else {
      // auto -> follow OS preference
      useDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (useDark) {
      document.body.classList.add('night-mode');
      const logo = document.getElementById('logo');
      if (logo) logo.src = 'msa_logo_white.png';
      const toggleButton = document.getElementById('toggle-mode');
      if (toggleButton) toggleButton.textContent = '☀️';
      updateChartsForNightMode();
    } else {
      document.body.classList.remove('night-mode');
      const logo = document.getElementById('logo');
      if (logo) logo.src = 'msa_logo.png';
      const toggleButton = document.getElementById('toggle-mode');
      if (toggleButton) toggleButton.textContent = '🌙';
      updateChartsForDayMode();
    }
  } catch (e) {
    console.warn('Theme init failed', e);
  }
}

// ========== API FUNCTIONS ==========
async function makeApiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  const defaultOptions = {
    headers: {
      'X-API-Key': API_CONFIG.apiKey,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    }
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    console.log(`🔄 API Request: ${url}`);
    
    const response = await fetch(url, { 
      ...defaultOptions, 
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const jsonData = await response.json();
    console.log(`📦 API Response:`, jsonData);
    
    return jsonData;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API request error:', error);
    showToast(error.message, 'error');
    return null;
  }
}

async function checkApiHealth() {
  if (!FEATURES.showApiStatus) return;
  
  const healthData = await makeApiRequest('/api/health');
  
  if (healthData) {
    console.log('✅ API Health Check:', healthData);
    updateApiStatus('✅ Connected', 'success');
    updateSystemStatus('api-indicator', '🟢');
  } else {
    updateApiStatus('❌ Disconnected', 'error');
    updateSystemStatus('api-indicator', '🔴');
  }
}

function updateApiStatus(message, type) {
  const statusEl = document.getElementById('api-status');
  if (statusEl) {
    // Check if mobile viewport
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Show just the icon on mobile
      if (message.includes('Connected')) {
        statusEl.textContent = '✅';
      } else if (message.includes('Disconnected')) {
        statusEl.textContent = '❌';
      } else {
        statusEl.textContent = '🔄';
      }
    } else {
      // Show full text on desktop
      statusEl.textContent = message;
    }
    
    statusEl.className = `api-status ${type}`;
  }
}

function updateSystemStatus(indicatorId, status) {
  const indicator = document.getElementById(indicatorId);
  if (indicator) {
    indicator.textContent = status;
  }
}

// ========== DATA LOADING ==========
async function loadAllData() {
  console.log('🔄 Loading all dashboard data...');
  // Always load events first once
  await loadEvents();
  // Then parallelize dependent but read-only computations
  await Promise.all([
    loadDashboardStats(),
    loadRecentActivity(),
    loadMiniCalendar()
  ]);
  console.log('✅ All data loaded');
}

async function loadEvents() {
  // Reuse in-flight promise to avoid multiple network calls
  if (eventsLoadingPromise) {
    return eventsLoadingPromise;
  }
  eventsLoadingPromise = (async () => {
    const data = await makeApiRequest('/api/events');
    if (data && data.success && Array.isArray(data.events)) {
      currentEvents = data.events;
      displayEvents(currentEvents);
      updateEventsSummary(currentEvents);
      return currentEvents;
    } else {
      console.warn('Failed to load events');
      return [];
    }
  })();
  try {
    return await eventsLoadingPromise;
  } finally {
    eventsLoadingPromise = null; // allow future refreshes
  }
}

function displayEvents(events) {
  const container = document.getElementById("task-container");
  if (!container) return;
  
  container.innerHTML = '';
  
  if (events.length === 0) {
    container.innerHTML = '<div class="loading">No events found</div>';
    return;
  }
  
  // Group events by status
  const eventsByStatus = {};
  const statusOrder = ['📥 In Queue', '🔄 In Progress', '⏳ Awaiting Approval', '⏳ Awaiting Posting', '✅ Done', ''];
  
  events.forEach(event => {
    const status = event.status || 'No Status';
    if (!eventsByStatus[status]) eventsByStatus[status] = [];
    eventsByStatus[status].push(event);
  });
  
  // Display events by status
  statusOrder.forEach(status => {
    if (!eventsByStatus[status] || eventsByStatus[status].length === 0) return;
    
    const section = document.createElement("div");
    section.className = "status-section";
    
    const header = document.createElement("div");
    header.className = "status-header";
    header.innerHTML = `
      <h3>${status || 'No Status'} (${eventsByStatus[status].length})</h3>
      <span class="collapse-icon">▼</span>
    `;
    
    // Make entire header clickable
    header.addEventListener('click', () => toggleStatusSection(section));
    
    const content = document.createElement("div");
    content.className = "status-content";
    
    eventsByStatus[status].forEach(event => {
      const eventCard = createEventCard(event);
      content.appendChild(eventCard);
    });
    
    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
  });
}

// Toggle status section collapse/expand
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

function createEventCard(event) {
  const dueDate = new Date(event.posting_date);
  const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
  
  const urgencyClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
  const discordLink = generateDiscordChannelLink(event);
  
  const card = document.createElement('div');
  card.className = `event-card ${urgencyClass}`;
  card.innerHTML = `
    <div class="event-header">
      <div class="event-title">${event.title}</div>
      <div class="event-type">${formatRequestType(event.request_type)}</div>
    </div>
    <div class="event-details">
      <div><strong>Description:</strong> ${event.description}</div>
      <div><strong>Department:</strong> ${event.department || 'N/A'}${event.subgroup ? ` (${event.subgroup})` : ''}</div>
      <div><strong>Assigned to:</strong> ${event.assigned_to_name || 'Unassigned'}</div>
      <div><strong>Due Date:</strong> 
        <span class="due-date ${urgencyClass}">
          ${dueDate.toLocaleDateString()} 
          ${isOverdue ? `(${Math.abs(daysUntilDue)} days overdue!)` : 
            isUrgent ? `(${daysUntilDue} days left!)` : 
            `(${daysUntilDue} days left)`}
        </span>
      </div>
      <div><strong>Status:</strong> ${event.status || 'No Status'}</div>
      <div><strong>Discord:</strong> 
        <a href="${discordLink}" target="_blank" class="discord-link">
          💬 View in Discord
        </a>
      </div>
      ${event.notes ? `<div><strong>Notes:</strong> ${event.notes}</div>` : ''}
    </div>
    <div class="event-meta">
      <small>Created: ${new Date(event.created_at).toLocaleDateString()}</small>
    </div>
  `;
  
  // Add click handler to show modal
  card.addEventListener('click', (e) => {
    // Don't open modal if user clicked on the Discord link
    if (!e.target.closest('.discord-link')) {
      showEventModal(event);
    }
  });
  
  return card;
}

function updateEventsSummary(events) {
  const summaryContainer = document.getElementById('events-summary');
  if (!summaryContainer) return;
  
  const statusCounts = {
    total: events.length,
    pending: events.filter(e => !e.status || e.status.includes('Queue') || e.status.includes('Progress') || e.status.includes('Awaiting')).length,
    completed: events.filter(e => e.status && e.status.includes('Done')).length,
    overdue: events.filter(e => {
      const dueDate = new Date(e.posting_date);
      const isDone = e.status && e.status.includes('Done');
      return dueDate < new Date() && !isDone;
    }).length
  };
  
  summaryContainer.innerHTML = `
    <h3>📊 Events Summary</h3>
    <div class="summary-stats">
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.total}</span>
        <span class="summary-label">Total Events</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.pending}</span>
        <span class="summary-label">Pending</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.completed}</span>
        <span class="summary-label">Completed</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.overdue}</span>
        <span class="summary-label">Overdue</span>
      </div>
    </div>
  `;
}

// ========== DASHBOARD STATS ==========
async function loadDashboardStats() {
  const events = currentEvents;
  if (!events || events.length === 0) return;
  
  const stats = {
    total: events.length,
    pending: events.filter(e => !e.status || !e.status.includes('Done')).length,
    completed: events.filter(e => e.status && e.status.includes('Done')).length,
    overdue: events.filter(e => {
      const dueDate = new Date(e.posting_date);
      const isDone = e.status && e.status.includes('Done');
      return dueDate < new Date() && !isDone;
    }).length
  };
  
  // Update dashboard stats
  updateElement('total-events', stats.total);
  updateElement('pending-events', stats.pending);
  updateElement('completed-events', stats.completed);
  updateElement('overdue-events', stats.overdue);
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

// ========== RECENT ACTIVITY ==========
async function loadRecentActivity() {
  const events = currentEvents;
  if (!events || events.length === 0) return;
  const recentEvents = events
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  
  const container = document.getElementById('recent-events-list');
  if (!container) return;
  
  if (recentEvents.length === 0) {
    container.innerHTML = '<div class="loading">No recent activity</div>';
    return;
  }
  
  container.innerHTML = recentEvents.map(event => `
    <div class="recent-item">
      <div class="recent-title">${event.title}</div>
      <div class="recent-meta">
        ${formatRequestType(event.request_type)} • ${new Date(event.created_at).toLocaleDateString()}
      </div>
    </div>
  `).join('');
}

// ========== CALENDAR FUNCTIONS ==========
async function loadMiniCalendar() {
  // Placeholder for mini calendar - could implement a simple month view
  const container = document.getElementById('mini-calendar');
  if (container) {
    container.innerHTML = '<div class="text-center">Mini calendar coming soon</div>';
  }
}

async function loadMainCalendar() {
  const calendarEl = document.getElementById("main-calendar");
  if (!calendarEl) return;
  
  // Prevent multiple simultaneous calendar loads
  if (calendarLoading) {
    console.log('⏸️ Calendar already loading, skipping...');
    return;
  }
  
  calendarLoading = true;
  console.log('🔄 Loading main calendar...');
  
  try {
    // Destroy previous instance completely
    if (currentCalendar) {
      try {
        currentCalendar.destroy();
        currentCalendar = null;
      } catch (e) {
        console.warn('Error destroying calendar:', e);
      }
    }
    
    // Clear the calendar container to ensure no leftover elements
    calendarEl.innerHTML = '';
    
    const events = currentEvents.length > 0 ? currentEvents : await loadEvents();
    
    console.log(`📅 Creating calendar with ${events.length} events`);
    
    // Convert API events to calendar format
    const calendarEvents = events.map(event => {
      const rawId = (event.id && String(event.id)) || generateStableEventId(event);
      const dueDate = new Date(event.posting_date);
      const isOverdue = dueDate < new Date();
      const isUrgent = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) <= 2;
      
      return {
        id: `event-${rawId}`,
        title: `${event.title}${event.status ? ` (${event.status})` : ' (No Status)'}`,
        start: event.posting_date.split('T')[0],
        extendedProps: {
          description: event.description,
          assignedTo: event.assigned_to_name,
          requester: event.requester_name,
          department: event.department,
          status: event.status,
          requestType: event.request_type,
          notes: event.notes,
          originalEvent: event
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
    
    console.log(`📅 Calendar events created: ${calendarEvents.length}`);
    
  // Create new calendar instance
    currentCalendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      height: "auto",
      events: calendarEvents,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek'
      },
      eventClick: function(info) {
        showEventModal(info.event.extendedProps.originalEvent);
      },
      eventDidMount: function(info) {
        // Store reference id for tooltip management
        info.el.dataset.tooltipEventId = info.event.id;
      },
      eventMouseEnter: function(info) {
        showCalendarTooltip(info);
      },
      eventMouseLeave: function(info) {
        hideCalendarTooltip(info);
      }
    });
    
    currentCalendar.render();
    console.log('✅ Calendar rendered successfully');
  } finally {
    calendarLoading = false;
  }
}

// ========== HELPER FUNCTIONS ==========
function normalizeStatusForCSS(status) {
  if (!status || status === '') return 'nostatus';
  return status.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

function getEventColor(status) {
  const statusColors = {
    '📥 In Queue': '#6c757d',
    '🔄 In Progress': '#007bff',
    '⏳ Awaiting Approval': '#ffc107',
    '⏳ Awaiting Posting': '#ffc107',
    '✅ Done': '#28a745',
    '': '#6c757d',
    'No Status': '#6c757d'
  };
  
  return statusColors[status] || '#6c757d';
}

function generateDiscordChannelLink(event) {
  const guildId = '1165706299393183754';
  // Use channel_id if available, or generate a placeholder link
  const channelId = event.channel_id || event.id || 'unknown';
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

// Calendar tooltip management
let activeCalTooltip = null;
function showCalendarTooltip(info) {
  const props = info.event.extendedProps;
  hideCalendarTooltip();
  const tooltip = document.createElement('div');
  tooltip.className = 'fc-tooltip global';
  tooltip.innerHTML = `
    <strong>${info.event.title}</strong><br>
    ${(props.department || '')} ${formatRequestType(props.requestType) || ''}<br>
    ${props.assignedTo ? 'Assigned: ' + props.assignedTo : ''}
  `;
  document.body.appendChild(tooltip);
  // Position near mouse/event element
  const rect = info.el.getBoundingClientRect();
  const top = window.scrollY + rect.top + rect.height + 4;
  const left = window.scrollX + rect.left;
  tooltip.style.position = 'absolute';
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.style.opacity = '1';
  activeCalTooltip = tooltip;
}
function hideCalendarTooltip() {
  if (activeCalTooltip) {
    activeCalTooltip.remove();
    activeCalTooltip = null;
  }
}

// ========== KANBAN BOARD FUNCTIONS ==========
async function loadKanbanBoard() {
  try {
    if (!currentEvents || currentEvents.length === 0) {
      document.getElementById('kanban-container').innerHTML = '<div class="loading">🔄 Loading data...</div>';
      return;
    }
    
    displayKanbanBoard(currentEvents);
  } catch (error) {
    console.error('❌ Error loading Kanban board:', error);
    document.getElementById('kanban-container').innerHTML = '<div class="loading error">❌ Error loading Kanban board</div>';
  }
}

function displayKanbanBoard(events) {
  const container = document.getElementById('kanban-container');
  if (!container) return;
  
  // Define the columns/statuses
  const statuses = [
    '📥 In Queue',
    '🔄 In Progress', 
    '⏳ Awaiting Approval',
    '⏳ Awaiting Posting',
    '✅ Done'
  ];
  
  // Filter events by department if filter is set
  const departmentFilter = document.getElementById('kanban-filter')?.value;
  const filteredEvents = departmentFilter ? 
    events.filter(event => event.department_key === departmentFilter) : 
    events;
  
  // Group events by status
  const eventsByStatus = statuses.reduce((acc, status) => {
    acc[status] = filteredEvents.filter(event => event.status === status);
    return acc;
  }, {});
  
  // Create the Kanban columns
  container.innerHTML = statuses.map(status => {
    const statusEvents = eventsByStatus[status] || [];
    const cards = statusEvents.map((event, index) => {
      // Find the index in filteredEvents array
      const eventIndex = filteredEvents.findIndex(e => 
        (e.id && e.id === event.id) || 
        (e.title === event.title && e.posting_date === event.posting_date)
      );
      return createKanbanCard(event, eventIndex);
    }).join('');
    
    return `
      <div class="kanban-column" data-status="${status}">
        <div class="kanban-header">
          <div class="kanban-title">
            ${status}
          </div>
          <div class="kanban-count">${statusEvents.length}</div>
        </div>
        <div class="kanban-cards">
          ${cards || '<div class="kanban-empty">No items</div>'}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers to cards
  container.querySelectorAll('.kanban-card').forEach((card, index) => {
    card.addEventListener('click', () => {
      // Get event index from data attribute
      const eventIndex = parseInt(card.dataset.eventIndex, 10);
      const eventData = filteredEvents[eventIndex];
      if (eventData) {
        showEventModal(eventData);
      }
    });
  });
}

function createKanbanCard(event, eventIndex) {
  const dueDate = new Date(event.posting_date);
  const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
  
  const dueDateClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
  const dueDateText = isOverdue ? 
    `${Math.abs(daysUntilDue)} days overdue` : 
    isUrgent ? 
      `${daysUntilDue} days left` : 
      `Due ${dueDate.toLocaleDateString()}`;
  
  // Escape HTML to prevent XSS and broken attributes
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  return `
    <div class="kanban-card" data-event-index="${eventIndex}">
      <div class="kanban-card-type">${formatRequestType(event.request_type)}</div>
      <div class="kanban-card-title">${escapeHtml(event.title)}</div>
      <div class="kanban-card-department">${escapeHtml(event.department_name) || 'N/A'}</div>
      <div class="kanban-card-meta">
        <div class="kanban-card-due ${dueDateClass}">${dueDateText}</div>
        ${event.assigned_to_name ? `<div>👤 ${escapeHtml(event.assigned_to_name)}</div>` : '<div>👤 Unassigned</div>'}
        ${event.location ? `<div>📍 ${escapeHtml(event.location)}</div>` : ''}
      </div>
    </div>
  `;
}

function refreshKanban() {
  loadKanbanBoard();
}

// Setup Kanban filter
document.addEventListener('DOMContentLoaded', () => {
  const kanbanFilter = document.getElementById('kanban-filter');
  if (kanbanFilter) {
    kanbanFilter.addEventListener('change', () => {
      displayKanbanBoard(currentEvents);
    });
  }
});

// ========== MODAL FUNCTIONS ==========
function showEventModal(event) {
  const discordLink = generateDiscordChannelLink(event);
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">×</button>
      <h2>${event.title}</h2>
      <div class="modal-details">
        <p><strong>Description:</strong> ${event.description || 'N/A'}</p>
        <p><strong>Due Date:</strong> ${new Date(event.posting_date).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${event.status || 'No Status'}</p>
        <p><strong>Type:</strong> ${formatRequestType(event.request_type) || 'N/A'}</p>
        <p><strong>Department:</strong> ${event.department || 'N/A'}</p>
        <p><strong>Assigned to:</strong> ${event.assigned_to_name || 'Unassigned'}</p>
        <p><strong>Discord Channel:</strong> 
          <a href="${discordLink}" target="_blank" class="discord-link">
            💬 Open in Discord
          </a>
        </p>
        ${event.notes ? `<p><strong>Notes:</strong> ${event.notes}</p>` : ''}
        <p><strong>Created:</strong> ${new Date(event.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  modal.querySelector('.modal-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
}

// ========== ANALYTICS ==========
function initializeCharts() {
  // Chart.js configuration will be added here
  console.log('📊 Charts initialized');
}

async function loadAnalytics() {
  if (!currentEvents.length) {
    await loadEvents();
  }
  
  updateStatusChart();
  updateTimelineChart();
  updateTypeChart();
  updateMetrics();
}

function updateStatusChart() {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  
  // Destroy existing chart
  if (charts.status) {
    charts.status.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const statusCounts = {};
  
  currentEvents.forEach(event => {
    const status = event.status || 'No Status';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#3498db', '#f39c12', '#9b59b6', '#27ae60', '#6c757d'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function updateTimelineChart() {
  const canvas = document.getElementById('timelineChart');
  if (!canvas) return;
  
  if (charts.timeline) {
    charts.timeline.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  
  // Group events by month
  const monthCounts = {};
  currentEvents.forEach(event => {
    const month = new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  
  charts.timeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(monthCounts),
      datasets: [{
        label: 'Events Created',
        data: Object.values(monthCounts),
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function updateTypeChart() {
  const canvas = document.getElementById('typeChart');
  if (!canvas) return;
  
  if (charts.type) {
    charts.type.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const typeCounts = {};
  
  currentEvents.forEach(event => {
    const type = event.request_type || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  charts.type = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{
        label: 'Count',
        data: Object.values(typeCounts),
        backgroundColor: '#007bff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function updateMetrics() {
  // Calculate metrics
  const completedEvents = currentEvents.filter(e => e.status && e.status.includes('Done'));
  const totalEvents = currentEvents.length;
  const successRate = totalEvents > 0 ? Math.round((completedEvents.length / totalEvents) * 100) : 0;
  
  updateElement('avg-completion', '5 days'); // Placeholder
  updateElement('success-rate', `${successRate}%`);
  updateElement('peak-day', 'Monday'); // Placeholder
}

function updateChartsForNightMode() {
  // Update chart colors for night mode
  Object.values(charts).forEach(chart => {
    if (chart && chart.options) {
      chart.options.plugins = chart.options.plugins || {};
      chart.options.plugins.legend = chart.options.plugins.legend || {};
      chart.options.plugins.legend.labels = { color: '#e9ecef' };
      chart.update();
    }
  });
}

function updateChartsForDayMode() {
  // Update chart colors for day mode
  Object.values(charts).forEach(chart => {
    if (chart && chart.options) {
      chart.options.plugins = chart.options.plugins || {};
      chart.options.plugins.legend = chart.options.plugins.legend || {};
      chart.options.plugins.legend.labels = { color: '#495057' };
      chart.update();
    }
  });
}

// ========== TEAM DATA ==========
async function loadTeamData() {
  const container = document.getElementById('team-roles');
  if (!container) return;
  
  // Real team members data for 2025-2026
  const teamMembers = [
    // Marketing Directors
    { name: 'Ibrahim Chehab', role: 'Marketing Director', year: '4th', gender: 'Brother', avatar: '👨‍💼' },
    { name: 'Farah Ismail', role: 'Marketing Director', year: '3rd', gender: 'Sister', avatar: '👩‍💼' },
    
    // Social Media Managers
    { name: 'Nadia Silim', role: 'Social Media Manager', year: '1st', gender: 'Sister', avatar: '👩‍💻' },
    { name: 'Wafa Malik', role: 'Social Media Manager', year: '2nd', gender: 'Sister', avatar: '👩‍💻' },
    { name: 'Rocio Escalante', role: 'Social Media Manager', year: '3rd', gender: 'Sister', avatar: '👩‍💻' },
    
    // Content Creators
    { name: 'Mustafa Sajjad', role: 'Content Creator', year: '5+', gender: 'Brother', avatar: '👨‍✍️' },
    { name: 'Faris Khalili', role: 'Content Creator', year: '5+', gender: 'Brother', avatar: '👨‍✍️' },
    { name: 'Zunairah Khan', role: 'Content Creator', year: '2nd', gender: 'Sister', avatar: '👩‍✍️' },
    { name: 'Ayesha Wahab', role: 'Content Creator', year: '1st', gender: 'Sister', avatar: '👩‍✍️' },
    
    // Graphic Designers
    { name: 'Wakeel Ibrahim', role: 'Graphic Designer', year: '2nd', gender: 'Brother', avatar: '👨‍🎨' },
    { name: 'Zoha Fatima Quadry', role: 'Graphic Designer', year: '2nd', gender: 'Sister', avatar: '👩‍🎨' },
    { name: 'Jasra Irfan', role: 'Graphic Designer', year: '4th', gender: 'Sister', avatar: '👩‍🎨' },
    { name: 'Taimaa Al Nemer', role: 'Graphic Designer', year: '4th', gender: 'Sister', avatar: '👩‍🎨' },
    { name: 'Fahmi Masnun Ashraf', role: 'Graphic Designer', year: '2nd', gender: 'Sister', avatar: '👩‍🎨' },
    { name: 'Haleema Khalid', role: 'Graphic Designer', year: '3rd', gender: 'Sister', avatar: '👩‍🎨' },
    
    // Photographer
    { name: 'Fathima Karim', role: 'Photographer', year: '3rd', gender: 'Sister', avatar: '👩‍📷' }
  ];

  // Group members by role for better organization
  const roleGroups = teamMembers.reduce((groups, member) => {
    const role = member.role;
    if (!groups[role]) groups[role] = [];
    groups[role].push(member);
    return groups;
  }, {});

  // Generate HTML grouped by role in horizontal layout
  const roleOrder = ['Marketing Director', 'Social Media Manager', 'Content Creator', 'Graphic Designer', 'Photographer'];
  
  container.innerHTML = roleOrder.map(role => {
    if (!roleGroups[role]) return '';
    
    return `
      <div class="role-section">
        <h3 class="role-title">${role}${roleGroups[role].length > 1 ? 's' : ''}</h3>
        <div class="team-horizontal-grid">
          ${roleGroups[role].map(member => `
            <div class="team-card">
              <div class="team-avatar">${member.avatar}</div>
              <div class="team-info">
                <div class="team-name">${member.name}</div>
                <div class="team-role">${member.role}</div>
                <div class="team-year">${member.year} Year ${member.gender}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ========== EVENT FILTERS ==========
function setupEventFilters() {
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', filterEvents);
  }
}

function filterEvents() {
  const statusFilter = document.getElementById('status-filter');
  const selectedStatus = statusFilter?.value || '';
  
  let filteredEvents = currentEvents;
  if (selectedStatus) {
    filteredEvents = currentEvents.filter(event => event.status === selectedStatus);
  }
  
  displayEvents(filteredEvents);
  updateEventsSummary(filteredEvents);
}

// ========== UTILITY FUNCTIONS ==========
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function refreshData() {
  showToast('Refreshing data...', 'info');
  loadAllData().then(() => {
    // If we're currently viewing the calendar, refresh it with new data
    const calendarSection = document.getElementById('calendar');
    if (calendarSection && calendarSection.classList.contains('active')) {
      console.log('📅 Refreshing calendar with new data');
      loadMainCalendar();
    }
  });
}

function exportEvents() {
  const csv = convertToCSV(currentEvents);
  downloadCSV(csv, 'msa-events.csv');
  showToast('Events exported successfully!');
}

function convertToCSV(events) {
  const headers = ['Title', 'Description', 'Status', 'Due Date', 'Assigned To', 'Requester', 'Type'];
  const rows = events.map(event => [
    event.title,
    event.description,
    event.status || 'No Status',
    event.posting_date,
    event.assigned_to_name || 'Unassigned',
    event.requester_name || 'N/A',
    formatRequestType(event.request_type) || 'N/A'
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(field => `"${field}"`).join(',')
  ).join('\n');
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

// ========== API TESTING ==========
async function testApiConnection() {
  const resultsDiv = document.getElementById('api-test-results');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '<div class="loading">Testing API connection...</div>';
  
  const healthData = await makeApiRequest('/api/health');
  
  if (healthData) {
    resultsDiv.innerHTML = `
      <div class="success">✅ API Health Check Successful</div>
      <pre>${JSON.stringify(healthData, null, 2)}</pre>
    `;
  } else {
    resultsDiv.innerHTML = '<div class="error">❌ API Health Check Failed</div>';
  }
}

async function testApiEvents() {
  const resultsDiv = document.getElementById('api-test-results');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '<div class="loading">Testing events endpoint...</div>';
  
  const eventsData = await makeApiRequest('/api/events');
  
  if (eventsData && eventsData.success) {
    resultsDiv.innerHTML = `
      <div class="success">✅ Events Endpoint Successful</div>
      <div>Found ${eventsData.count} events</div>
      <pre>${JSON.stringify(eventsData, null, 2)}</pre>
    `;
  } else {
    resultsDiv.innerHTML = '<div class="error">❌ Events Endpoint Failed</div>';
  }
}

// ========== AUTO REFRESH ==========
function setupAutoRefresh() {
  const refreshInterval = window.MSA_CONFIG?.ui?.refreshInterval || 300000; // 5 minutes
  
  setInterval(() => {
    console.log('🔄 Auto-refreshing data...');
    loadAllData();
  }, refreshInterval);
}

