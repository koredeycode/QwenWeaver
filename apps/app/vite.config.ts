import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['insecure-swamp.outray.app'],
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/public/storage': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router'))
            return 'vendor-react';
          if (id.includes('node_modules/@xyflow/react')) return 'vendor-flow';
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/sonner'))
            return 'vendor-ui';
          if (id.includes('node_modules/better-auth')) return 'vendor-auth';
          if (id.includes('node_modules/hono')) return 'vendor-api';
        },
      },
    },
  },
});
