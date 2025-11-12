# Marketing Command Center Dashboard

A modern, interactive dashboard for the UTMMSA Marketing Command Center that integrates with the Discord bot's REST API.

## 🌟 Features

- **Real-time API Integration**: Connects to your Marketing Command Center Discord Bot API
- **Interactive Calendar**: Visual deadline tracking with color-coded statuses
- **Event Management**: View and manage marketing requests with status tracking
- **Responsive Design**: Works on desktop and mobile devices
- **Night Mode**: Toggle between light and dark themes
- **Fallback System**: Automatic fallback to CSV data if API is unavailable
- **Auto-refresh**: Automatically updates data every 5 minutes

## 🚀 Getting Started

### 1. Configure the API

Edit `config.js` and update the API settings:

```javascript
api: {
  baseUrl: 'http://localhost:5000', // Your API server URL
  apiKey: 'your-actual-api-key',    // Your API key
}
```

### 2. Set Up Your API Server

Make sure your Marketing Command Center API is running with the following endpoints:

- `GET /api/health` - Health check
- `GET /api/events` - Get all marketing events

### 3. Open the Dashboard

Simply open `index.html` in your web browser. The dashboard will:

- Automatically connect to your API
- Show connection status in the header
- Load events and display them in an organized view
- Provide an interactive calendar with deadline tracking

## 📊 Features Overview

### Event Tracking

- **Status-based organization**: Events grouped by 📥 In Queue, 🔄 In Progress, ⏳ Awaiting Approval, ✅ Done
- **Priority indicators**: Visual highlighting for urgent and overdue items
- **Detailed information**: Full event details including assignee, requester, notes, and deadlines

### Interactive Calendar

- **Visual timeline**: See all deadlines at a glance
- **Color-coded events**: Different colors for different statuses
- **Click for details**: Click any event to see full information
- **Multiple views**: Month, week, and list views available

### Smart Fallbacks

- **CSV integration**: Automatic fallback to Google Sheets if API is unavailable
- **Graceful degradation**: Dashboard continues to work even with limited connectivity
- **Status indicators**: Clear indication of data source and connection status

## 🎨 Customization

### Themes

- Toggle between light and dark modes using the header button
- Islamic design elements with beautiful Arabic typography
- Responsive layout that adapts to different screen sizes

### Configuration Options

Edit `config.js` to customize:

- API endpoints and authentication
- Feature flags (enable/disable specific features)
- UI preferences (themes, refresh intervals)
- Calendar settings (views, time formats)

## 🔧 Technical Details

### Browser Support

- Modern browsers with ES6+ support
- JavaScript fetch API required
- CSS Grid and Flexbox support recommended

### Dependencies

- **FullCalendar** (CDN) – Interactive calendar component  
- **Chart.js** (CDN) – Analytics charts  
- **Google Fonts** – Typography (Montserrat, Amiri, Cinzel)  
- **Vite** (dev only) – Modern dev server & bundler (optional; supports ES modules migration)  
- **Native JavaScript** – No heavy framework dependencies

### Modern Project Structure (Migration In Progress)

We are migrating from ad‑hoc global scripts to an ES Module structure plus a simple build step. Target layout:

```text
msadash/
  public/                # Static assets – index.html, logos, style.css
  src/
    modules/             # ES modules (stats.js, later events-board.js, etc.)
    legacy/              # (optional) original global scripts during transition
  js/                    # Existing IIFE globals (to be phased out)
  package.json           # Vite scripts (dev/build/preview)
```

### Run Dev Server (Optional Modern Workflow)

Install dependencies and start Vite for module development:

```powershell
npm install
npm run dev
```

Open the printed localhost URL; during migration both CDN scripts and module imports can coexist.

### ES Module Migration Strategy

1. Introduce pure modules in `src/modules` (pilot: `stats.js`).  
2. Gradually convert each `js/*.js` file from IIFE (globals) to named exports.  
3. Replace multiple `<script src="...">` tags with one `<script type="module" src="/src/main.js"></script>`.  
4. Maintain backward compatibility via namespace adapter during transition.  
5. Remove legacy globals once all consumers use imports.

### Backward Compatibility

Pilot modules attach themselves to `window.MSA` & legacy globals to avoid breaking existing code until full conversion.

### API Requirements

Your API should return events in this format:
 
```json
{
  "success": true,
  "count": 5,
  "timestamp": "2025-08-25T10:30:00.000Z",
  "events": [
    {
      "title": "Event Title",
      "description": "Event description",
      "status": "📥 In Queue",
      "posting_date": "2025-08-30T00:00:00.000Z",
      "assigned_to_name": "Team Member",
      "requester_name": "Requester Name",
      "department": "Events",
      "request_type": "post",
      "visibility": "Everyone",
      "notes": "Additional notes",
      "created_at": "2025-08-25T09:15:00.000Z"
    }
  ]
}
```

## 🤲 Islamic Elements

The dashboard includes beautiful Islamic elements:
 
- **Bismillah** at the top of the page
- **Quranic verse** from Surah At-Tawbah (9:105) about work and effort
- **"JazakumAllahu khairan"** in the footer
- **Arabic typography** with the Amiri font

## 🔄 Auto-refresh

The dashboard automatically refreshes data every 5 minutes to keep information current. You can adjust this interval in `config.js`.

## 🐛 Troubleshooting

### API Connection Issues

1. Check that your API server is running on the correct port
2. Verify the API key in `config.js` matches your server configuration
3. Ensure CORS is properly configured on your API server
4. Check browser console for detailed error messages

### Fallback Mode

If the API is unavailable, the dashboard will automatically switch to CSV fallback mode using your Google Sheets data.

### Dev Server Issues

If Vite fails to start:
 
1. Ensure Node.js 18+ is installed (`node -v`).
2. Delete any lockfile remnants and reinstall (`npm install`).
3. Clear browser cache; stale CDN scripts sometimes conflict.

---

Built with ❤️ for the UTMMSA Marketing Team

*May Allah bless our efforts and make them beneficial for the ummah.*
