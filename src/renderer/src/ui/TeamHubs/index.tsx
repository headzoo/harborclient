import { useState, type JSX } from 'react';
import type { TeamHub } from '#/shared/types';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faXmark } from '#/renderer/src/fontawesome';
import { useTeamHubServiceScan } from '#/renderer/src/hooks/useTeamHubServiceScan';
import { useTeamHubs } from '#/renderer/src/hooks/useTeamHubs';
import { TeamHubList } from './TeamHubList';
import { TeamManageView } from './TeamManageView';
import { TeamTokensView } from './TeamTokensView';

type TeamHubsView = 'list' | 'manageUsers' | 'manageTokens';

interface Props {
  /**
   * Closes the team hubs view.
   */
  onClose: () => void;
}

/**
 * Returns the page title for the active Team Hub view.
 *
 * @param view - Active sub-view within Team Hub management.
 * @param hub - Admin hub connection when managing users or tokens.
 */
function getPageTitle(view: TeamHubsView, hub: TeamHub | null): string {
  if (view === 'manageUsers' && hub) {
    return `Manage users — ${hub.name || hub.baseUrl}`;
  }

  if (view === 'manageTokens' && hub) {
    return `Manage tokens — ${hub.name || hub.baseUrl}`;
  }

  return 'Team Hub';
}

/**
 * Full-area team hub management with list, add, edit, delete, and team admin flows.
 */
export function TeamHubs({ onClose }: Props): JSX.Element {
  const [view, setView] = useState<TeamHubsView>('list');
  const [activeAdminHub, setActiveAdminHub] = useState<TeamHub | null>(null);
  const { teamHubs, loading, error: bootstrapError, reload, reloadToken } = useTeamHubs();
  const { serviceFlagsByHubId, adminHubIds, scanning, rescanServices } = useTeamHubServiceScan(
    teamHubs,
    reloadToken,
    !loading && bootstrapError == null
  );

  /**
   * Returns to the hub list and clears the active admin connection.
   */
  const handleBackToList = (): void => {
    setActiveAdminHub(null);
    setView('list');
  };

  /**
   * Opens user management for the selected admin hub connection.
   *
   * @param hub - Admin team hub connection to manage.
   */
  const handleManageUsers = (hub: TeamHub): void => {
    setActiveAdminHub(hub);
    setView('manageUsers');
  };

  /**
   * Opens token management for the selected admin hub connection.
   *
   * @param hub - Admin team hub connection to manage.
   */
  const handleManageTokens = (hub: TeamHub): void => {
    setActiveAdminHub(hub);
    setView('manageTokens');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-separator px-6 py-4">
        <h1 className="m-0 truncate text-[15px] font-semibold text-text">
          {getPageTitle(view, activeAdminHub)}
        </h1>
        <Button
          type="button"
          variant="icon"
          className="opacity-100 text-[28px]"
          title="Close"
          aria-label="Close"
          onClick={onClose}
        >
          <FaIcon icon={faXmark} className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {view === 'list' ? (
          <TeamHubList
            teamHubs={teamHubs}
            loading={loading}
            bootstrapError={bootstrapError}
            reload={reload}
            adminHubIds={adminHubIds}
            serviceFlagsByHubId={serviceFlagsByHubId}
            scanning={scanning}
            onRescanServices={rescanServices}
            onManageUsers={handleManageUsers}
            onManageTokens={handleManageTokens}
          />
        ) : view === 'manageUsers' && activeAdminHub ? (
          <TeamManageView hub={activeAdminHub} onBack={handleBackToList} />
        ) : view === 'manageTokens' && activeAdminHub ? (
          <TeamTokensView hub={activeAdminHub} onBack={handleBackToList} />
        ) : null}
      </div>
    </div>
  );
}
