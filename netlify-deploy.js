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
const isProduction = process.argv.includes('--prod');

console.log('🔧 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}

console.log(`🚀 Deploying to Netlify (${isProduction ? 'production' : 'draft'} environment)...`);
try {
  const deployCommand = isProduction ? 'netlify deploy --prod' : 'netlify deploy';
  execSync(deployCommand, { stdio: 'inherit' });
  console.log('✅ Deployment completed!');
  
  if (!isProduction) {
    console.log('\n📝 To deploy to production, run: node netlify-deploy.js --prod');
  }
} catch (error) {
  console.error('❌ Deployment failed:', error);
  console.log('\n💡 If you have not authenticated with Netlify yet, run:');
  console.log('   npx netlify login');
  process.exit(1);
}