// Marketing Command Center Configuration
window.MSA_CONFIG = {
  // API Configuration
  api: {
    baseUrl: 'http://localhost:5000', // Change this to your API server URL
    apiKey: 'your-secret-api-key',    // Replace with your actual API key
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
