/**
 * Electron-vite configuration for main, preload, and renderer processes.
 * Main externalizes native deps (better-sqlite3); renderer uses React.
 */
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['ses'] })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          scriptRunner: resolve(__dirname, 'src/main/scripting/scriptRunner.ts'),
          pluginRunner: resolve(__dirname, 'src/main/plugins/pluginRunner.ts')
        },
        external: ['better-sqlite3'],
        output: {
          entryFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@images': resolve(__dirname, 'images'),
        '@harborclient/sdk/react': resolve(__dirname, 'node_modules/react'),
        '@harborclient/sdk/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          splash: resolve(__dirname, 'src/renderer/splash.html')
        }
      }
    }
  }
});
