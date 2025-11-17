// Marketing Command Center Configuration
window.MSA_CONFIG = {
  // API Configuration
  api: {
    // Environment-aware API URL configuration
    baseUrl: (() => {
      // Check for runtime environment variables (set in env.js)
      if (window.MSA_ENV && window.MSA_ENV.API_URL) {
        return window.MSA_ENV.API_URL;
      }
      
      // Check URL parameters for quick environment switching
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('api_url')) {
        return urlParams.get('api_url');
      }
      
      // Environment detection based on hostname
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8080'; // Spring Boot Development
      } else if (hostname.includes('staging') || hostname.includes('dev')) {
        return 'https://api-staging.utmmsa.com'; // Staging
      } else {
        return 'https://api.utmmsa.com'; // Production
      }
    })(),
    
    apiKey: (() => {
      // Environment-aware API key (set in env.js for bot operations)
      if (window.MSA_ENV && window.MSA_ENV.API_KEY) {
        return window.MSA_ENV.API_KEY;
      }
      return null; // No default API key for security
    })(),
    
    timeout: 10000, // 10 second timeout
    retryAttempts: 3
  },
  
  // Feature Flags
  features: {
    useApi: true,           // Set to false to use CSV fallback only
    showApiStatus: true,    // Show API connection status
    enableNotifications: false, // Future feature
    enableOfflineMode: false   // Future feature
  },
  
  // UI Configuration
  ui: {
    theme: 'auto', // 'light', 'dark', or 'auto'
    defaultView: 'calendar', // Default section to expand
    refreshInterval: 300000, // 5 minutes in milliseconds
    showTooltips: true
  },
  
  // Calendar Configuration
  calendar: {
    defaultView: 'dayGridMonth',
    firstDay: 0, // 0 = Sunday, 1 = Monday
    timeFormat: 'h:mm a',
    displayEventEnd: false
  },
  
  // Fallback CSV URLs (keep these as backup)
  csvUrls: {
    tasks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGgYOn6rf3TCHQ0IWTBuGtjxLGNrSIgcXoxnOGT8bKN6c4BRmULTI-A7alSK1XtJVMFsFS3MEuKcs9/pub?gid=31970795&single=true&output=csv",
    countdowns: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGgYOn6rf3TCHQ0IWTBuGtjxLGNrSIgcXoxnOGT8bKN6c4BRmULTI-A7alSK1XtJVMFsFS3MEuKcs9/pub?gid=234415343&single=true&output=csv",
    team: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGgYOn6rf3TCHQ0IWTBuGtjxLGNrSIgcXoxnOGT8bKN6c4BRmULTI-A7alSK1XtJVMFsFS3MEuKcs9/pub?gid=553348135&single=true&output=csv"
  }
};
