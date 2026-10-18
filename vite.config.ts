import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-is': path.resolve(__dirname, './node_modules/react-is'),
    },
    dedupe: ['react', 'react-dom', 'react-is', 'react-router', 'react-router-dom', 'motion', 'framer-motion', 'recharts'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-is', 'recharts', 'motion/react'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
