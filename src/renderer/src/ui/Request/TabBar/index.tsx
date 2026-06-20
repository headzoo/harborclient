import type { Environment } from '#/shared/types';
import type { JSX } from 'react';
import type { RequestTab } from '#/renderer/src/store/drafts';
import { FaIcon } from '#/renderer/src/components/FaIcon';
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
  return (
    <div className="flex shrink-0 items-end gap-0 overflow-x-auto border-b border-separator bg-sidebar px-2 py-1 app-no-drag">
      {tabs.map((tab) => (
        <TabItem
          key={tab.tabId}
          tab={tab}
          active={tab.tabId === activeTabId}
          onSelect={onSelect}
          onClose={onClose}
        />
      ))}
      <div className="flex shrink-0 self-stretch items-stretch rounded-t-md border border-b-0 border-transparent bg-transparent px-1 text-muted hover:bg-selection/60 hover:text-text">
        <button
          className="inline-flex cursor-pointer items-center justify-center self-stretch border-none bg-transparent px-2 py-2 text-inherit app-no-drag"
          title="New tab"
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
