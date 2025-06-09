
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url'; // Added for import.meta.url

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url); // Added
const __dirname = path.dirname(__filename); // Added

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'), // Now works
        }
      }
    };
});
