import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'spa-fallback',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && req.url.startsWith('/mobile') && !req.url.includes('.')) {
              req.url = '/mobile/index.html';
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@bklitui/ui/charts': path.resolve(__dirname, 'src/components/charts/index.ts'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-is': path.resolve(__dirname, 'node_modules/react-is'),
      },
      dedupe: [
        'react',
        'react-dom',
        'react-is',
        'react-router',
        'react-router-dom',
        'motion',
        'framer-motion'
      ],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-is', 'recharts', 'motion/react'],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          mobile: path.resolve(__dirname, 'mobile/index.html'),
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
