import { createContext, useContext, type JSX, type ReactNode } from 'react';
import { useAppStore, type AppStore } from '#/renderer/src/store';

const StoreContext = createContext<AppStore | null>(null);

interface ProviderProps {
  children: ReactNode;
}

/**
 * Provides application store state and actions to descendant components.
 */
export function StoreProvider({ children }: ProviderProps): JSX.Element {
  const store = useAppStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/**
 * Returns the application store from context.
 */
export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return store;
}
