import { PageHeader } from '@harborclient/sdk/components';
import { useMemo, useState, type JSX } from 'react';

import { faPuzzlePiece } from '#/renderer/src/fontawesome';
import { usePluginSettingsSections } from '#/renderer/src/plugins/pluginHooks';
import { AiSection } from './AiSection';
import { BackupRestoreSection } from './BackupRestoreSection';
import { StorageLocationsSection } from './StorageLocationsSection';
import { GeneralSection } from './GeneralSection';
import { PluginsSection } from './PluginSection';
import { GlobalsSection } from './GlobalsSection';
import { ProxySection } from './ProxySection';
import { ShortcutsSection } from './ShortcutsSection';
import { SyntaxHighlightingSection } from './SyntaxHighlightingSection';
import { SettingsCloseButton } from './SettingsCloseButton';
import { SettingsSidebar } from './SettingsSidebar';
import { SETTINGS_SECTIONS } from './constants';
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
 * Renders the panel for the active built-in or plugin settings section.
 *
 * @param section - Selected settings section id.
 * @param pluginSections - Registered plugin settings sections.
 * @param onClose - Closes the settings overlay.
 */
function SettingsPanel({
  section,
  pluginSections,
  onClose
}: {
  section: SettingsSection;
  pluginSections: ReturnType<typeof usePluginSettingsSections>;
  onClose: () => void;
}): JSX.Element | null {
  if (section === 'general') return <GeneralSection onClose={onClose} />;
  if (section === 'syntax') return <SyntaxHighlightingSection onClose={onClose} />;
  if (section === 'shortcuts') return <ShortcutsSection onClose={onClose} />;
  if (section === 'proxy') return <ProxySection onClose={onClose} />;
  if (section === 'globals') return <GlobalsSection onClose={onClose} />;
  if (section === 'storage') return <StorageLocationsSection onClose={onClose} />;
  if (section === 'ai') return <AiSection onClose={onClose} />;
  if (section === 'backup-restore') return <BackupRestoreSection onClose={onClose} />;
  if (section === 'plugins') return <PluginsSection onClose={onClose} />;

  const pluginSection = pluginSections.find((entry) => entry.id === section);
  if (pluginSection) {
    const Component = pluginSection.Component;
    return (
      <>
        <PageHeader title={pluginSection.title} icon={faPuzzlePiece}>
          <SettingsCloseButton onClose={onClose} />
        </PageHeader>
        <Component />
      </>
    );
  }

  return null;
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <SettingsSidebar
          section={section}
          sections={sidebarSections}
          onSectionChange={setSection}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <SettingsPanel section={section} pluginSections={pluginSections} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
