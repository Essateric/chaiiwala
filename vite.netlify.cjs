// Special Vite config for Netlify builds
// Uses CommonJS format to avoid ESM import issues
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

// Simple version of config for Netlify
module.exports = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  root: path.resolve(__dirname, 'client'),
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
  // Avoid issues with Vite module resolution
  optimizeDeps: {
    exclude: ['vite'],
  },
  // Make sure 'vite' is treated as external
  ssr: {
    external: ['vite', '@vitejs/plugin-react']
  }
});