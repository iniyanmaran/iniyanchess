
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env is available in the browser context
    'process.env': process.env
  },
  server: {
    port: 3000,
  },
});
