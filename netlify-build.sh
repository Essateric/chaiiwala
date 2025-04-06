#!/bin/bash

# Fail on first error
set -e

# Verbose output
set -x

# Print node.js version for debugging
echo "Node.js version:"
node --version
echo "NPM version:"
npm --version

# Netlify build script to ensure all dependencies are properly installed
echo "Installing dependencies..."
npm install

# Ensure Vite is available
echo "Checking if vite is available..."
npx vite --version

echo "Building client with Vite..."
# Use --debug flag for more verbose output
NODE_ENV=production npx vite build --debug

echo "Building server with esbuild..."
# Ensure esbuild is available
npx esbuild --version

# Build server
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copy netlify functions directory
echo "Copying netlify functions..."
mkdir -p dist/functions
cp -R netlify/functions/* dist/functions/

echo "Build completed successfully!"