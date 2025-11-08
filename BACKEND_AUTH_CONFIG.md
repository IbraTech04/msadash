# Frontend Configuration for Spring Boot Backend

## Backend Authentication Redirect Issue

The backend currently returns JSON responses at `/api/auth/success` and `/api/auth/failure` instead of redirecting to the frontend.

### Solution Options:

#### Option 1: Backend Configuration (RECOMMENDED)
Configure the Spring Boot backend to redirect to the frontend after authentication:

```java
// In your SecurityConfig or OAuth2 success handler
http.oauth2Login()
    .defaultSuccessUrl("http://localhost:5173/auth-callback.html", true)
    .failureUrl("http://localhost:5173/?error=auth_failed");
```

Or set environment variables:
```properties
# In application.properties or environment variables
oauth2.success-redirect-url=http://localhost:5173/auth-callback.html
oauth2.failure-redirect-url=http://localhost:5173/?error=auth_failed
```

#### Option 2: Frontend Workaround (CURRENT)
We've implemented a workaround where:
1. User clicks "Sign in with Discord" button
2. Frontend redirects to `http://localhost:8080/oauth2/authorization/discord`
3. Discord OAuth happens (backend handles this)
4. Backend redirects to `/api/auth/success` or `/api/auth/failure`
5. User needs to manually navigate back to the frontend
6. Frontend checks authentication via `/api/auth/user`

### Files Modified:
- `script.js` - Added authentication flow with login screen
- `auth-callback.html` - Created callback handler (for future use)
- `style.css` - Added login screen styles
- `api-service.js` - Created API service layer
- `config.js` - Updated to use port 8080 for Spring Boot backend

### Testing:
1. Open `index.html` in a browser
2. Should see login screen
3. Click "Sign in with Discord"
4. Complete Discord OAuth
5. **MANUALLY** navigate back to `http://localhost:5173/` (or your frontend URL)
6. Should now be logged in and see the dashboard

### What the Backend Should Return:
Currently returns:
```json
{
  "status": "success",
  "message": "Successfully authenticated with Discord",
  "user": { ... }
}
```

Should instead: **Redirect (302/303)** to the frontend URL with the session cookie set.
