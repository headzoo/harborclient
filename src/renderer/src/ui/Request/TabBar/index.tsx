import { FaIcon, resolveTabListKeyAction } from '@harborclient/sdk/components';
import type { Environment } from '#/shared/types';
import type { JSX, KeyboardEvent } from 'react';
import type { RequestTab } from '#/renderer/src/store/drafts';

import { faPlus } from '#/renderer/src/fontawesome';
import { EnvironmentSelect } from './EnvironmentSelect';
import { TabItem } from './TabItem';

interface Props {
  /**
   * All open request tabs.
   */
  tabs: RequestTab[];

  /**
   * ID of the currently active tab.
   */
  activeTabId: string;

  /**
   * All saved environments.
   */
  environments: Environment[];

  /**
   * ID of the active environment, or null when none is selected.
   */
  activeEnvironmentId: number | null;

  /**
   * Called when the user selects a tab.
   *
   * @param tabId - Tab to activate.
   */
  onSelect: (tabId: string) => void;

  /**
   * Called when the user closes a tab.
   *
   * @param tabId - Tab to close.
   */
  onClose: (tabId: string) => void;

  /**
   * Opens a new blank request tab.
   */
  onNew: () => void;

  /**
   * Called when the user selects an environment.
   *
   * @param id - Environment ID, or null for no environment.
   */
  onEnvironmentChange: (id: number | null) => void;
}

/**
 * Horizontal tab bar for switching between open request editors.
 */
export function TabBar({
  tabs,
  activeTabId,
  environments,
  activeEnvironmentId,
  onSelect,
  onClose,
  onNew,
  onEnvironmentChange
}: Props): JSX.Element {
  /**
   * Moves focus and selection across open request tabs with arrow, Home, and End
   * keys following the WAI-ARIA tabs pattern.
   *
   * @param event - Keyboard event from the tab list container.
   */
  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const currentIndex = tabs.findIndex((tab) => tab.tabId === activeTabId);
    const nextIndex = resolveTabListKeyAction(event.key, currentIndex, tabs.length);
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onSelect(nextTab.tabId);

    requestAnimationFrame(() => {
      document.getElementById(`request-tab-${nextTab.tabId}`)?.focus();
    });
  };

  return (
    <div className="flex shrink-0 items-end gap-0 overflow-x-auto border-b border-separator bg-sidebar px-2 py-1 app-no-drag">
      <div
        role="tablist"
        aria-label="Open requests"
        className="flex items-end"
        onKeyDown={handleTabListKeyDown}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.tabId}
            tab={tab}
            active={tab.tabId === activeTabId}
            tabIndex={tab.tabId === activeTabId ? 0 : -1}
            onSelect={onSelect}
            onClose={onClose}
          />
        ))}
      </div>
      <div className="flex shrink-0 self-stretch items-stretch rounded-t-md border border-b-0 border-transparent bg-transparent px-1 text-muted hover:bg-selection/60 hover:text-text">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center self-stretch border-none bg-transparent px-2 py-2 text-inherit app-no-drag"
          title="New tab"
          aria-label="New tab"
          onClick={onNew}
        >
          <FaIcon icon={faPlus} className="h-3.5 w-3.5" />
        </button>
      </div>
      <EnvironmentSelect
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        onEnvironmentChange={onEnvironmentChange}
      />
    </div>
  );
}
