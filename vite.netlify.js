// ESM version that just imports the CJS version
// This handles the case where Vite looks for a .js file when "type":"module" is set
import viteConfig from './vite.netlify.cjs';
export default viteConfig;