#!/usr/bin/env node

/**
 * Custom build script for Netlify deployment
 * Handles timeouts better than the standard npm run build command
 * Enhanced with better error handling and debugging
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute a command with enhanced error handling
 * @param {string} cmd - Command to execute
 * @param {string} label - Label for the command (for error reporting)
 */
function execCommand(cmd, label) {
  console.log(`\n\n======= EXECUTING: ${label} =======`);
  console.log(`Command: ${cmd}`);
  
  try {
    execSync(cmd, {
      stdio: 'inherit',
      timeout: 300000, // 5 minutes
      env: { ...process.env, FORCE_COLOR: '1' } // Force colored output
    });
    console.log(`✅ ${label} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${label} failed with error:`);
    console.error(error.message);
    
    if (error.stdout) console.log(`STDOUT: ${error.stdout.toString()}`);
    if (error.stderr) console.error(`STDERR: ${error.stderr.toString()}`);
    
    // Depending on the error, we might want to continue or exit
    if (label.includes('Installing')) {
      console.log('Continuing despite installation errors...');
      return true;
    }
    
    process.exit(1);
  }
}

// Print environment info
console.log('=== BUILD ENVIRONMENT INFO ===');
execCommand('node --version', 'Node.js version check');
execCommand('npm --version', 'NPM version check');
console.log(`Node environment: ${process.env.NODE_ENV || 'not set'}`);
console.log(`Running as user: ${execSync('whoami').toString().trim()}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Script directory: ${__dirname}`);

// Ensure the dist directory exists
const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  console.log(`Creating dist directory at ${distDir}`);
  fs.mkdirSync(distDir);
}

// Ensure the dist/public directory exists
const publicDir = path.resolve(distDir, 'public');
if (!fs.existsSync(publicDir)) {
  console.log(`Creating public directory at ${publicDir}`);
  fs.mkdirSync(publicDir);
}

// Ensure netlify functions directory exists
const functionsDir = path.resolve(distDir, 'functions');
if (!fs.existsSync(functionsDir)) {
  console.log(`Creating functions directory at ${functionsDir}`);
  fs.mkdirSync(functionsDir, { recursive: true });
}

// Install key dependencies
execCommand('npm install', 'Installing all dependencies');

// Add extra safety by ensuring critical dependencies are available
console.log('Installing critical build dependencies with specific versions...');
execCommand('npm install vite@5.4.17 @vitejs/plugin-react@4.3.4 esbuild@0.25.2 --no-save', 'Installing Vite and build dependencies');
execCommand('npm list vite', 'Verifying Vite installation');

// Verify vite.config.ts exists with sophisticated fallback
let viteConfigPath = path.resolve(__dirname, 'vite.config.ts');

// Fallback paths to check if the main one doesn't exist
const possibleConfigPaths = [
  path.resolve(__dirname, 'vite.config.ts'),
  path.resolve(__dirname, 'vite.config.js'),
  path.resolve(process.cwd(), 'vite.config.ts'),
  path.resolve(process.cwd(), 'vite.config.js'),
  '/opt/build/repo/vite.config.ts', // Netlify specific path
  path.resolve(__dirname, '..', 'vite.config.ts')
];

// Function to check for valid config path
function findValidConfigPath() {
  for (const configPath of possibleConfigPaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

// First try the default path
if (fs.existsSync(viteConfigPath)) {
  console.log(`✅ Found vite.config.ts at ${viteConfigPath}`);
} else {
  // If not found, search for alternatives
  console.warn(`⚠️ Could not find vite.config.ts at ${viteConfigPath}`);
  console.log('Searching for Vite config in alternative locations...');
  
  // Search the entire project
  console.log('Running global search for vite config files:');
  execCommand('find . -name "vite.config.ts" -o -name "vite.config.js"', 'Looking for Vite config');
  
  // Try known fallback paths
  const foundConfigPath = findValidConfigPath();
  
  if (foundConfigPath) {
    viteConfigPath = foundConfigPath;
    console.log(`✅ Found alternative Vite config at ${viteConfigPath}`);
  } else {
    console.error('❌ Unable to find Vite config file anywhere in the project!');
    console.log('Creating a minimal Vite config as fallback...');
    
    // Create a minimal config as last resort
    const minimalConfig = `
    import { defineConfig } from "vite";
    import react from "@vitejs/plugin-react";
    import path from "path";
    
    export default defineConfig({
      plugins: [react()],
      root: path.resolve(__dirname, "client"),
      build: {
        outDir: path.resolve(__dirname, "dist/public"),
        emptyOutDir: true,
      },
    });
    `;
    
    viteConfigPath = path.resolve(__dirname, '_vite.config.js');
    fs.writeFileSync(viteConfigPath, minimalConfig);
    console.log(`✅ Created fallback Vite config at ${viteConfigPath}`);
  }
}

// Log the config contents for debugging
console.log('Vite config contents:');
console.log(fs.readFileSync(viteConfigPath, 'utf8'));

// Build frontend with explicit config path
console.log('Starting Vite build with detailed debug output...');
try {
  // Check for vite in node_modules
  if (fs.existsSync('./node_modules/.bin/vite')) {
    console.log('✅ Vite executable found in node_modules/.bin');
  } else {
    console.error('⚠️ Vite executable not found in expected location');
    console.log('Will attempt to use npx instead');
  }
  
  // Print Vite version for debugging
  execCommand('npx vite --version', 'Checking Vite version');
  
  // Run the actual build with full debug output
  execCommand(`npx vite build --debug --config ${viteConfigPath}`, 'Building frontend with Vite');
} catch (error) {
  console.error('❌ Vite build failed with an unexpected error:');
  console.error(error);
  
  console.log('\n🔍 Attempting alternative build approach...');
  // Try with direct node_modules path as fallback
  execCommand('NODE_ENV=production ./node_modules/.bin/vite build --config vite.config.ts', 'Alternative Vite build');
}

// Check that build produced files
const distFiles = fs.readdirSync(publicDir);
console.log('Files in public directory after Vite build:');
console.log(distFiles);

if (distFiles.length === 0) {
  console.error('❌ Vite build did not produce any files!');
  process.exit(1);
}

// Build server
execCommand('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 'Building server with esbuild');

// Copy Netlify function files with enhanced error handling
console.log('Copying Netlify functions...');
try {
  if (fs.existsSync('netlify/functions')) {
    const functionFiles = fs.readdirSync('netlify/functions');
    
    if (functionFiles.length === 0) {
      console.warn('⚠️ Warning: netlify/functions directory exists but is empty!');
    }
    
    console.log(`Found ${functionFiles.length} function files: ${functionFiles.join(', ')}`);
    
    functionFiles.forEach(file => {
      const sourcePath = path.join('netlify/functions', file);
      const destPath = path.join(functionsDir, file);
      
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${sourcePath} to ${destPath}`);
        
        // Verify file was copied successfully
        if (fs.existsSync(destPath)) {
          const sourceSize = fs.statSync(sourcePath).size;
          const destSize = fs.statSync(destPath).size;
          console.log(`   Source size: ${sourceSize} bytes, Destination size: ${destSize} bytes`);
          
          if (sourceSize !== destSize) {
            console.warn(`⚠️ Warning: File sizes don't match for ${file}`);
          }
        } else {
          console.error(`❌ Error: Failed to copy ${file} - destination file doesn't exist`);
        }
      } catch (err) {
        console.error(`❌ Error copying ${sourcePath}: ${err.message}`);
      }
    });
  } else {
    console.error('❌ Error: netlify/functions directory not found!');
    console.log('Creating the directory structure and copying essential files...');
    
    // Create the functions directory
    fs.mkdirSync('netlify/functions', { recursive: true });
    
    // Copy api.js file from netlify directory if it exists
    if (fs.existsSync('netlify/api.js')) {
      fs.copyFileSync('netlify/api.js', 'netlify/functions/api.js');
      console.log('✅ Created api.js in netlify/functions from netlify/api.js');
    }
  }
} catch (error) {
  console.error('❌ Error during Netlify functions copy:', error);
}

console.log('\n✅ BUILD COMPLETED SUCCESSFULLY!');
console.log('Final file structure:');
execCommand('find dist -type f | sort', 'Listing build artifacts');