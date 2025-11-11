// ========== MSA MARKETING COMMAND CENTER - DASHBOARD SCRIPT ==========
// Refactored for Spring Boot Backend API

// Global state
let currentEvents = [];
let currentCalendar = null;
let charts = {};
let calendarLoading = false;
let eventsLoadingPromise = null;
let api = null; // Will be initialized when API service is ready

// Wait for DOM and API service to load
document.addEventListener("DOMContentLoaded", async () => {
  console.log('🚀 Initializing MSA Marketing Dashboard...');
  
  // Wait for API service to be ready
  if (window.apiService) {
    api = window.apiService;
  } else {
    console.error('❌ API Service not loaded!');
    showToast('Failed to load API service', 'error');
    return;
  }
  
  initializeDashboard();
  setupNavigation();
  setupModeToggle();
  applyInitialTheme();
  
  // Check if we're returning from a failed auth attempt
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('error') === 'auth_failed') {
    showToast('Authentication failed. Please ensure you are a member of the UTM MSA Discord server.', 'error');
    // Clean up URL
    window.history.replaceState({}, document.title, '/');
  }
  
  // Check authentication first
  const isAuthenticated = await checkAuthentication();
  
  if (!isAuthenticated) {
    // Show login screen instead of loading data
    showLoginScreen();
    return;
  }
  
  // Show success message if we just logged in
  if (urlParams.get('logged_in') === 'true') {
    showToast('Welcome back! Loading your dashboard...', 'success');
    window.history.replaceState({}, document.title, '/');
  }
  
  // Load data only if authenticated
  await loadAllData();
  setupAutoRefresh();
  
  console.log('✅ Dashboard initialized');
});

// ========== AUTHENTICATION ==========
async function checkAuthentication() {
  try {
    const user = await api.checkAuth();
    
    if (user) {
      console.log('✅ User authenticated:', user);
      updateUserGreeting(user);
      updateApiStatus('✅ Connected', 'success');
      hideLoginScreen();
      return true;
    } else {
      console.log('⚠️ User not authenticated');
      updateApiStatus('🔐 Not logged in', 'warning');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication check failed:', error);
    updateApiStatus('❌ Connection Error', 'error');
    return false;
  }
}

function showLoginScreen() {
  console.log('🔐 Showing login screen...');
  
  // Hide all main content
  document.querySelector('.main-content')?.classList.add('hidden');
  
  // Create and show login screen
  const loginScreen = document.createElement('div');
  loginScreen.id = 'login-screen';
  loginScreen.className = 'login-screen';
  loginScreen.innerHTML = `
    <div class="login-container">
      <div class="login-header">
        <img src="msa_logo.png" alt="MSA Logo" class="login-logo" />
        <h1>UTM MSA Marketing Command Centre</h1>
        <div class="bismillah-login">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
      </div>
      
      <div class="login-content">
        <h2>السلام عليكم! 👋</h2>
        <p>Please sign in with your Discord account to access the Marketing Command Centre.</p>
        <p class="login-requirement">✓ You must be a member of the Marketing Command Centre</p>
        
        <button class="login-button" onclick="initiateLogin()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Sign in with Discord
        </button>
        
        <div class="login-footer">
          <p class="ayah-login">وَقُلِ ٱعْمَلُوا۟ فَسَيَرَى ٱللَّهُ عَمَلَكُمْ</p>
          <p class="citation-login">— At-Tawbah 9:105</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(loginScreen);
}

function hideLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.remove();
  }
  document.querySelector('.main-content')?.classList.remove('hidden');
}

function initiateLogin() {
  console.log('🔐 Initiating Discord OAuth2 login...');
  // Store current page so we can return after login
  try {
    sessionStorage.setItem('preLoginUrl', window.location.href);
  } catch (e) {
    console.warn('Could not save pre-login URL:', e);
  }
  api.login();
}



function updateUserGreeting(user) {
  const greetingEl = document.querySelector('.user-greeting');
  const loginBtn = document.getElementById('login-btn');
  
  if (greetingEl && user) {
    greetingEl.textContent = `السلام عليكم, ${user.username}`;
    greetingEl.style.cursor = 'pointer';
    greetingEl.style.display = 'inline-block';
    greetingEl.onclick = () => showUserMenu(user);
    
    // Hide login button when authenticated
    if (loginBtn) {
      loginBtn.style.display = 'none';
    }
  } else if (greetingEl && !user) {
    // Show login button when not authenticated
    greetingEl.style.display = 'none';
    if (loginBtn) {
      loginBtn.style.display = 'inline-block';
      loginBtn.onclick = initiateLogin;
    }
  }
}

function showUserMenu(user) {
  // Simple user menu - could be expanded
  const menu = document.createElement('div');
  menu.className = 'user-dropdown';
  menu.innerHTML = `
    <div class="user-menu-item">
      <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" 
           alt="${user.username}" 
           class="user-avatar-small">
      <div>
        <div class="user-menu-name">${user.username}#${user.discriminator}</div>
        <div class="user-menu-email">${user.email || 'No email'}</div>
      </div>
    </div>
    <button class="user-menu-button" onclick="window.apiService.login()">Switch Account</button>
  `;
  
  // Position and show menu (simplified - you may want to add proper positioning)
  document.body.appendChild(menu);
  setTimeout(() => menu.remove(), 5000); // Auto-close after 5 seconds
}

// ========== INITIALIZATION ==========
function initializeDashboard() {
  // Setup sidebar toggle
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarToggle.title = 'Collapse sidebar';
  }
  
  // Restore sidebar state from localStorage (desktop only)
  if (window.innerWidth > 768) {
    try {
      const sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
      if (sidebarCollapsed) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        sidebar.classList.add('collapsed');
        mainContent.classList.add('sidebar-collapsed');
        if (sidebarToggle) {
          sidebarToggle.title = 'Expand sidebar';
        }
      }
    } catch (e) {
      console.warn('Could not restore sidebar state:', e);
    }
  }
  
  // Initialize charts placeholder
  initializeCharts();
  
  // Setup event filters
  setupEventFilters();
  
  // Setup compact mode toggle
  setupCompactMode();
}

// ========== COMPACT MODE ==========
function setupCompactMode() {
  const compactToggle = document.getElementById('compact-mode-toggle');
  if (!compactToggle) return;
  
  // Restore compact mode state from localStorage
  try {
    const isCompact = localStorage.getItem('events_compact_mode') === 'true';
    if (isCompact) {
      activateCompactMode();
    }
  } catch (e) {
    console.warn('Could not restore compact mode state:', e);
  }
  
  // Add click handler
  compactToggle.addEventListener('click', toggleCompactMode);
  
  // Add keyboard shortcut (Ctrl/Cmd + K)
  document.addEventListener('keydown', (e) => {
    // Check if we're in the events section
    const eventsSection = document.getElementById('events');
    if (!eventsSection || !eventsSection.classList.contains('active')) return;
    
    // Check for Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleCompactMode();
    }
  });
}

function toggleCompactMode() {
  const container = document.getElementById('task-container');
  const toggle = document.getElementById('compact-mode-toggle');
  
  if (!container || !toggle) return;
  
  const isCurrentlyCompact = container.classList.contains('compact-mode');
  
  if (isCurrentlyCompact) {
    deactivateCompactMode();
  } else {
    activateCompactMode();
  }
}

function activateCompactMode() {
  const container = document.getElementById('task-container');
  const toggle = document.getElementById('compact-mode-toggle');
  
  if (container) {
    container.classList.add('compact-mode');
  }
  
  if (toggle) {
    toggle.classList.add('active');
    toggle.innerHTML = '<span>📐</span> Compact: ON';
  }
  
  // Save preference
  try {
    localStorage.setItem('events_compact_mode', 'true');
  } catch (e) {
    console.warn('Could not save compact mode state:', e);
  }
  
  // Show brief notification
  showToast('Compact mode enabled', 'success');
}

function deactivateCompactMode() {
  const container = document.getElementById('task-container');
  const toggle = document.getElementById('compact-mode-toggle');
  
  if (container) {
    container.classList.remove('compact-mode');
  }
  
  if (toggle) {
    toggle.classList.remove('active');
    toggle.innerHTML = '<span>📐</span> Compact Mode';
  }
  
  // Save preference
  try {
    localStorage.setItem('events_compact_mode', 'false');
  } catch (e) {
    console.warn('Could not save compact mode state:', e);
  }
  
  // Show brief notification
  showToast('Compact mode disabled', 'success');
}

// ========== NAVIGATION ==========
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
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
    case 'spreadsheet':
      loadSpreadsheetView();
      break;
    case 'kanban':
      loadKanbanBoard();
      break;
    case 'analytics':
      loadAnalytics();
      break;
  }
  
  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  const toggleBtn = document.querySelector('.sidebar-toggle');
  
  // For mobile: toggle open/close
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
  } else {
    // For desktop: toggle collapse
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
    
    // Update toggle button icon
    if (sidebar.classList.contains('collapsed')) {
      toggleBtn.textContent = '☰';
      toggleBtn.title = 'Expand sidebar';
    } else {
      toggleBtn.textContent = '☰';
      toggleBtn.title = 'Collapse sidebar';
    }
    
    // Save preference
    try {
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    } catch (e) {
      console.warn('Could not save sidebar state:', e);
    }
  }
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
    
    try { 
      localStorage.setItem('msa_theme', isNightMode ? 'dark' : 'light'); 
    } catch (e) { 
      console.warn('Failed to save theme preference:', e);
    }
    
    // Update charts for night mode
    if (isNightMode) {
      updateChartsForNightMode();
    } else {
      updateChartsForDayMode();
    }
  });
}

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
      useDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (useDark) {
      document.body.classList.add('night-mode');
      const logo = document.getElementById('logo');
      if (logo) logo.src = 'msa_logo_white.png';
      const toggleButton = document.getElementById('toggle-mode');
      if (toggleButton) toggleButton.textContent = '☀️';
    }
  } catch (e) {
    console.warn('Theme init failed:', e);
  }
}

// ========== DATA LOADING ==========
async function loadAllData() {
  console.log('🔄 Loading all dashboard data...');
  try {
    await loadEvents();
    // Populate dynamic filters based on the freshly loaded dataset
    populateAllDynamicFilters(currentEvents);
    await Promise.all([
      loadDashboardStats(),
      loadRecentActivity(),
      loadMiniCalendar(),
      loadCycleView()
    ]);
    console.log('✅ All data loaded');
  } catch (error) {
    console.error('❌ Failed to load data:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

async function loadEvents() {
  if (eventsLoadingPromise) {
    return eventsLoadingPromise;
  }
  
  eventsLoadingPromise = (async () => {
    try {
      const requests = await api.getAllRequests();
      console.log('📦 Raw requests from API:', requests);
      
      // Transform API requests to UI event format (now async to fetch Discord names)
      currentEvents = await api.transformRequestsToEvents(requests);
      console.log('🔄 Transformed events with Discord names:', currentEvents);
      
      displayEvents(currentEvents);
      updateEventsSummary(currentEvents);
      return currentEvents;
    } catch (error) {
      console.error('❌ Failed to load events:', error);
      currentEvents = [];
      displayEventsError();
      return [];
    }
  })();
  
  try {
    return await eventsLoadingPromise;
  } finally {
    eventsLoadingPromise = null;
  }
}

function displayEvents(events) {
  const container = document.getElementById("task-container");
  if (!container) return;
  
  container.innerHTML = '';
  
  if (events.length === 0) {
    container.innerHTML = '<div class="loading">No marketing requests found. Create your first request in Discord!</div>';
    return;
  }
  
  // Group events by status
  const eventsByStatus = {};
  const statusOrder = [
    '📥 In Queue', 
    '🔄 In Progress', 
    '⏳ Awaiting Posting', 
    '✅ Done',
    '🚫 Blocked'
  ];
  
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
      <h3>${status} (${eventsByStatus[status].length})</h3>
      <span class="collapse-icon">▼</span>
    `;
    
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

function displayEventsError() {
  const container = document.getElementById("task-container");
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading error">
      <p>❌ Failed to load marketing requests</p>
      <p>Please check your connection and try again.</p>
      <button class="action-btn" onclick="refreshData()">🔄 Retry</button>
    </div>
  `;
}

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
  const dueDate = new Date(event.posting_date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  const isDone = !!(event.status && event.status.includes('Done'));
  const isBlocked = !!(event.status && event.status.includes('Blocked'));
  const isOverdue = daysUntilDue < 0 && !isDone && !isBlocked;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0 && !isDone && !isBlocked;
  
  const urgencyClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
  
  // Always show days remaining
  let urgencyText, urgencyBadgeClass;
  if (isOverdue) {
    urgencyText = `⚠️ ${Math.abs(daysUntilDue)} days overdue`;
    urgencyBadgeClass = 'overdue';
  } else if (isUrgent) {
    urgencyText = `🔥 ${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'} left`;
    urgencyBadgeClass = 'urgent';
  } else if (daysUntilDue <= 7) {
    urgencyText = `⏰ ${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'} left`;
    urgencyBadgeClass = 'moderate';
  } else {
    urgencyText = `📅 ${daysUntilDue} days left`;
    urgencyBadgeClass = 'normal';
  }
  
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
      </div>
      ` : ''}
    </div>
    
    <div class="event-card-footer">
      <div class="event-card-meta">
        <small>Created ${new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
      </div>
      <div class="event-card-actions">
        ${event.signup_url ? `<a href="${escapeHtml(event.signup_url)}" target="_blank" class="event-card-action-btn signup-btn" onclick="event.stopPropagation()">
          🔗 Signup
        </a>` : ''}
        <a href="${discordLink}" target="_blank" class="event-card-action-btn discord-btn" onclick="event.stopPropagation()">
          💬 Discord
        </a>
      </div>
    </div>
  `;
  
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.event-card-action-btn')) {
      showEventModal(event);
    }
  });
  
  return card;
}

function updateEventsSummary(events) {
  const summaryContainer = document.getElementById('events-summary');
  if (!summaryContainer) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const statusCounts = {
    total: events.length,
    pending: events.filter(e => e.status && !e.status.includes('Done')).length,
    completed: events.filter(e => e.status && e.status.includes('Done')).length,
    overdue: events.filter(e => {
      const dueDate = new Date(e.posting_date + 'T00:00:00');
      const isDone = !!(e.status && e.status.includes('Done'));
      const isBlocked = !!(e.status && e.status.includes('Blocked'));
      return dueDate < today && !isDone && !isBlocked;
    }).length
  };
  
  summaryContainer.innerHTML = `
    <h3>📊 Request Summary</h3>
    <div class="summary-stats">
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.total}</span>
        <span class="summary-label">Total Requests</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.pending}</span>
        <span class="summary-label">Pending</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number">${statusCounts.completed}</span>
        <span class="summary-label">Completed</span>
      </div>
      <div class="summary-stat ${statusCounts.overdue > 0 ? 'overdue' : ''}">
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
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = {
    total: events.length,
    pending: events.filter(e => e.status && !e.status.includes('Done')).length,
    completed: events.filter(e => e.status && e.status.includes('Done')).length,
    overdue: events.filter(e => {
      const dueDate = new Date(e.posting_date + 'T00:00:00');
      const isDone = !!(e.status && e.status.includes('Done'));
      const isBlocked = !!(e.status && e.status.includes('Blocked'));
      return dueDate < today && !isDone && !isBlocked;
    }).length
  };
  
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
    <div class="recent-item" onclick="showEventModal(${JSON.stringify(event).replace(/"/g, '&quot;')})">
      <div class="recent-title">${escapeHtml(event.title)}</div>
      <div class="recent-meta">
        ${api.formatRequestType(event.request_type)} • ${new Date(event.created_at).toLocaleDateString()}
      </div>
    </div>
  `).join('');
}

// ========== CALENDAR FUNCTIONS ==========
async function loadMiniCalendar() {
  const container = document.getElementById('mini-calendar');
  if (!container) return;
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  // Get events for this month
  const monthEvents = currentEvents.filter(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });
  
  // Group events by day
  const eventsByDay = {};
  monthEvents.forEach(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    const day = dueDate.getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(e);
  });
  
  // Build calendar grid
  let calendarHTML = `
    <div class="mini-cal-header">
      <div class="mini-cal-month">${monthName}</div>
    </div>
    <div class="mini-cal-grid">
      <div class="mini-cal-weekday">Su</div>
      <div class="mini-cal-weekday">Mo</div>
      <div class="mini-cal-weekday">Tu</div>
      <div class="mini-cal-weekday">We</div>
      <div class="mini-cal-weekday">Th</div>
      <div class="mini-cal-weekday">Fr</div>
      <div class="mini-cal-weekday">Sa</div>
  `;
  
  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarHTML += '<div class="mini-cal-day empty"></div>';
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const events = eventsByDay[day] || [];
    const hasEvents = events.length > 0;
    
    let statusClass = '';
    let eventIndicator = '';
    let tooltipContent = '';
    
    if (hasEvents) {
      // Show dot indicators based on status
      const hasPending = events.some(e => e.status && (e.status.includes('Queue') || e.status.includes('Progress') || e.status.includes('Awaiting')));
      const hasDone = events.some(e => e.status && e.status.includes('Done'));
      const hasBlocked = events.some(e => e.status && e.status.includes('Blocked'));
      
      if (hasBlocked) statusClass = 'has-blocked';
      else if (hasPending) statusClass = 'has-pending';
      else if (hasDone) statusClass = 'has-done';
      
      eventIndicator = `<div class="mini-cal-dots">${'•'.repeat(Math.min(events.length, 3))}</div>`;
      
      // Build tooltip with event list
      tooltipContent = events.map(e => {
        const statusEmoji = e.status?.includes('Done') ? '✅' : 
                           e.status?.includes('Blocked') ? '🚫' : 
                           e.status?.includes('Progress') ? '🔄' : 
                           e.status?.includes('Awaiting') ? '⏳' : '📥';
        return `${statusEmoji} ${escapeHtml(e.title)}`;
      }).join('&#10;'); // Line break in HTML
    }
    
    calendarHTML += `
      <div class="mini-cal-day ${isToday ? 'today' : ''} ${statusClass}" 
           data-day="${day}" 
           data-has-events="${hasEvents}"
           title="${tooltipContent || 'No events'}">
        <span class="mini-cal-day-number">${day}</span>
        ${eventIndicator}
      </div>
    `;
  }
  
  calendarHTML += '</div>';
  
  // Add summary stats
  const upcomingCount = currentEvents.filter(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    const isDone = !!(e.status && e.status.includes('Done'));
    const isBlocked = !!(e.status && e.status.includes('Blocked'));
    return dueDate >= today && !isDone && !isBlocked;
  }).length;
  
  calendarHTML += `
    <div class="mini-cal-footer">
      <span class="mini-cal-stat">📌 ${upcomingCount} upcoming</span>
      <span class="mini-cal-stat">📋 ${monthEvents.length} this month</span>
    </div>
  `;
  
  container.innerHTML = calendarHTML;
  
  // Add hover tooltips for days with events
  container.querySelectorAll('.mini-cal-day[data-has-events="true"]').forEach(dayEl => {
    const day = parseInt(dayEl.dataset.day);
    const events = eventsByDay[day] || [];
    
    if (events.length === 0) return;
    
    dayEl.addEventListener('mouseenter', (e) => {
      // Remove any existing tooltip
      document.querySelectorAll('.mini-cal-tooltip').forEach(t => t.remove());
      
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'mini-cal-tooltip';
      
      const eventList = events.map(ev => {
        const statusEmoji = ev.status?.includes('Done') ? '✅' : 
                           ev.status?.includes('Blocked') ? '🚫' : 
                           ev.status?.includes('Progress') ? '🔄' : 
                           ev.status?.includes('Awaiting') ? '⏳' : '📥';
        return `<div class="mini-cal-tooltip-item">${statusEmoji} ${escapeHtml(ev.title)}</div>`;
      }).join('');
      
      tooltip.innerHTML = `
        <div class="mini-cal-tooltip-header">${events.length} event${events.length !== 1 ? 's' : ''} on ${monthName} ${day}</div>
        <div class="mini-cal-tooltip-list">${eventList}</div>
      `;
      
      document.body.appendChild(tooltip);
      
      // Position tooltip
      const rect = dayEl.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.bottom + 8;
      
      // Keep tooltip on screen
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top - tooltipRect.height - 8;
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
    
    dayEl.addEventListener('mouseleave', () => {
      setTimeout(() => {
        document.querySelectorAll('.mini-cal-tooltip').forEach(t => t.remove());
      }, 100);
    });
  });
}

// ========== CYCLE VIEW ==========
async function loadCycleView() {
  const container = document.getElementById('cycle-view-content');
  if (!container) return;
  
  try {
    const cycleData = await api.request('/api/workload/cycle-info', 'GET');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let content = '';
    
    // Current Development Cycle
    if (cycleData.currentDevelopmentCycle) {
      const dev = cycleData.currentDevelopmentCycle;
      const startDate = parseLocalDate(dev.developmentStart);
      const endDate = parseLocalDate(dev.developmentEnd);
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const daysElapsed = Math.max(0, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
      const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
      
      content += `
        <div class="cycle-section cycle-dev-section">
          <div class="cycle-header">
            <span class="cycle-badge dev">🎨 Development</span>
            <span class="cycle-number">Cycle ${dev.cycleNumber}</span>
          </div>
          <div class="cycle-dates">
            <span>📅 ${startDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
          </div>
          <div class="cycle-progress">
            <div class="progress-bar">
              <div class="progress-fill dev" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">${daysElapsed} of ${totalDays} days (${progress}%)</div>
          </div>
          <div class="cycle-stats">
            <div class="cycle-stat">
              <span class="cycle-stat-label">Days Remaining</span>
              <span class="cycle-stat-value">${daysRemaining}</span>
            </div>
            <div class="cycle-stat">
              <span class="cycle-stat-label">Task Day</span>
              <span class="cycle-stat-value">${endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    // Next Development Cycle (calculated from current cycle)
    if (cycleData.currentDevelopmentCycle) {
      const dev = cycleData.currentDevelopmentCycle;
      
      // Calculate next cycle: starts day after current posting window ends
      // Current dev cycle ends, then 14-day posting window, then next dev cycle starts
      const currentDevEnd = parseLocalDate(dev.developmentEnd);
      const postingWindowDays = 14;
      const nextDevStart = new Date(currentDevEnd);
      nextDevStart.setDate(nextDevStart.getDate() + postingWindowDays + 1);
      
      const nextDevEnd = new Date(nextDevStart);
      nextDevEnd.setDate(nextDevEnd.getDate() + 13); // 14-day dev cycle (inclusive)
      
      const nextCycleNumber = dev.cycleNumber + 1;
      const daysUntilNext = Math.ceil((nextDevStart - today) / (1000 * 60 * 60 * 24));
      
      // Next posting window starts right after next dev cycle
      const nextPostStart = new Date(nextDevEnd);
      nextPostStart.setDate(nextPostStart.getDate() + 1);
      
      const nextPostEnd = new Date(nextPostStart);
      nextPostEnd.setDate(nextPostEnd.getDate() + 13); // 14-day posting window (inclusive)
      
      const daysUntilPosting = Math.ceil((nextPostStart - today) / (1000 * 60 * 60 * 24));
      
      content += `
        <div class="cycle-section cycle-next-section">
          <div class="cycle-header">
            <span class="cycle-badge next">⏭️ Next Cycle</span>
            <span class="cycle-number">Cycle ${nextCycleNumber}</span>
          </div>
          <div class="cycle-dates">
            <span>📅 ${nextDevStart.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${nextDevEnd.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
          </div>
          <div class="cycle-stats">
            <div class="cycle-stat">
              <span class="cycle-stat-label">Starts In</span>
              <span class="cycle-stat-value">${daysUntilNext} days</span>
            </div>
            <div class="cycle-stat">
              <span class="cycle-stat-label">Duration</span>
              <span class="cycle-stat-value">14 days</span>
            </div>
          </div>
          <div class="cycle-note">
            ℹ️ Development phase starts after current posting window ends
          </div>
          <div class="cycle-posting-info">
            <div class="posting-header">📅 Posting Window</div>
            <div class="posting-dates">
              <span>${nextPostStart.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${nextPostEnd.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
            </div>
            <div class="posting-note">Content produced in this cycle will be posted during this window (${daysUntilPosting} days from now)</div>

          </div>
        </div>
      `;
    }
    
    if (!content) {
      content = '<div class="cycle-empty">No active cycle information available</div>';
    }
    
    container.innerHTML = content;
  } catch (error) {
    console.error('❌ Failed to load cycle info:', error);
    container.innerHTML = '<div class="cycle-error">Unable to load cycle information</div>';
  }
}

// ========== CALENDAR CYCLE HELPERS ==========
// Parse a YYYY-MM-DD as a local date (avoid UTC timezone shifts)
function parseLocalDate(dateString) {
  return new Date(dateString + 'T00:00:00');
}

function formatLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysLocal(dateString, days) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return formatLocalYMD(date);
}

function createCycleBackgroundEvents(cycleData) {
  const events = [];
  
  // Current development cycle highlight
  if (cycleData.currentDevelopmentCycle) {
    const dev = cycleData.currentDevelopmentCycle;
    events.push({
      id: `dev-cycle-${dev.cycleNumber}`,
      title: '', // avoid repeated labels on each day cell
      start: dev.developmentStart,
      end: addDaysLocal(dev.developmentEnd, 1), // FullCalendar end is exclusive
      display: 'background',
      classNames: ['cycle-dev'],
      extendedProps: {
        cycleType: 'development',
        cycleNumber: dev.cycleNumber,
        phase: 'current'
      }
    });

    // Task assignment marker (last day of dev)
    events.push({
      id: `task-day-dev-${dev.cycleNumber}`,
      title: '', // purely visual via cell class
      start: dev.developmentEnd,
      end: addDaysLocal(dev.developmentEnd, 1),
      display: 'background',
      classNames: ['task-assignment-day'],
      extendedProps: { isTaskDay: true }
    });

    // Predict next posting window from current dev cycle (day after dev end for 14 days)
    try {
      const nextPostStart = addDaysLocal(dev.developmentEnd, 1);
      const nextPostEnd = addDaysLocal(nextPostStart, 13); // 14-day window inclusive
      events.push({
        id: `post-cycle-next-${dev.cycleNumber}`,
        title: '',
        start: nextPostStart,
        end: addDaysLocal(nextPostEnd, 1),
        display: 'background',
        classNames: ['cycle-post'],
        extendedProps: { cycleType: 'posting', cycleNumber: dev.cycleNumber, predicted: true, phase: 'next' }
      });
    } catch (e) {
      console.warn('Could not compute next posting window:', e);
    }
  }

  // Current posting cycle highlight
  if (cycleData.currentPostingCycle) {
    const post = cycleData.currentPostingCycle;
    events.push({
      id: `post-cycle-${post.cycleNumber}`,
      title: '',
      start: post.postingStart,
      end: addDaysLocal(post.postingEnd, 1), // inclusive range
      display: 'background',
      classNames: ['cycle-post'],
      extendedProps: {
        cycleType: 'posting',
        cycleNumber: post.cycleNumber,
        phase: 'previous'
      }
    });
  }
  
  return events;
}

async function loadMainCalendar() {
  const calendarEl = document.getElementById("main-calendar");
  if (!calendarEl) return;
  
  if (calendarLoading) {
    console.log('⏸️ Calendar already loading, skipping...');
    return;
  }
  
  calendarLoading = true;
  console.log('🔄 Loading main calendar...');
  
  try {
    if (currentCalendar) {
      try {
        currentCalendar.destroy();
        currentCalendar = null;
      } catch (e) {
        console.warn('Error destroying calendar:', e);
      }
    }
    
    calendarEl.innerHTML = '';
    
    const events = currentEvents.length > 0 ? currentEvents : await loadEvents();
    
    // Fetch cycle information
    let cycleEvents = [];
    try {
      const cycleResponse = await api.request('/api/workload/cycle-info', 'GET');
      console.log('📊 Cycle data received:', cycleResponse);
      cycleEvents = createCycleBackgroundEvents(cycleResponse);
      console.log('🎨 Created cycle events:', cycleEvents);
    } catch (error) {
      console.error('❌ Could not load cycle info:', error);
    }
    
    console.log(`📅 Creating calendar with ${events.length} events`);
    
    const calendarEvents = events.map(event => {
      const dueDate = new Date(event.posting_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  const isDone = !!(event.status && event.status.includes('Done'));
  const isBlocked = !!(event.status && event.status.includes('Blocked'));
  const isOverdue = dueDate < today && !isDone && !isBlocked;
  const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil <= 2 && daysUntil >= 0 && !isDone && !isBlocked;
      
      return {
        id: `event-${event.channelID}`,
        title: event.title,
        start: event.posting_date,
        extendedProps: {
          description: event.description,
          assignedTo: event.assigned_to_name,
          status: event.status,
          requestType: event.request_type,
          room: event.room,
          signupUrl: event.signup_url,
          originalEvent: event
        },
        backgroundColor: api.getStatusColor(event.status),
        borderColor: api.getStatusColor(event.status),
        classNames: [
          isOverdue ? 'event-overdue' : '',
          isUrgent ? 'event-urgent' : ''
        ].filter(Boolean)
      };
    });
    
    // We inject cycle events as background events but hide their (empty) elements to rely on cell classes only.
    currentCalendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      height: "auto",
      events: [...cycleEvents, ...calendarEvents],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek'
      },
      eventClick: function(info) {
        // Only open modal for regular events, not cycle backgrounds
        if (info.event.extendedProps.originalEvent) {
          showEventModal(info.event.extendedProps.originalEvent);
        }
      },
      eventDidMount: function(info) {
        info.el.setAttribute('title', info.event.title);
        
        // Add special styling for background cycle events
        if (info.event.display === 'background') {
          info.el.style.pointerEvents = 'none';
          // Hide the translucent block to let per-day cell gradients handle visuals
          info.el.style.opacity = '0';
          info.el.style.visibility = 'hidden';
        }
      },
      dayCellDidMount: function(info) {
        // Apply cycle styling to individual day cells
        const currentDate = new Date(info.date);
        currentDate.setHours(0, 0, 0, 0);
        
        cycleEvents.forEach(cycleEvent => {
          const start = parseLocalDate(cycleEvent.start);
          start.setHours(0, 0, 0, 0);
          const end = parseLocalDate(cycleEvent.end);
          end.setHours(0, 0, 0, 0);
          
          // Check if current date is within the cycle range (inclusive start, exclusive end)
          if (currentDate >= start && currentDate < end) {
            if (cycleEvent.extendedProps && cycleEvent.extendedProps.isTaskDay) {
              info.el.classList.add('day-task-assignment');
            } else if (cycleEvent.classNames.includes('cycle-dev')) {
              info.el.classList.add('day-in-dev-cycle', 'day-in-current-dev-cycle');
            } else if (cycleEvent.classNames.includes('cycle-post')) {
              const phase = cycleEvent.extendedProps && cycleEvent.extendedProps.phase;
              if (phase === 'previous') {
                info.el.classList.add('day-in-prev-post-cycle');
              } else if (phase === 'next') {
                info.el.classList.add('day-in-next-post-cycle');
              } else {
                info.el.classList.add('day-in-post-cycle');
              }
            }
          }
        });
      }
    });
    
    currentCalendar.render();
    console.log('✅ Calendar rendered successfully');
  } finally {
    calendarLoading = false;
  }
}

// ========== KANBAN BOARD ==========
async function loadKanbanBoard() {
  try {
    if (!currentEvents || currentEvents.length === 0) {
      document.getElementById('kanban-container').innerHTML = '<div class="loading">🔄 Loading data...</div>';
      await loadEvents();
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
  
  const statuses = [
    '📥 In Queue',
    '🔄 In Progress', 
    '⏳ Awaiting Posting',
    '✅ Done',
    '🚫 Blocked'
  ];
  
  const eventsByStatus = statuses.reduce((acc, status) => {
    acc[status] = events.filter(event => event.status === status);
    return acc;
  }, {});
  
  container.innerHTML = statuses.map(status => {
    const statusEvents = eventsByStatus[status] || [];
    const cards = statusEvents.map(event => createKanbanCard(event)).join('');
    
    return `
      <div class="kanban-column" data-status="${status}">
        <div class="kanban-header">
          <div class="kanban-title">${status}</div>
          <div class="kanban-count">${statusEvents.length}</div>
        </div>
        <div class="kanban-cards">
          ${cards || '<div class="kanban-empty">No items</div>'}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => {
      const eventId = card.dataset.eventId; // Keep as string!
      const event = events.find(e => String(e.channelID) === eventId);
      if (event) showEventModal(event);
    });
  });
}

function createKanbanCard(event) {
  const dueDate = new Date(event.posting_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  const isDone = !!(event.status && event.status.includes('Done'));
  const isBlocked = !!(event.status && event.status.includes('Blocked'));
  const isOverdue = daysUntilDue < 0 && !isDone && !isBlocked;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0 && !isDone && !isBlocked;
  
  const dueDateClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
  const dueDateText = isOverdue ? 
    `${Math.abs(daysUntilDue)} days overdue` : 
    isUrgent ? 
      `${daysUntilDue} days left` : 
      `Due ${dueDate.toLocaleDateString()}`;
  
  return `
    <div class="kanban-card" data-event-id="${event.channelID}">
      <div class="kanban-card-type">${api.formatRequestType(event.request_type)}</div>
      <div class="kanban-card-title">${escapeHtml(event.title)}</div>
      <div class="kanban-card-department">${escapeHtml(event.department || event.requester_department_name || 'No Department')}</div>
      <div class="kanban-card-meta">
        <div class="kanban-card-due ${dueDateClass}">${dueDateText}</div>
        ${event.assigned_to_name ? `<div>👤 ${escapeHtml(event.assigned_to_name)}</div>` : '<div>👤 Unassigned</div>'}
        ${event.room ? `<div>📍 ${escapeHtml(event.room)}</div>` : ''}
      </div>
    </div>
  `;
}

function refreshKanban() {
  loadKanbanBoard();
}

// ========== MODAL ==========
function showEventModal(event) {
  const discordLink = api.generateDiscordChannelLink(event.channelID);
  // Parse date as local date to avoid timezone offset issues
  const dueDate = new Date(event.posting_date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  const isDone = !!(event.status && event.status.includes('Done'));
  const isBlocked = !!(event.status && event.status.includes('Blocked'));
  const isOverdue = daysUntilDue < 0 && !isDone && !isBlocked;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0 && !isDone && !isBlocked;
  
  const urgencyClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
  const urgencyText = isOverdue ? 
    `⚠️ ${Math.abs(daysUntilDue)} days overdue` : 
    isUrgent ? 
      `🔥 ${daysUntilDue} days left` : 
      `📅 ${daysUntilDue} days until due`;
  
  // Status badge color
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
        <!-- Description Section -->
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
        
        <!-- Details Grid -->
        <div class="modal-details-grid">
          <!-- Due Date Card -->
          <div class="modal-detail-card ${urgencyClass}">
            <div class="modal-detail-icon">📅</div>
            <div class="modal-detail-content">
              <div class="modal-detail-label">Due Date</div>
              <div class="modal-detail-value">${dueDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
              <div class="modal-detail-sub ${urgencyClass}">${urgencyText}</div>
            </div>
          </div>
          
          <!-- Requester Card -->
          <div class="modal-detail-card">
            <div class="modal-detail-icon">👥</div>
            <div class="modal-detail-content">
              <div class="modal-detail-label">Requested By</div>
              <div class="modal-detail-value">${escapeHtml(event.requester_name || 'Unknown')}</div>
              ${event.department || event.requester_department_name ? `<div class="modal-detail-sub">${escapeHtml(event.department || event.requester_department_name)}</div>` : ''}
            </div>
          </div>
          
          <!-- Assigned To Card -->
          <div class="modal-detail-card">
            <div class="modal-detail-icon">👤</div>
            <div class="modal-detail-content">
              <div class="modal-detail-label">Assigned To</div>
              <div class="modal-detail-value">${escapeHtml(event.assigned_to_name) || 'Unassigned'}</div>
              ${event.assigned_to_id ? `<div class="modal-detail-sub">ID: ${event.assigned_to_id}</div>` : ''}
            </div>
          </div>
          
          ${event.room ? `
          <!-- Room Card -->
          <div class="modal-detail-card">
            <div class="modal-detail-icon">📍</div>
            <div class="modal-detail-content">
              <div class="modal-detail-label">Location</div>
              <div class="modal-detail-value">${escapeHtml(event.room)}</div>
            </div>
          </div>
          ` : ''}
          
          <!-- Created Date Card -->
          <div class="modal-detail-card">
            <div class="modal-detail-icon">🕒</div>
            <div class="modal-detail-content">
              <div class="modal-detail-label">Created</div>
              <div class="modal-detail-value">${new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div class="modal-detail-sub">${new Date(event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        
        <!-- Action Links -->
        <div class="modal-actions">
          <a href="${discordLink}" target="_blank" class="modal-action-btn primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
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
          </a>
          ` : ''}
        </div>
        
        <!-- Metadata Footer -->
        <div class="modal-metadata">
          <div class="modal-metadata-item">
            <span class="modal-metadata-label">Channel ID:</span>
            <span class="modal-metadata-value">${event.channelID}</span>
          </div>
          <div class="modal-metadata-item">
            <span class="modal-metadata-label">Last Updated:</span>
            <span class="modal-metadata-value">${new Date(event.updated_at || event.created_at).toLocaleDateString()} at ${new Date(event.updated_at || event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // Add entrance animation
  requestAnimationFrame(() => {
    modal.classList.add('modal-active');
  });
  
  const close = () => {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 350);
  };
  
  modal.querySelector('.modal-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
}

// ========== ANALYTICS ==========
function initializeCharts() {
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
          '#007bff', '#ffc107', '#28a745', '#dc3545', '#6c757d'
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
        label: 'Requests Created',
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
  const completedEvents = currentEvents.filter(e => e.status && e.status.includes('Done'));
  const totalEvents = currentEvents.length;
  const successRate = totalEvents > 0 ? Math.round((completedEvents.length / totalEvents) * 100) : 0;
  
  updateElement('avg-completion', '5 days');
  updateElement('success-rate', `${successRate}%`);
  updateElement('peak-day', 'Monday');
}

function updateChartsForNightMode() {
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
  Object.values(charts).forEach(chart => {
    if (chart && chart.options) {
      chart.options.plugins = chart.options.plugins || {};
      chart.options.plugins.legend = chart.options.plugins.legend || {};
      chart.options.plugins.legend.labels = { color: '#495057' };
      chart.update();
    }
  });
}

// ========== EVENT FILTERS ==========
function setupEventFilters() {
  const statusFilter = document.getElementById('status-filter');
  const typeFilter = document.getElementById('type-filter');
  const deptFilter = document.getElementById('dept-filter');
  const searchInput = document.getElementById('request-search');

  if (statusFilter) statusFilter.addEventListener('change', autoFilter);
  if (typeFilter) typeFilter.addEventListener('change', autoFilter);
  if (deptFilter) deptFilter.addEventListener('change', autoFilter);
  if (searchInput) {
    searchInput.addEventListener('input', debounce(autoFilter, 250));
  }
}

// Build dynamic filter dropdowns from dataset
function populateAllDynamicFilters(events) {
  try {
    populateRequestFilters(events);
    populateSpreadsheetFilters(events);
  } catch (e) {
    console.warn('Dynamic filters population failed:', e);
  }
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
}

function populateRequestFilters(events) {
  const byStatus = new Map();
  const byType = new Map();
  const byDept = new Map();

  events.forEach(e => {
    const st = e.status || 'Unknown';
    byStatus.set(st, (byStatus.get(st)||0)+1);
    const tp = e.request_type || 'Unknown';
    byType.set(tp, (byType.get(tp)||0)+1);
    const dept = e.department || e.requester_department_name || 'Unknown';
    byDept.set(dept, (byDept.get(dept)||0)+1);
  });

  // Status order preference
  const statusOrder = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','🚫 Blocked','✅ Done'];
  const statuses = statusOrder.filter(s => byStatus.has(s)).concat(
    uniqueSorted(Array.from(byStatus.keys()).filter(s => !statusOrder.includes(s)))
  );

  rebuildSelect('status-filter', statuses.map(s => ({value:s, label:`${s} (${byStatus.get(s)})`})));

  const types = uniqueSorted(Array.from(byType.keys()));
  rebuildSelect('type-filter', types.map(t => ({
    value: t,
    label: `${api ? api.formatRequestType(t) : t} (${byType.get(t)})`
  })));

  const depts = uniqueSorted(Array.from(byDept.keys()));
  rebuildSelect('dept-filter', depts.map(d => ({value:d, label:`${d} (${byDept.get(d)})`})));
}

function rebuildSelect(id, options) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = el.value;
  // Clear
  while (el.firstChild) el.removeChild(el.firstChild);
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'All';
  el.appendChild(optAll);
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    el.appendChild(opt);
  });
  if (current && options.some(o => String(o.value) === String(current))) {
    el.value = current;
  } else {
    el.value = '';
  }
}

function populateSpreadsheetFilters(events) {
  const byStatus = new Map();
  const byType = new Map();
  const byDept = new Map();

  events.forEach(e => {
    const st = e.status || 'Unknown';
    byStatus.set(st, (byStatus.get(st)||0)+1);
    const tp = e.request_type || 'Unknown';
    byType.set(tp, (byType.get(tp)||0)+1);
    const dept = e.department || e.requester_department_name || 'Unknown';
    byDept.set(dept, (byDept.get(dept)||0)+1);
  });

  // Status order preference
  const statusOrder = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','🚫 Blocked','✅ Done'];
  const statuses = statusOrder.filter(s => byStatus.has(s)).concat(
    uniqueSorted(Array.from(byStatus.keys()).filter(s => !statusOrder.includes(s)))
  );

  rebuildSelect('spreadsheet-status-filter', statuses.map(s => ({value:s, label:`${s} (${byStatus.get(s)})`})));

  const types = uniqueSorted(Array.from(byType.keys()));
  rebuildSelect('spreadsheet-type-filter', types.map(t => ({
    value: t,
    label: `${api ? api.formatRequestType(t) : t} (${byType.get(t)})`
  })));

  const depts = uniqueSorted(Array.from(byDept.keys()));
  rebuildSelect('spreadsheet-dept-filter', depts.map(d => ({value:d, label:`${d} (${byDept.get(d)})`})));
}

function applyAllFilters() { autoFilter(); }
function resetRequestFilters() {
  ['status-filter','type-filter','dept-filter','request-search'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
  });
  autoFilter();
}

function autoFilter() {
  const statusVal = document.getElementById('status-filter')?.value || '';
  const typeVal = document.getElementById('type-filter')?.value || '';
  const deptVal = document.getElementById('dept-filter')?.value || '';
  const searchVal = (document.getElementById('request-search')?.value || '').toLowerCase().trim();

  let filtered = currentEvents.slice();

  if (statusVal) filtered = filtered.filter(e => e.status === statusVal);
  if (typeVal) filtered = filtered.filter(e => (e.request_type || '').toLowerCase().includes(typeVal.toLowerCase()));
  if (deptVal) filtered = filtered.filter(e => {
    const dept = (e.department || e.requester_department_name || '').toLowerCase();
    return dept.includes(deptVal.toLowerCase());
  });
  if (searchVal) {
    filtered = filtered.filter(e => {
      return [e.title, e.description, e.requester_name, e.assigned_to_name]
        .filter(Boolean)
        .some(field => field.toLowerCase().includes(searchVal));
    });
  }

  // Update active filter chips
  const chipsContainer = document.getElementById('active-filters');
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    const pushChip = (label, value, clearFn) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span>${label}: ${escapeHtml(value)}</span><button aria-label="Remove filter">✕</button>`;
      chip.querySelector('button').onclick = clearFn;
      chipsContainer.appendChild(chip);
    };
    if (statusVal) pushChip('Status', statusVal, () => { document.getElementById('status-filter').selectedIndex = 0; autoFilter(); });
    if (typeVal) pushChip('Type', typeVal, () => { document.getElementById('type-filter').selectedIndex = 0; autoFilter(); });
    if (deptVal) pushChip('Dept', deptVal, () => { document.getElementById('dept-filter').selectedIndex = 0; autoFilter(); });
    if (searchVal) pushChip('Search', searchVal, () => { document.getElementById('request-search').value=''; autoFilter(); });
  }

  // Update count badge
  const countEl = document.getElementById('filtered-count');
  if (countEl) countEl.textContent = `${filtered.length} shown`;

  // Re-render sections with filtered events
  displayEvents(filtered);
  updateEventsSummary(filtered);
}

function debounce(fn, wait) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this,args), wait); };
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

function updateApiStatus(message, type) {
  const statusEl = document.getElementById('api-status');
  if (statusEl) {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      if (message.includes('Connected')) {
        statusEl.textContent = '✅';
      } else if (message.includes('Error') || message.includes('Disconnected')) {
        statusEl.textContent = '❌';
      } else if (message.includes('Not logged in')) {
        statusEl.textContent = '🔐';
      } else {
        statusEl.textContent = '🔄';
      }
    } else {
      statusEl.textContent = message;
    }
    
    statusEl.className = `api-status ${type}`;
  }
}

function refreshData() {
  showToast('Refreshing data...', 'info');
  eventsLoadingPromise = null; // Clear cache
  loadAllData().then(() => {
    const calendarSection = document.getElementById('calendar');
    if (calendarSection && calendarSection.classList.contains('active')) {
      loadMainCalendar();
    }
    const kanbanSection = document.getElementById('kanban');
    if (kanbanSection && kanbanSection.classList.contains('active')) {
      loadKanbanBoard();
    }
    showToast('Data refreshed!', 'success');
  });
}

function exportEvents() {
  const csv = convertToCSV(currentEvents);
  downloadCSV(csv, 'msa-marketing-requests.csv');
  showToast('Requests exported successfully!');
}

// ========== SPREADSHEET VIEW ==========
function loadSpreadsheetView() {
  if (!currentEvents || !currentEvents.length) {
    loadEvents().then(renderSpreadsheetTable);
  } else {
    renderSpreadsheetTable();
  }
  setupSpreadsheetFilters();
}

function setupSpreadsheetFilters() {
  const statusFilter = document.getElementById('spreadsheet-status-filter');
  const typeFilter = document.getElementById('spreadsheet-type-filter');
  const deptFilter = document.getElementById('spreadsheet-dept-filter');
  const searchInput = document.getElementById('spreadsheet-search');
  
  if (statusFilter && !statusFilter.dataset.bound) {
    statusFilter.addEventListener('change', applySpreadsheetFilters);
    statusFilter.dataset.bound = 'true';
  }
  if (typeFilter && !typeFilter.dataset.bound) {
    typeFilter.addEventListener('change', applySpreadsheetFilters);
    typeFilter.dataset.bound = 'true';
  }
  if (deptFilter && !deptFilter.dataset.bound) {
    deptFilter.addEventListener('change', applySpreadsheetFilters);
    deptFilter.dataset.bound = 'true';
  }
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener('input', debounce(applySpreadsheetFilters, 250));
    searchInput.dataset.bound = 'true';
  }
}

function normalizeStatusKey(status) {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (s.includes('queue')) return 'queue';
  if (s.includes('progress')) return 'inprogress';
  if (s.includes('awaiting')) return 'awaiting';
  if (s.includes('done')) return 'done';
  if (s.includes('blocked')) return 'blocked';
  return s.replace(/\s+/g,'-');
}

function renderSpreadsheetTable() {
  const wrapper = document.getElementById('spreadsheet-table-wrapper');
  if (!wrapper) return;

  const statusVal = document.getElementById('spreadsheet-status-filter')?.value || '';
  const typeFilterVal = document.getElementById('spreadsheet-type-filter')?.value || '';
  const deptVal = document.getElementById('spreadsheet-dept-filter')?.value || '';
  const searchVal = (document.getElementById('spreadsheet-search')?.value || '').toLowerCase().trim();

  let data = currentEvents.slice();
  
  // Apply filters
  if (statusVal) {
    data = data.filter(e => e.status === statusVal);
  }
  if (typeFilterVal) {
    data = data.filter(e => (e.request_type || '').toLowerCase().includes(typeFilterVal.toLowerCase()));
  }
  if (deptVal) {
    data = data.filter(e => {
      const dept = (e.department || e.requester_department_name || '').toLowerCase();
      return dept.includes(deptVal.toLowerCase());
    });
  }
  if (searchVal) {
    data = data.filter(e => [e.title,e.description,e.requester_name,e.assigned_to_name,e.status,e.request_type]
      .filter(Boolean)
      .some(v => v.toLowerCase().includes(searchVal)));
  }

  // Update filter chips
  const chipsContainer = document.getElementById('spreadsheet-active-filters');
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    const pushChip = (label, value, clearFn) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span>${label}: ${escapeHtml(value)}</span><button aria-label="Remove filter">✕</button>`;
      chip.querySelector('button').onclick = clearFn;
      chipsContainer.appendChild(chip);
    };
    if (statusVal) pushChip('Status', statusVal, () => { document.getElementById('spreadsheet-status-filter').selectedIndex = 0; applySpreadsheetFilters(); });
    if (typeFilterVal) pushChip('Type', typeFilterVal, () => { document.getElementById('spreadsheet-type-filter').selectedIndex = 0; applySpreadsheetFilters(); });
    if (deptVal) pushChip('Dept', deptVal, () => { document.getElementById('spreadsheet-dept-filter').selectedIndex = 0; applySpreadsheetFilters(); });
    if (searchVal) pushChip('Search', searchVal, () => { document.getElementById('spreadsheet-search').value=''; applySpreadsheetFilters(); });
  }

  // Update count
  const countEl = document.getElementById('spreadsheet-filtered-count');
  if (countEl) {
    countEl.textContent = `${data.length} shown`;
  }

  // Update summary
  updateSpreadsheetSummary(data);

  // Sort chronologically by posting date ASC
  data.sort((a,b) => new Date(a.posting_date) - new Date(b.posting_date));

  // Group by status with Done at bottom
  const groupsOrder = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','🚫 Blocked','✅ Done'];
  const groups = {};
  data.forEach(ev => {
    const st = ev.status || 'Unknown';
    groups[st] = groups[st] || [];
    groups[st].push(ev);
  });

  const orderedStatuses = groupsOrder.filter(s => groups[s])
    .concat(Object.keys(groups).filter(s => !groupsOrder.includes(s) && !s.includes('Done')))
    .concat(groups['✅ Done'] ? ['✅ Done'] : []);

  const header = `
    <table class="table">
      <thead>
        <tr>
          <th>Due Date</th>
          <th>Status</th>
          <th>Title</th>
          <th>Type</th>
          <th>Requester</th>
          <th>Assigned To</th>
          <th>Department</th>
          <th>Channel ID</th>
        </tr>
      </thead>
      <tbody>`;

  let body = '';
  orderedStatuses.forEach(statusLabel => {
    const rows = groups[statusLabel];
    if (!rows) return;
    body += `<tr class="status-group-row"><td colspan="8">${escapeHtml(statusLabel)} (${rows.length})</td></tr>`;
    rows.forEach(ev => {
      const dueDate = new Date(ev.posting_date + 'T00:00:00');
      const statusKey = normalizeStatusKey(ev.status);
      const isDone = statusKey === 'done';
      const isBlocked = statusKey === 'blocked';
      const discordLink = `https://discord.com/channels/1201569925481820220/${ev.channelID}`;
      body += `<tr>
        <td>${dueDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
        <td><span class="pill status ${statusKey}">${escapeHtml(ev.status || 'Unknown')}</span></td>
        <td>${escapeHtml(ev.title)}</td>
        <td><span class="pill type">${escapeHtml(api.formatRequestType(ev.request_type) || 'N/A')}</span></td>
        <td>${escapeHtml(ev.requester_name || '—')}</td>
        <td>${escapeHtml(ev.assigned_to_name || (isDone?'Completed':'Unassigned'))}</td>
        <td>${escapeHtml(ev.department || ev.requester_department_name || '—')}</td>
        <td class="text-muted"><a href="${discordLink}" target="_blank" rel="noopener noreferrer" class="discord-link" title="Open in Discord">💬 ${ev.channelID}</a></td>
      </tr>`;
    });
  });

  const footer = '</tbody></table>';
  wrapper.innerHTML = header + body + footer;
  
  // Add click handlers to rows (except status group rows)
  wrapper.querySelectorAll('.table tbody tr:not(.status-group-row)').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      // Don't trigger if clicking on the Discord link
      if (e.target.closest('.discord-link')) return;
      
      const channelIdCell = row.querySelector('td:last-child .discord-link');
      if (channelIdCell) {
        const channelId = channelIdCell.textContent.replace('💬 ', '').trim();
        const event = data.find(ev => String(ev.channelID) === channelId);
        if (event) {
          showEventModal(event);
        }
      }
    });
    
    // Add hover effect
    row.addEventListener('mouseenter', () => {
      if (!row.classList.contains('status-group-row')) {
        row.style.backgroundColor = 'rgba(211, 175, 90, 0.08)';
      }
    });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = '';
    });
  });
}

function exportSpreadsheetCsv() {
  // Reuse current filtered table data
  const statusVal = document.getElementById('spreadsheet-status-filter')?.value || '';
  const typeFilterVal = document.getElementById('spreadsheet-type-filter')?.value || '';
  const deptVal = document.getElementById('spreadsheet-dept-filter')?.value || '';
  const searchVal = (document.getElementById('spreadsheet-search')?.value || '').toLowerCase().trim();
  
  let data = currentEvents.slice();
  if (statusVal) data = data.filter(e => e.status === statusVal);
  if (typeFilterVal) data = data.filter(e => (e.request_type || '').toLowerCase().includes(typeFilterVal.toLowerCase()));
  if (deptVal) data = data.filter(e => {
    const dept = (e.department || e.requester_department_name || '').toLowerCase();
    return dept.includes(deptVal.toLowerCase());
  });
  if (searchVal) data = data.filter(e => [e.title,e.description,e.requester_name,e.assigned_to_name,e.status,e.request_type]
    .filter(Boolean).some(v => v.toLowerCase().includes(searchVal)));
  
  data.sort((a,b) => new Date(a.posting_date) - new Date(b.posting_date));
  const rows = data.map(ev => [
    ev.posting_date,
    ev.status,
    ev.title,
    ev.request_type,
    ev.requester_name,
    ev.assigned_to_name,
    ev.department || ev.requester_department_name || '',
    ev.channelID
  ]);
  const header = ['Due Date','Status','Title','Type','Requester','Assigned To','Department','Channel ID'];
  const csv = [header,...rows].map(r=>r.map(f=>`"${String(f||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadCSV(csv,'msa-spreadsheet-view.csv');
}

function applySpreadsheetFilters() {
  renderSpreadsheetTable();
}

function resetSpreadsheetFilters() {
  ['spreadsheet-status-filter','spreadsheet-type-filter','spreadsheet-dept-filter','spreadsheet-search'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
  });
  applySpreadsheetFilters();
}

function updateSpreadsheetSummary(filteredEvents) {
  const summaryEl = document.getElementById('spreadsheet-summary-inline');
  if (!summaryEl) return;

  const statuses = ['📥 In Queue', '🔄 In Progress', '⏳ Awaiting Posting', '🚫 Blocked', '✅ Done'];
  const counts = {};
  statuses.forEach(s => counts[s] = 0);
  
  filteredEvents.forEach(e => {
    const status = e.status || 'Unknown';
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdueCount = 0;
  filteredEvents.forEach(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    const isDone = e.status && e.status.includes('Done');
    const isBlocked = e.status && e.status.includes('Blocked');
    if (dueDate < today && !isDone && !isBlocked) {
      overdueCount++;
    }
  });

  // Build inline summary text
  const parts = [];
  if (counts['📥 In Queue'] > 0) parts.push(`${counts['📥 In Queue']} in queue`);
  if (counts['🔄 In Progress'] > 0) parts.push(`${counts['🔄 In Progress']} in progress`);
  if (counts['⏳ Awaiting Posting'] > 0) parts.push(`${counts['⏳ Awaiting Posting']} awaiting`);
  if (counts['🚫 Blocked'] > 0) parts.push(`${counts['🚫 Blocked']} blocked`);
  if (counts['✅ Done'] > 0) parts.push(`${counts['✅ Done']} done`);
  if (overdueCount > 0) parts.push(`⚠️ ${overdueCount} overdue`);

  summaryEl.textContent = parts.length > 0 ? parts.join(' • ') : 'No items';
}

function refreshSpreadsheet() { loadSpreadsheetView(); }

function convertToCSV(events) {
  const headers = ['Channel ID', 'Title', 'Description', 'Status', 'Type', 'Due Date', 'Assigned To', 'Room', 'Signup URL', 'Created'];
  const rows = events.map(event => [
    event.channelID,
    event.title,
    event.description || '',
    event.status || 'No Status',
    event.request_type || '',
    event.posting_date,
    event.assigned_to_name || 'Unassigned',
    event.room || '',
    event.signup_url || '',
    event.created_at
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
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

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== API TESTING ==========
async function testApiConnection() {
  const resultsDiv = document.getElementById('api-test-results');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '<div class="loading">Testing API connection...</div>';
  
  try {
    const user = await api.checkAuth();
    resultsDiv.innerHTML = `
      <div class="success">✅ API Connection Successful</div>
      <div>Authenticated as: ${user ? user.username : 'Not logged in'}</div>
      <pre>${JSON.stringify(user, null, 2)}</pre>
    `;
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="error">❌ API Connection Failed</div>
      <div>${error.message}</div>
    `;
  }
}

async function testApiEvents() {
  const resultsDiv = document.getElementById('api-test-results');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '<div class="loading">Testing requests endpoint...</div>';
  
  try {
    const requests = await api.getAllRequests();
    resultsDiv.innerHTML = `
      <div class="success">✅ Requests Endpoint Successful</div>
      <div>Found ${requests.length} requests</div>
      <pre>${JSON.stringify(requests.slice(0, 2), null, 2)}</pre>
    `;
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="error">❌ Requests Endpoint Failed</div>
      <div>${error.message}</div>
    `;
  }
}

// ========== AUTO REFRESH ==========
function setupAutoRefresh() {
  const refreshInterval = window.MSA_CONFIG?.ui?.refreshInterval || 300000;
  
  setInterval(() => {
    console.log('🔄 Auto-refreshing data...');
    eventsLoadingPromise = null;
    loadAllData();
  }, refreshInterval);
}

// Handle viewport changes
window.addEventListener('resize', () => {
  const statusEl = document.getElementById('api-status');
  if (statusEl) {
    const currentText = statusEl.textContent;
    const currentClass = statusEl.className;
    const type = currentClass.split(' ').pop();
    
    if (currentText === '✅' || currentText.includes('Connected')) {
      updateApiStatus('✅ Connected', type);
    } else if (currentText === '❌' || currentText.includes('Error') || currentText.includes('Disconnected')) {
      updateApiStatus('❌ Connection Error', type);
    } else if (currentText === '🔐' || currentText.includes('Not logged in')) {
      updateApiStatus('🔐 Not logged in', type);
    }
  }
  
  // Handle sidebar behavior on resize
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  
  if (window.innerWidth > 768) {
    // Desktop: remove mobile 'open' class
    sidebar.classList.remove('open');
  } else {
    // Mobile: remove desktop collapsed state
    mainContent.classList.remove('sidebar-collapsed');
  }
});
