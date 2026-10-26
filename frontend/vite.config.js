import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `host: true` lets you open the dev server on your phone using your computer's
// Wi-Fi address (shown in the terminal as "Network"). Handy for testing on a real phone.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
