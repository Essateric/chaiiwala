// Script to ensure all necessary files are copied to the netlify/functions directory
const fs = require('fs');

// Create the functions directory if it doesn't exist
if (!fs.existsSync('netlify/functions')) {
  fs.mkdirSync('netlify/functions', { recursive: true });
  console.log('✅ Created netlify/functions directory');
}

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

console.log('✅ All files copied successfully');