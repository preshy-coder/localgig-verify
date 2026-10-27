import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `host: true` lets you open the dev server on your phone using your computer's
// Wi-Fi address (shown in the terminal as "Network"). Handy for testing on a real phone.
export default defineConfig({
  plugins: [react()],
  // In development the browser talks to this server, which passes /api calls on to the back end.
  // That keeps everything on one address, so the login cookie works with no extra setup.
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  preview: { host: true, port: 4173 },
});
