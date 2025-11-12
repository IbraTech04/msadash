// ========== MSA MARKETING COMMAND CENTER - DASHBOARD SCRIPT ==========
// Refactored for Spring Boot Backend API

// Global state (use window-scoped events so modules share a single source of truth)
window.currentEvents = window.currentEvents || [];
let currentCalendar = null;
let charts = {};
let calendarLoading = false;
window.eventsLoadingPromise = window.eventsLoadingPromise || null;
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
  const user = await api.checkAuth(); // Authentication check
    
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
  console.log('🔐 Showing login screen...'); // Show login screen
  
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
  const loginScreen = document.getElementById('login-screen'); // Hide login screen
  if (loginScreen) {
    loginScreen.remove();
  }
  document.querySelector('.main-content')?.classList.remove('hidden');
}

function initiateLogin() {
  console.log('🔐 Initiating Discord OAuth2 login...'); // Initiate login
  // Store current page so we can return after login
  try {
    sessionStorage.setItem('preLoginUrl', window.location.href);
  } catch (e) {
    console.warn('Could not save pre-login URL:', e);
  }
  api.login();
}



function updateUserGreeting(user) {
  const greetingEl = document.querySelector('.user-greeting'); // Update user greeting
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
  const menu = document.createElement('div'); // Show user menu
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
  const compactToggle = document.getElementById('compact-mode-toggle'); // Setup compact mode
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
  const container = document.getElementById('task-container'); // Toggle compact mode
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
  const container = document.getElementById('task-container'); // Activate compact mode
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
  const container = document.getElementById('task-container'); // Deactivate compact mode
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
  const navItems = document.querySelectorAll('.nav-item'); // Setup navigation
  
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
      if (typeof window.loadMainCalendar === 'function') {
        window.loadMainCalendar();
      }
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
  const sidebar = document.querySelector('.sidebar'); // Toggle sidebar
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
  const toggleButton = document.getElementById("toggle-mode"); // Setup mode toggle
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
  try { // Apply initial theme
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
  console.log('🔄 Loading all dashboard data...'); // Load all data
  try {
    await loadEvents(); // sets window.currentEvents
    // Populate dynamic filters based on the freshly loaded dataset
    populateAllDynamicFilters(window.currentEvents);
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

// Events board logic moved to js/events-board.js (loadEvents, displayEvents, updateEventsSummary, etc.)

// ========== DASHBOARD STATS ==========
async function loadDashboardStats() {
  const events = window.currentEvents || [];
  const stats = window.computeEventStats ? window.computeEventStats(events) : {total:0,pending:0,completed:0,overdue:0};
  
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
// Moved to js/recent-activity.js and exposed as window.loadRecentActivity

// ========== CALENDAR FUNCTIONS ==========
// Moved loadMiniCalendar to js/mini-calendar.js and exposed as window.loadMiniCalendar

// ========== CYCLE VIEW ==========
// Moved cycle view logic to js/cycle-view.js (window.loadCycleView)

// ========== CALENDAR CYCLE HELPERS ==========
// Calendar cycle helpers moved to js/main-calendar.js

// Calendar logic moved to js/main-calendar.js (window.loadMainCalendar)

// ========== KANBAN BOARD ==========
// Kanban board logic now lives in js/kanban.js. Removed duplicate implementation.

// showEventModal removed; canonical implementation is in js/utils-modal.js

// ========== ANALYTICS ==========
function initializeCharts() {
  console.log('📊 Charts initialized');
}

async function loadAnalytics() {
  if (!window.currentEvents.length) {
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
  
  window.currentEvents.forEach(event => {
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
  
  window.currentEvents.forEach(event => {
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
  
  window.currentEvents.forEach(event => {
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
  const completedEvents = window.currentEvents.filter(e => e.status && e.status.includes('Done'));
  const totalEvents = window.currentEvents.length;
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

  let filtered = window.currentEvents.slice();

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
  window.eventsLoadingPromise = null; // Clear events load cache used by modules
  // Optional: clear current events to reflect loading state in dependent views
  // They will repopulate after loadAllData completes
  // window.currentEvents = [];
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
  const csv = convertToCSV(window.currentEvents);
  downloadCSV(csv, 'msa-marketing-requests.csv');
  showToast('Requests exported successfully!');
}

// ========== SPREADSHEET VIEW ==========
// Spreadsheet view logic moved to js/spreadsheet.js (window.loadSpreadsheetView, filters, table, export)

// normalizeStatusKey moved to js/spreadsheet.js

// renderSpreadsheetTable moved to js/spreadsheet.js

// exportSpreadsheetCsv moved to js/spreadsheet.js

// apply/reset spreadsheet filters moved to js/spreadsheet.js

// updateSpreadsheetSummary moved to js/spreadsheet.js

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
    window.eventsLoadingPromise = null;
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
  
  // Setup cycle view toggle button
  const cycleToggleBtn = document.getElementById('cycle-view-toggle');
  if (cycleToggleBtn) {
    cycleToggleBtn.addEventListener('click', function() {
      if (typeof window.toggleCycleView === 'function') {
        window.toggleCycleView();
      }
    });
  }
});

// Defensive: event delegation so the toggle works even if the button is re-rendered
document.addEventListener('click', function(e) {
  const tgt = e.target && (e.target.id === 'cycle-view-toggle' ? e.target : e.target.closest && e.target.closest('#cycle-view-toggle'));
  if (!tgt) return;
  if (typeof window.toggleCycleView === 'function') {
    window.toggleCycleView();
  }
});
