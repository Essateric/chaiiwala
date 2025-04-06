// Special Vite config for Netlify builds - CommonJS format (not ESM)
// This file MUST use CommonJS syntax (module.exports, require)
const path = require('path');

// For CommonJS compatibility
try {
  // Check if React plugin exists in the right version
  require.resolve('@vitejs/plugin-react');
} catch (e) {
  console.error('Error resolving @vitejs/plugin-react, installing directly...');
  require('child_process').execSync('npm install @vitejs/plugin-react@4.3.4 --no-save');
}

// Simple React plugin without dynamic imports
const reactPlugin = require('@vitejs/plugin-react');

// Plain object without defineConfig to avoid ESM issues
module.exports = {
  plugins: [reactPlugin.default ? reactPlugin.default() : reactPlugin()],
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
  // Make sure these are excluded from optimization
  optimizeDeps: {
    exclude: ['vite', '@vitejs/plugin-react'],
  },
  // Make sure these are treated as external in SSR mode
  ssr: {
    external: ['vite', '@vitejs/plugin-react', 'react', 'react-dom']
  }
};