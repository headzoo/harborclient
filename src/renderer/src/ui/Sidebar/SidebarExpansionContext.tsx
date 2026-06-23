import { type JSX, type ReactNode } from 'react';
import { SidebarExpansionContext } from '#/renderer/src/ui/Sidebar/sidebarExpansionContext';
import { usePersistedSidebarExpansion } from '#/renderer/src/ui/Sidebar/usePersistedSidebarExpansion';

interface ProviderProps {
  /**
   * Loads requests and folders when a collection is expanded.
   */
  onExpandCollection: (id: number) => void;

  /**
   * Application subtree that reads or updates sidebar expansion state.
   */
  children: ReactNode;
}

/**
 * Keeps sidebar expansion state alive across sidebar mount/unmount cycles.
 */
export function SidebarExpansionProvider({
  onExpandCollection,
  children
}: ProviderProps): JSX.Element {
  const value = usePersistedSidebarExpansion({ onExpandCollection });

  return (
    <SidebarExpansionContext.Provider value={value}>{children}</SidebarExpansionContext.Provider>
  );
}
