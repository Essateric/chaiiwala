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
execCommand('npm install vite@latest @vitejs/plugin-react esbuild --no-save', 'Installing build dependencies');

// Build frontend
execCommand('npx vite build --debug', 'Building frontend with Vite');

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

// Copy Netlify function files
console.log('Copying Netlify functions...');
if (fs.existsSync('netlify/functions')) {
  const functionFiles = fs.readdirSync('netlify/functions');
  functionFiles.forEach(file => {
    const sourcePath = path.join('netlify/functions', file);
    const destPath = path.join(functionsDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${sourcePath} to ${destPath}`);
  });
}

console.log('\n✅ BUILD COMPLETED SUCCESSFULLY!');
console.log('Final file structure:');
execCommand('find dist -type f | sort', 'Listing build artifacts');