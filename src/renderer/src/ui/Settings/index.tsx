import { Page, PageSidebar, SidebarLayout } from '@harborclient/sdk/components';
import { useMemo, useState, type JSX } from 'react';

import { faPuzzlePiece } from '#/renderer/src/fontawesome';
import { PluginSurface } from '#/renderer/src/plugins/PluginSurface';
import { usePluginSettingsSections } from '#/renderer/src/plugins/pluginHooks';
import { SETTINGS_SECTIONS } from './constants';
import { SettingsRenderer } from './catalog/SettingsRenderer';
import { SettingsCloseButton } from './SettingsCloseButton';
import type { SettingsSection } from './types';

interface Props {
  /**
   * Closes the settings view.
   */
  onClose: () => void;

  /**
   * Settings section to show when the overlay opens.
   */
  initialSection: SettingsSection;
}

/**
 * Full-area application settings with sidebar navigation.
 */
export function Settings({ onClose, initialSection }: Props): JSX.Element {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const pluginSections = usePluginSettingsSections();

  const sidebarSections = useMemo(
    () => [
      ...SETTINGS_SECTIONS,
      ...pluginSections.map((entry) => ({
        value: entry.id as SettingsSection,
        label: entry.title,
        icon: faPuzzlePiece
      }))
    ],
    [pluginSections]
  );

  const pluginSection = pluginSections.find((entry) => entry.id === section);

  return (
    <SidebarLayout
      sidebar={
        <PageSidebar
          ariaLabel="Settings sections"
          selected={section}
          onSelect={setSection}
          items={sidebarSections}
        />
      }
    >
      {pluginSection ? (
        <Page
          embedded
          title={pluginSection.title}
          icon={faPuzzlePiece}
          actions={<SettingsCloseButton onClose={onClose} />}
        >
          <PluginSurface
            pluginId={pluginSection.pluginId}
            contributionId={pluginSection.contributionId}
            kind="settingsSections"
            minHeight={400}
          />
        </Page>
      ) : (
        <SettingsRenderer section={section} onClose={onClose} />
      )}
    </SidebarLayout>
  );
}
