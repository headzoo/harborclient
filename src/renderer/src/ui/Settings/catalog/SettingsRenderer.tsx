import { Page } from '@harborclient/sdk/components';
import { useEffect, type JSX } from 'react';

import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import { selectSettingsDraftLoadError } from '#/renderer/src/store/slices/settingsDraftSlice';
import { loadSettingsDraft } from '#/renderer/src/store/thunks/settingsDraft';
import type { SettingsSection } from '#/shared/types';

import { settingsSectionMeta } from '../constants';
import { SettingsCloseButton } from '../SettingsCloseButton';
import { SettingsSaveFooter } from '../components/SettingsSaveFooter';
import {
  entryById,
  fieldEntriesForSection,
  FORM_SECTION_DESCRIPTIONS,
  isFormSettingsSection,
  type FieldSettingId,
  type FormSettingsSection,
  type SettingId
} from './catalog';
import {
  FORM_SECTION_EXTRAS,
  isManagementSettingsSection,
  renderSettingFields,
  SETTINGS_SECTION_REGISTRY
} from './registry';

interface Props {
  /**
   * Closes the settings overlay.
   */
  onClose: () => void;
  /**
   * Built-in or plugin settings section to render in normal navigation mode.
   */
  section?: SettingsSection;
  /**
   * Optional explicit field ids for dynamic mixed-section rendering (future search).
   */
  settingIds?: SettingId[];
}

/**
 * Renders optional trailing content configured for a form section.
 *
 * @param section - Form settings section id.
 */
function FormSectionExtras({ section }: { section: FormSettingsSection }): JSX.Element | null {
  const ExtraComponent = FORM_SECTION_EXTRAS[section];
  if (!ExtraComponent) {
    return null;
  }
  return <ExtraComponent />;
}

/**
 * Inline load/save error message for catalog-driven form sections.
 */
function SettingsDraftError(): JSX.Element | null {
  const error = useAppSelector(selectSettingsDraftLoadError);
  if (!error) {
    return null;
  }

  return (
    <p className="mb-4 text-[14px] text-danger" role="alert">
      {error}
    </p>
  );
}

/**
 * Catalog-driven settings layout engine for section navigation and future search results.
 */
export function SettingsRenderer({ onClose, section, settingIds }: Props): JSX.Element | null {
  const dispatch = useAppDispatch();

  /**
   * Loads the shared settings draft when a catalog-driven section is shown.
   */
  useEffect(() => {
    if (section == null && settingIds == null) {
      return;
    }
    if (section != null && isManagementSettingsSection(section)) {
      return;
    }
    void dispatch(loadSettingsDraft());
  }, [dispatch, section, settingIds]);

  if (settingIds != null && settingIds.length > 0) {
    const fieldIds = settingIds.filter(
      (id): id is FieldSettingId => entryById(id).kind === 'field'
    );

    return (
      <Page
        embedded
        className="mb-6 flex flex-col"
        title="Settings"
        actions={<SettingsCloseButton onClose={onClose} />}
      >
        <SettingsDraftError />
        <div className="mb-6 flex flex-col gap-6">{renderSettingFields(fieldIds)}</div>
        <SettingsSaveFooter />
      </Page>
    );
  }

  if (section == null) {
    return null;
  }

  if (isManagementSettingsSection(section)) {
    const SectionComponent = SETTINGS_SECTION_REGISTRY[section];
    return <SectionComponent onClose={onClose} />;
  }

  if (isFormSettingsSection(section)) {
    const { label, icon } = settingsSectionMeta(section);
    const fieldIds = fieldEntriesForSection(section).map((entry) => entry.id);

    return (
      <Page
        embedded
        className="mb-6 flex flex-col"
        title={label}
        icon={icon}
        description={FORM_SECTION_DESCRIPTIONS[section]}
        actions={<SettingsCloseButton onClose={onClose} />}
      >
        <SettingsDraftError />
        <div className="mb-6 flex flex-col gap-6">{renderSettingFields(fieldIds)}</div>
        <FormSectionExtras section={section} />
        <div className="mt-6">
          <SettingsSaveFooter />
        </div>
      </Page>
    );
  }

  return null;
}
