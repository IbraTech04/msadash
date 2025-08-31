# Environment Configuration Guide

## Setting API URL via Environment Variables

This application supports multiple ways to configure the API URL for different environments.

### 1. Using the Setup Scripts (Recommended)

**Windows (PowerShell):**
```powershell
# Development (auto-detect localhost)
.\setup-env.ps1

# Staging
.\setup-env.ps1 -ApiUrl "https://api-staging.utmmsa.com" -Environment "staging"

# Production
.\setup-env.ps1 -ApiUrl "https://api.utmmsa.com" -ApiKey "your-prod-key" -Environment "production"
```

**Linux/Mac (Bash):**
```bash
# Development (auto-detect localhost)
./setup-env.sh

# Staging
./setup-env.sh "https://api-staging.utmmsa.com" "" "staging"

# Production  
./setup-env.sh "https://api.utmmsa.com" "your-prod-key" "production"
```

### 2. Manual Environment Configuration

Edit `env.js` directly:
```javascript
window.MSA_ENV = {
  API_URL: "https://api.utmmsa.com",      // Your API server
  API_KEY: "your-production-key",         // Your API key
  ENVIRONMENT: "production"               // Environment name
};
```

### 3. URL Parameters (Testing Only)

Add query parameters for quick testing:
```
https://your-site.com/?api_url=https://test-api.com
```

### 4. Automatic Environment Detection

The app automatically detects environment based on hostname:

- `localhost` / `127.0.0.1` → Development API (`http://localhost:5000`)
- Domains with `staging`/`dev` → Staging API (`https://api-staging.utmmsa.com`)
- Production domains → Production API (`https://api.utmmsa.com`)

### Priority Order

Environment variables are resolved in this order:

1. Runtime `window.MSA_ENV.API_URL` (set in env.js)
2. URL parameter `?api_url=...`
3. Hostname-based detection
4. Default fallback

### Examples

#### Development

```bash
# Uses automatic detection: http://localhost:5000
.\setup-env.ps1
```

#### Staging

```bash
# Sets staging API URL
.\setup-env.ps1 -ApiUrl "https://api-staging.utmmsa.com" -Environment "staging"
```

#### Production

```bash
# Sets production API and key
.\setup-env.ps1 -ApiUrl "https://api.utmmsa.com" -ApiKey "prod-key-12345" -Environment "production"
```

This flexible system ensures your API configuration works across all deployment scenarios!
