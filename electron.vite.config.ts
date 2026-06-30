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
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          plugin: resolve(__dirname, 'src/preload/plugin.ts')
        }
      }
    }
  },
  renderer: {
    // Pin the dev server to a fixed port so the renderer origin
    // (http://localhost:5173) stays stable across restarts. Chromium scopes
    // localStorage by origin, so a drifting port would orphan persisted state
    // such as open request tabs (harborclient.openTabs). strictPort fails loudly
    // on a conflict instead of silently switching ports and losing that state.
    server: {
      port: 5173,
      strictPort: true
    },
    plugins: [react(), tailwindcss()],
    // Force dependency pre-bundling on every dev start. Vite caches optimized
    // deps in node_modules/.vite/deps keyed on a hash of the lockfile and config,
    // not on `file:`-linked package contents. Without forcing, a local
    // `@harborclient/sdk` rebuild is never picked up: Vite keeps serving the
    // stale pre-bundled copy even after `pnpm install` and a dev-server restart.
    // Re-optimizing each start keeps the linked SDK fresh without changing module
    // resolution (excluding it from bundling breaks its transitive deps).
    optimizeDeps: {
      force: true
    },
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
