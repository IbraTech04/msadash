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
  // Setup sidebar toggle for mobile
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
  
  // Initialize charts placeholder
  initializeCharts();
  
  // Setup event filters
  setupEventFilters();
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
    await Promise.all([
      loadDashboardStats(),
      loadRecentActivity(),
      loadMiniCalendar()
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
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
  
  const urgencyClass = isOverdue ? 'overdue' : isUrgent ? 'urgent' : '';
  const urgencyText = isOverdue ? 
    `⚠️ ${Math.abs(daysUntilDue)} days overdue` : 
    isUrgent ? 
      `🔥 ${daysUntilDue} days left` : 
      `📅 ${daysUntilDue} days until due`;
  
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
      ${urgencyClass ? `<div class="event-card-urgency ${urgencyClass}">${urgencyText}</div>` : ''}
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
      const dueDate = new Date(e.posting_date);
      const isDone = e.status && e.status.includes('Done');
      return dueDate < today && !isDone;
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
      const dueDate = new Date(e.posting_date);
      const isDone = e.status && e.status.includes('Done');
      return dueDate < today && !isDone;
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
  if (container) {
    const today = new Date();
    const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const upcomingCount = currentEvents.filter(e => {
      const dueDate = new Date(e.posting_date);
      return dueDate >= today && !e.status?.includes('Done');
    }).length;
    
    container.innerHTML = `
      <div class="mini-calendar-content">
        <div class="mini-calendar-month">${monthName}</div>
        <div class="mini-calendar-stat">
          <span class="mini-calendar-number">${upcomingCount}</span>
          <span class="mini-calendar-label">Upcoming Deadlines</span>
        </div>
      </div>
    `;
  }
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
    
    console.log(`📅 Creating calendar with ${events.length} events`);
    
    const calendarEvents = events.map(event => {
      const dueDate = new Date(event.posting_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < today;
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const isUrgent = daysUntil <= 2 && daysUntil >= 0;
      
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
        info.el.setAttribute('title', info.event.title);
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
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
  
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
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
  
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
    modal.classList.remove('modal-active');
    setTimeout(() => modal.remove(), 300);
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
});
