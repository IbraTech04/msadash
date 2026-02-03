import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  // Base public path when served in production
  base: './',
  
  // Server configuration for development
  server: {
    port: 3000,
    open: true,
    cors: true,
    // Proxy API requests to backend during development
    proxy: {
      '/api/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/oauth2/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Minify for production (esbuild is faster and built-in)
    minify: 'esbuild',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  
  // Handle legacy scripts
  resolve: {
    alias: {
      '@': '/src',
      '@js': '/js'
    }
  },
  
  // Custom plugin to copy non-module scripts
  plugins: [
    {
      name: 'copy-scripts',
      closeBundle() {
        const files = [
          'env.js',
          'config.js', 
          'api-service.js',
          'script.js',
          'js/msa-namespace.js',
          'js/date-utils.js',
          'js/stats.js',
          'js/events-board.js',
          'js/main-calendar.js',
          'js/utils-modal.js',
          'js/auth.js',
          'js/cycle-view.js',
          'js/spreadsheet.js',
          'js/recent-activity.js',
          'js/mini-calendar.js',
          'js/analytics.js',
          'js/kanban.js',
          'js/audit-log.js',
          'js/namespace-adapter.js',
          'msa_logo.png',
          'msa_logo_white.png'
        ];
        
        // Create js directory in dist if it doesn't exist
        const jsDir = join('dist', 'js');
        if (!existsSync(jsDir)) {
          mkdirSync(jsDir, { recursive: true });
        }
        
        files.forEach(file => {
          const src = file;
          const dest = join('dist', file);
          try {
            copyFileSync(src, dest);
            console.log(`✓ Copied ${file}`);
          } catch (err) {
            console.error(`✗ Failed to copy ${file}:`, err.message);
          }
        });
      }
    }
  ]
});
