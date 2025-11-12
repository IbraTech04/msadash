import { defineConfig } from 'vite';

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
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/oauth2': {
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
    // Minify for production
    minify: 'terser',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          'vendor': ['chart.js'],
        }
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['chart.js']
  },
  
  // Handle legacy scripts
  resolve: {
    alias: {
      '@': '/src',
      '@js': '/js'
    }
  }
});
