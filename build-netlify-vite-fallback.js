// This is a standalone Vite build script that doesn't rely on any imports
// It creates a minimal temporary config and runs Vite directly
// It must be pure CommonJS with no ESM dependencies to work reliably on Netlify
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running standalone Vite build fallback script...');

// Create a minimal Vite config file
const tempConfigPath = path.resolve(__dirname, '_temp_vite_config.cjs');
const configContent = `
// Temporary Vite config for fallback build
const path = require('path');

// Plain object instead of using defineConfig
module.exports = {
  root: './client',
  logLevel: 'info',
  plugins: [require('@vitejs/plugin-react').default()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'client', 'src'),
      '@shared': path.resolve(process.cwd(), 'shared'),
      '@assets': path.resolve(process.cwd(), 'attached_assets')
    }
  },
  build: {
    outDir: path.resolve(process.cwd(), 'dist/public'),
    emptyOutDir: true
  },
  optimizeDeps: {
    exclude: ['vite']
  },
  external: ['vite', '@vitejs/plugin-react']
};
`;

// Write the temporary config file
fs.writeFileSync(tempConfigPath, configContent);
console.log(`✅ Created temporary Vite config at ${tempConfigPath}`);

// Run Vite build with the temporary config
try {
  console.log('⚙️ Running Vite build with temporary config...');
  execSync(`NODE_ENV=production npx vite build --config ${tempConfigPath}`, { stdio: 'inherit' });
  console.log('✅ Vite build completed successfully with fallback script');
} catch (error) {
  console.error('❌ Vite build failed:', error.message);
  process.exit(1);
}