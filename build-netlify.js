#!/usr/bin/env node

/**
 * Custom build script for Netlify deployment
 * Handles timeouts better than the standard npm run build command
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the dist directory exists
const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Ensure the dist/public directory exists
const publicDir = path.resolve(distDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

console.log('Building frontend...');
execSync('npx vite build', { 
  stdio: 'inherit',
  timeout: 300000 // 5 minutes
});

console.log('Building server...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
  stdio: 'inherit',
  timeout: 300000 // 5 minutes
});

console.log('Build completed successfully!');