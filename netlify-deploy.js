#!/usr/bin/env node

/**
 * Netlify Deployment Script
 * 
 * This script helps deploy your Chaiiwala Dashboard to Netlify
 * 
 * Usage: 
 * - To deploy to draft environment: node netlify-deploy.js
 * - To deploy to production: node netlify-deploy.js --prod
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const args = process.argv.slice(2);
const isProd = args.includes('--prod');

// Log with colors
const log = {
  info: (msg) => console.log(chalk.blue('INFO: ') + msg),
  success: (msg) => console.log(chalk.green('SUCCESS: ') + msg),
  error: (msg) => console.log(chalk.red('ERROR: ') + msg),
  warning: (msg) => console.log(chalk.yellow('WARNING: ') + msg)
};

// Execute a command and handle errors
function execute(command) {
  try {
    log.info(`Executing: ${command}`);
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

// Main deployment function
async function deploy() {
  try {
    // 1. Build the application
    log.info('Building frontend...');
    execute('npx vite build');
    
    log.info('Building server...');
    execute('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist');
    
    // 2. Deploy to Netlify
    log.info(`Deploying to Netlify ${isProd ? 'production' : 'draft'} environment...`);
    const deployCommand = isProd
      ? 'netlify deploy --dir=dist/public --prod --message "Production deploy from script"'
      : 'netlify deploy --dir=dist/public --message "Draft deploy from script"';
    
    execute(deployCommand);
    
    // 3. Success message
    if (isProd) {
      log.success('Successfully deployed to Netlify production environment!');
    } else {
      log.success('Successfully deployed to Netlify draft environment!');
      log.info('To deploy to production, run: node netlify-deploy.js --prod');
    }
  } catch (error) {
    log.error('Deployment failed');
    log.error(error.message);
    process.exit(1);
  }
}

// Execute the deployment
deploy();