// Authentication and user UI module
// Exposes: checkAuthentication, showLoginScreen, hideLoginScreen, initiateLogin, updateUserGreeting, showUserMenu

(function(){
  async function checkAuthentication() {
    const api = window.apiService || window.api;
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
    document.querySelector('.main-content')?.classList.add('hidden');
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
      </div>`;
    document.body.appendChild(loginScreen);
  }

  function hideLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.remove();
    document.querySelector('.main-content')?.classList.remove('hidden');
  }

  function initiateLogin() {
    const api = window.apiService || window.api;
    console.log('🔐 Initiating Discord OAuth2 login...');
    try { sessionStorage.setItem('preLoginUrl', window.location.href); } catch (e) { console.warn('Could not save pre-login URL:', e); }
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
      if (loginBtn) loginBtn.style.display = 'none';
    } else if (greetingEl && !user) {
      greetingEl.style.display = 'none';
      if (loginBtn) { loginBtn.style.display = 'inline-block'; loginBtn.onclick = initiateLogin; }
    }
  }

  function showUserMenu(user) {
    const menu = document.createElement('div');
    menu.className = 'user-dropdown';
    menu.innerHTML = `
      <div class="user-menu-item">
        <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" alt="${user.username}" class="user-avatar-small">
        <div>
          <div class="user-menu-name">${user.username}#${user.discriminator}</div>
          <div class="user-menu-email">${user.email || 'No email'}</div>
        </div>
      </div>
      <button class="user-menu-button" onclick="window.apiService.login()">Switch Account</button>`;
    document.body.appendChild(menu);
    setTimeout(() => menu.remove(), 5000);
  }

  window.checkAuthentication = checkAuthentication;
  window.showLoginScreen = showLoginScreen;
  window.hideLoginScreen = hideLoginScreen;
  window.initiateLogin = initiateLogin;
  window.updateUserGreeting = updateUserGreeting;
  window.showUserMenu = showUserMenu;
  window.continueAsGuest = continueAsGuest; // Export for global access
  
  function continueAsGuest() {
    console.log('👤 Continuing as guest (from auth.js)...');
    window.isGuestMode = true;
    hideLoginScreen();
    updateUserGreeting(null);
    if (typeof window.updateApiStatus === 'function') {
      window.updateApiStatus('👤 Guest Mode', 'warning');
    }
    if (typeof window.loadGuestData === 'function') {
      window.loadGuestData();
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Welcome! You\'re viewing in guest mode with limited features.', 'info');
    }
  }
})();
