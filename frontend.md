# Frontend JWT Integration Guide

This document outlines the frontend changes needed to use the new JWT-based auth flow that complements Discord OAuth.

## 1) OAuth flow: capture the JWT after Discord login

### Expected backend behavior
- After a successful Discord OAuth login, the backend redirects to `app.frontend.url` with a `token` query param. (`/oauth2/**` → redirect to `<frontend>?token=<jwt>`.)

### Frontend changes
- Update the OAuth callback handling to read `token` from the URL query parameters.
- Store the JWT securely (see **Storage** below).
- Remove the token from the URL to avoid leaking it via referrers or logs.

**Example flow**
1. User clicks “Login with Discord” → redirects to `/oauth2/authorization/discord`.
2. Backend authenticates and redirects to `https://frontend.example.com?token=...`.
3. Frontend reads `token`, stores it, then redirects to `https://frontend.example.com` (no query string).

## 2) Storage: persist the JWT for session continuity

### Recommended approach
- Use a secure storage strategy that fits your risk model.
- If you can use HTTP-only cookies from the backend, prefer that (more secure).
- If you must store client-side, store in memory + refresh on app boot from a secure storage (e.g., `localStorage`).

### Minimum changes
- Add a `setAuthToken(token: string)` utility to store the JWT.
- Add a `getAuthToken()` utility to retrieve it on app startup.
- Add a `clearAuthToken()` utility for logout.

## 3) API requests: add Authorization header

### Required change
All requests to protected endpoints must include:

```
Authorization: Bearer <jwt>
```

### Implementation steps
- Add a request interceptor (Axios/fetch wrapper) that injects the JWT.
- Ensure the interceptor is applied to every API call after the token is stored.

## 4) Auth state: bootstrap current user

### Expected backend behavior
- `GET /api/auth/user` returns user details if JWT is valid.

### Frontend changes
- On app load, call `/api/auth/user` if a token is present.
- Use the response to populate the user profile or auth state.
- If the call returns `401`, clear the stored token and redirect to login.

## 5) Logout flow

### Required change
- Clear the stored JWT.
- Redirect user to login page or show unauthenticated UI.

## 6) Bot authentication (if applicable to the frontend)

If the frontend needs to trigger bot token issuance:
- Call `POST /api/auth/bot-token` with header `X-Bot-Key: <configured key>`.
- Store the returned bot JWT separately if it is used in special admin tooling.

> Note: If bot tokens are only used by backend services or the Discord bot itself, the frontend does not need to implement this.

## 7) Error handling and UX

- On any `401 Unauthorized`, clear the JWT and show the login screen.
- On `403 Forbidden`, show a message explaining the user must be in the required Discord server.

## 8) Configuration reminders

- Ensure the frontend is pointed at the correct backend base URL.
- Confirm `app.frontend.url` in backend config matches your deployed frontend origin.

---

## Quick checklist

- [ ] Read `token` from OAuth redirect URL.
- [ ] Store JWT and clear it on logout.
- [ ] Inject `Authorization: Bearer <jwt>` for API calls.
- [ ] Bootstrap user via `GET /api/auth/user`.
- [ ] Handle `401/403` by clearing token and showing the right UX.