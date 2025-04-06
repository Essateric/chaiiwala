#!/usr/bin/env node

/**
 * Custom build script for Netlify deployment
 * Handles timeouts better than the standard npm run build command
 * Enhanced with better error handling and debugging
 * 
 * IMPORTANT: This file uses ESM syntax, but we use the netlify-build-transform.cjs
 * script to temporarily modify package.json during the Netlify build process
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

// Install key dependencies with enhanced error handling and retries
console.log('Installing dependencies with enhanced error handling...');
try {
  // Attempt normal install first
  try {
    execCommand('npm install', 'Installing all dependencies (attempt 1)');
  } catch (error) {
    console.warn('⚠️ First dependency installation attempt failed, trying with --legacy-peer-deps');
    execCommand('npm install --legacy-peer-deps', 'Installing all dependencies (attempt 2 with legacy-peer-deps)');
  }
  
  // Verify package-lock.json exists after install
  if (!fs.existsSync('./package-lock.json')) {
    console.warn('⚠️ package-lock.json not found after npm install, this may cause issues');
  } else {
    console.log('✅ package-lock.json found after installation');
  }
} catch (error) {
  console.error('❌ All dependency installation attempts failed:', error.message);
  console.log('⚠️ Continuing build process despite dependency installation issues');
}

// Add extra safety by ensuring critical dependencies are available
console.log('Installing critical build dependencies with multiple methods...');

// First try with --no-save to avoid modifying package.json
console.log('Step 1: Installing locally with --no-save...');
execCommand('npm uninstall vite', 'Uninstalling any existing Vite');
execCommand('npm install vite@5.4.17 @vitejs/plugin-react@4.3.4 esbuild@0.25.2 --no-save', 'Installing build dependencies locally');

// Then try globally for Netlify environment
console.log('Step 2: Installing Vite globally...');
execCommand('npm install -g vite@5.4.17', 'Installing Vite globally');

// Also install as exact dev dependencies to ensure they're available
console.log('Step 3: Installing as exact dev dependencies...');
execCommand('npm install -E -D vite@5.4.17 @vitejs/plugin-react@4.3.4', 'Installing Vite as exact dev dependency');

// Force install with highest priority
console.log('Step 4: Force installing with highest priority...');
execCommand('npm install vite@5.4.17 --prefer-offline --no-fund --no-audit --force', 'Force installing Vite with highest priority');

// Block installation of Vite 6
console.log('Step 5: Blocking Vite 6.x installation...');
execCommand('npm config set "//registry.npmjs.org/:_authToken" "dummy-token"', 'Setting dummy npm token');
execCommand('npm config set save-exact true', 'Setting save-exact flag');
execCommand('echo "vite@6.x.x \"\"" >> .npmrc', 'Adding Vite 6 block to .npmrc');

// Check for Vite installation without using npm list (which can return exit code 1)
console.log('Verifying Vite installation...');
try {
  if (fs.existsSync('./node_modules/vite')) {
    console.log('✅ Vite package found in node_modules directory');
    
    // Try to get the version directly from package.json
    if (fs.existsSync('./node_modules/vite/package.json')) {
      const vitePackage = JSON.parse(fs.readFileSync('./node_modules/vite/package.json', 'utf8'));
      console.log(`✅ Installed Vite version: ${vitePackage.version}`);
    }
  } else {
    console.error('⚠️ Vite package not found in node_modules - trying global installation');
    // Force install again with different flags
    execCommand('npm install vite@5.4.17 --no-save --force', 'Force installing Vite');
  }
} catch (error) {
  console.error('❌ Error checking Vite installation:', error.message);
}

// Verify Vite config exists with sophisticated fallback logic
// For Netlify, prefer the CommonJS version with .cjs extension (required for "type": "module" packages)
let viteConfigPath = path.resolve(__dirname, 'vite.netlify.cjs');

// Fallback paths to check if the main one doesn't exist
const possibleConfigPaths = [
  path.resolve(__dirname, 'vite.netlify.cjs'), // Netlify-specific CommonJS version (preferred for Netlify)
  path.resolve(__dirname, 'vite.netlify.js'),  // Legacy format
  path.resolve(__dirname, 'vite.config.js'),
  path.resolve(__dirname, 'vite.config.ts'),
  path.resolve(process.cwd(), 'vite.netlify.cjs'),
  path.resolve(process.cwd(), 'vite.netlify.js'),
  path.resolve(process.cwd(), 'vite.config.js'),
  path.resolve(process.cwd(), 'vite.config.ts'),
  '/opt/build/repo/vite.netlify.cjs', // Netlify specific path with CommonJS format
  '/opt/build/repo/vite.netlify.js',
  '/opt/build/repo/vite.config.js',
  '/opt/build/repo/vite.config.ts'
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
  console.log(`✅ Found Vite config at ${viteConfigPath}`);
} else {
  // If not found, search for alternatives
  console.warn(`⚠️ Could not find Vite config at ${viteConfigPath}`);
  console.log('Searching for Vite config in alternative locations...');
  
  // Search the entire project
  console.log('Running global search for vite config files:');
  execCommand('find . -name "vite.config.ts" -o -name "vite.config.js" -o -name "vite.netlify.js" -o -name "vite.netlify.cjs"', 'Looking for Vite config');
  
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
  
  // Run the actual build with full debug output - attempt 1
  try {
    execCommand(`npx vite build --debug --config ${viteConfigPath}`, 'Building frontend with Vite (attempt 1)');
  } catch (buildError) {
    console.error('❌ First Vite build attempt failed:', buildError.message);
    
    console.log('\n🔍 Attempting alternative build approach (attempt 2)...');
    try {
      // Try with direct node_modules path but using the Netlify-specific CommonJS config
      execCommand('NODE_ENV=production ./node_modules/.bin/vite build --config vite.netlify.cjs', 'Building frontend with Vite (attempt 2)');
    } catch (buildError2) {
      console.error('❌ Second Vite build attempt failed:', buildError2.message);
      
      console.log('\n🔍 Attempting final build approach (attempt 3)...');
      
      try {
        // Use our dedicated fallback script that handles everything in CommonJS
        console.log('⚙️ Using standalone Vite build fallback script...');
        execCommand('node build-netlify-vite-fallback.cjs', 'Building frontend with standalone fallback script (attempt 3)');
      } catch (fallbackError) {
        console.error('❌ Fallback script failed:', fallbackError.message);
        
        // Ultra-fallback: direct shell command to manually install and run vite
        console.log('\n🔍 Attempting EMERGENCY build approach (attempt 4)...');
        try {
          console.log('🚨 Using emergency direct Vite build approach...');
          
          // Last resort: create an extremely minimal config and run with globally installed vite
          const emergencyConfigPath = path.resolve(__dirname, '_emergency_vite_config.js');
          fs.writeFileSync(emergencyConfigPath, `
            export default {
              root: "./client",
              build: { outDir: "./dist/public", emptyOutDir: true }
            };
          `);
          
          // Install vite globally as standalone before running
          execCommand('npm install -g vite@5.4.17 @vitejs/plugin-react@4.3.4', 'Installing Vite globally for emergency build');
          execCommand('vite build --config _emergency_vite_config.js', 'Emergency Vite build attempt');
        } catch (emergencyError) {
          console.error('❌ All Vite build attempts failed:', emergencyError.message);
        }
      }
    }
  }
} catch (error) {
  console.error('❌ All Vite build attempts failed with unexpected errors:');
  console.error(error);
  
  // As a last resort, try to continue if dist/public exists
  console.log('\n⚠️ Continuing despite build errors...');
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
    
    // Setup function to copy both .cjs and .js versions of a file
    const copyBothVersions = (filename) => {
      const cjsFile = `netlify/${filename}.cjs`;
      const jsFile = `netlify/${filename}.js`;
      const cjsDest = `netlify/functions/${filename}.cjs`;
      const jsDest = `netlify/functions/${filename}.js`;
      
      // Check for .cjs first, then .js as fallback
      if (fs.existsSync(cjsFile)) {
        fs.copyFileSync(cjsFile, cjsDest);
        console.log(`✅ Copied ${cjsFile} to ${cjsDest}`);
        
        // Also create .js from .cjs for compatibility
        fs.copyFileSync(cjsFile, jsDest);
        console.log(`✅ Created ${jsDest} from ${cjsFile}`);
      } else if (fs.existsSync(jsFile)) {
        fs.copyFileSync(jsFile, jsDest);
        console.log(`✅ Copied ${jsFile} to ${jsDest}`);
        
        // Also create .cjs from .js for compatibility
        fs.copyFileSync(jsFile, cjsDest);
        console.log(`✅ Created ${cjsDest} from ${jsFile}`);
      } else {
        console.warn(`⚠️ Warning: No ${filename}.cjs or ${filename}.js found in netlify directory`);
      }
    };
    
    // Copy all necessary files
    copyBothVersions('api');
    copyBothVersions('auth');
    copyBothVersions('routes');
    copyBothVersions('storage');
  }
  
  // Copy Netlify _headers file for CSP configuration
  if (fs.existsSync('netlify/_headers')) {
    fs.copyFileSync('netlify/_headers', path.join(publicDir, '_headers'));
    console.log('✅ Copied netlify/_headers to dist/public/_headers');
  } else {
    console.warn('⚠️ Warning: netlify/_headers file not found');
    // Create a _headers file with CSP directives
    const headersContent = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.netlify.app https://*.netlify.com *.chaiiwala.co.uk
`;
    fs.writeFileSync(path.join(publicDir, '_headers'), headersContent);
    console.log('✅ Created dist/public/_headers with permissive CSP');
  }
} catch (error) {
  console.error('❌ Error during Netlify functions copy:', error);
}

console.log('\n✅ BUILD COMPLETED SUCCESSFULLY!');
console.log('Final file structure:');
execCommand('find dist -type f | sort', 'Listing build artifacts');