// Special Vite config for Netlify builds - CommonJS format (not ESM)
// This file MUST use CommonJS syntax (module.exports, require)
const path = require('path');

// Plain object instead of using defineConfig which might cause issues
module.exports = {
  // Use an array with a simple React plugin instance to avoid ESM import issues
  plugins: [
    {
      name: 'react-jsx-plugin',
      transform(code, id) {
        if (id.endsWith('.jsx') || id.endsWith('.tsx')) {
          return { code };
        }
      }
    }
  ],
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
    include: [],
  },
  // Make sure 'vite' is treated as external
  ssr: {
    external: ['vite', '@vitejs/plugin-react', 'react', 'react-dom']
  }
};