// Special Vite config for Netlify builds - CommonJS format (not ESM)
// This file MUST use CommonJS syntax (module.exports, require)

// Plain object instead of using defineConfig which might cause issues
module.exports = {
  plugins: [require('@vitejs/plugin-react').default()],
  resolve: {
    alias: {
      '@': require('path').resolve(__dirname, 'client', 'src'),
      '@shared': require('path').resolve(__dirname, 'shared'),
      '@assets': require('path').resolve(__dirname, 'attached_assets'),
    },
  },
  root: require('path').resolve(__dirname, 'client'),
  build: {
    outDir: require('path').resolve(__dirname, 'dist/public'),
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