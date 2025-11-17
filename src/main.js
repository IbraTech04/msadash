// Entry for Vite dev server (optional during migration)
// Demonstrates ES module import and exposes minimal globals if needed.
import { computeEventStats } from './modules/stats.js';

// Attach to window for easy console access during dev
if (typeof window !== 'undefined') {
  window.__esm = { computeEventStats };
  console.log('Vite dev: ESM loaded');
}
