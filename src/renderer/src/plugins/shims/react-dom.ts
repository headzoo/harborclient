/**
 * Re-exports the host React DOM instance for plugin bundles that externalize `react-dom`.
 *
 * Registered via {@link patchPluginReactImports} so dynamically imported plugin
 * modules can resolve bare `react-dom` specifiers to the same instance as the main app.
 */
import ReactDOM from 'react-dom';

export default ReactDOM;

export const {
  createPortal,
  flushSync,
  preconnect,
  prefetchDNS,
  preinit,
  preinitModule,
  preload,
  preloadModule,
  unstable_batchedUpdates,
  version
} = ReactDOM;
