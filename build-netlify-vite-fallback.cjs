// This is a standalone Vite build script that doesn't rely on any imports
// It creates a minimal temporary config and runs Vite directly
// It must be pure CommonJS with no ESM dependencies to work reliably on Netlify
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running standalone Vite build fallback script...');

// First, make sure we have the right Vite version
try {
  console.log('🔍 Checking for Vite 5.4.17...');
  execSync('npm list vite', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️ Vite not found at expected version, installing...');
  execSync('npm install vite@5.4.17 @vitejs/plugin-react@4.3.4 --no-save', { stdio: 'inherit' });
}

// Check for the package.json type
const packageJsonPath = path.resolve(__dirname, 'package.json');
let isEsmPackage = false;

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  isEsmPackage = packageJson.type === 'module';
  console.log(`📦 Package type is: ${isEsmPackage ? 'ESM (module)' : 'CommonJS'}`);
} catch (error) {
  console.error('⚠️ Could not read package.json:', error.message);
}

// Create a minimal Vite config file that works in both ESM and CommonJS environments
const tempConfigPath = path.resolve(__dirname, '_temp_vite_config.cjs');
const configContent = `
// Temporary Vite config for fallback build - using CommonJS syntax for maximum compatibility
const path = require('path');

// Try to load React plugin safely
let reactPlugin;
try {
  reactPlugin = require('@vitejs/plugin-react');
  if (typeof reactPlugin === 'object' && reactPlugin.default) {
    reactPlugin = reactPlugin.default;
  }
} catch (e) {
  console.error('Failed to load @vitejs/plugin-react, using minimal fallback');
  reactPlugin = () => ({
    name: 'minimal-react-plugin',
    transform(code, id) {
      if (id.endsWith('.jsx') || id.endsWith('.tsx')) {
        return { code };
      }
    }
  });
}

// Use a plain object instead of defineConfig to avoid ESM/CJS confusion
module.exports = {
  root: './client',
  logLevel: 'info',
  plugins: [reactPlugin()],
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
  }
};
`;

// Write the temporary config file
fs.writeFileSync(tempConfigPath, configContent);
console.log(`✅ Created temporary Vite config at ${tempConfigPath}`);

// If this is an ESM package, temporarily modify package.json
let originalPackageJson;
if (isEsmPackage) {
  console.log('🔄 Temporarily changing package.json type for build compatibility...');
  originalPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
  const packageData = JSON.parse(originalPackageJson);
  delete packageData.type; // This will default to CommonJS
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
  console.log('✅ Package.json temporarily updated for build');
}

// Run Vite build with the temporary config
try {
  console.log('⚙️ Running Vite build with temporary config...');
  execSync(`NODE_ENV=production npx vite@5.4.17 build --config ${tempConfigPath}`, { stdio: 'inherit' });
  console.log('✅ Vite build completed successfully with fallback script');
} catch (error) {
  console.error('❌ Vite build failed:', error.message);
  process.exit(1);
} finally {
  // Restore original package.json if modified
  if (isEsmPackage && originalPackageJson) {
    console.log('🔄 Restoring original package.json...');
    fs.writeFileSync(packageJsonPath, originalPackageJson);
    console.log('✅ Original package.json restored');
  }
}