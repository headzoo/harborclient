/**
 * Re-exports the host React instance for plugin bundles that externalize `react`.
 *
 * Registered via {@link patchPluginReactImports} so dynamically imported plugin
 * modules can resolve bare `react` specifiers to the same instance as the main app.
 */
import React from 'react';

export default React;

export const {
  Component,
  Fragment,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  version
} = React;
