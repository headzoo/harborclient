import { type JSX } from 'react';
import type { TeamHubServiceFlags } from '#/shared/types';

interface Props {
  /**
   * Hub server service flags for one connection.
   */
  services: TeamHubServiceFlags;

  /**
   * When true, renders badges in a muted scanning state.
   */
  scanning: boolean;
}

/**
 * One service badge label and availability flag.
 */
interface ServiceBadge {
  /**
   * Visible badge label.
   */
  label: string;

  /**
   * When true, the hub server provides this service.
   */
  active: boolean;
}

/**
 * Returns Tailwind classes for a service badge state.
 *
 * @param active - Whether the service is available on the hub server.
 * @param scanning - Whether the service scan is still running.
 */
function badgeClassName(active: boolean, scanning: boolean): string {
  if (scanning || !active) {
    return 'rounded bg-accent/10 px-1.5 py-0.5 text-[14px] text-muted';
  }

  return 'rounded bg-success/15 px-1.5 py-0.5 text-[14px] font-medium text-success';
}

/**
 * Renders Team Hub service badges for one hub row.
 */
export function TeamHubServiceBadges({ services, scanning }: Props): JSX.Element {
  const badges: ServiceBadge[] = [
    { label: 'Storage', active: services.storage },
    { label: 'LLM', active: services.llm },
    { label: 'Plugins', active: services.pluginCatalog }
  ];

  if (services.admin) {
    badges.push({ label: 'Admin', active: true });
  }

  return (
    <div
      className="mt-1 flex flex-wrap gap-1"
      aria-busy={scanning}
      aria-label={scanning ? 'Scanning hub services' : 'Hub services'}
    >
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={badgeClassName(badge.active, scanning)}
          aria-label={
            scanning
              ? `${badge.label}: scanning`
              : `${badge.label}: ${badge.active ? 'available' : 'not available'}`
          }
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
