
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.resolve(process.cwd(), 'package.json');

console.log('🔧 Netlify build transformer script');
console.log(`Reading package.json from ${packageJsonPath}`);

// Read the original package.json
const originalPackageJson = fs.readFileSync(packageJsonPath, 'utf-8');
const packageData = JSON.parse(originalPackageJson);

// Create backup
const backupPath = path.resolve(process.cwd(), 'package.json.bak');
fs.writeFileSync(backupPath, originalPackageJson);
console.log(`✅ Created backup at ${backupPath}`);

// Modify package.json for Netlify build
if (packageData.type === 'module') {
  console.log('🔄 Changing package.json "type" from "module" to "commonjs"');
  delete packageData.type; // Default is "commonjs" when not specified

  // Write modified package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
  console.log('✅ Package.json updated for Netlify build compatibility');
} else {
  console.log('ℹ️ Package.json already using commonjs or no type specified');
}

// Run the supplied command
const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('❌ No command provided to run');
  process.exit(1);
}

console.log(`\n🚀 Running command: ${command}`);

try {
  execSync(command, { stdio: 'inherit' });
  console.log('✅ Command completed successfully');
} catch (error) {
  console.error(`❌ Command failed with exit code ${error.status}`);
  process.exitCode = error.status || 1;
} finally {
  // Restore original package.json
  fs.writeFileSync(packageJsonPath, originalPackageJson);
  console.log('✅ Restored original package.json');

  // Remove backup
  fs.unlinkSync(backupPath);
  console.log(`✅ Removed backup at ${backupPath}`);
}
