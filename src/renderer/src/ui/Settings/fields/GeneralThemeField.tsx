import { Select } from '@harborclient/sdk/components';
import { useMemo, type JSX } from 'react';
import type { ThemeSource } from '#/shared/types';
import { formatPluginThemeValue } from '#/shared/plugin/types';

import { usePluginThemes } from '#/renderer/src/plugins/pluginHooks';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import {
  selectDraftTheme,
  selectSettingsDraftDisabled,
  setDraftTheme
} from '#/renderer/src/store/slices/settingsDraftSlice';
import { THEME_OPTIONS } from '../constants';
import { SettingField } from '../components/SettingField';

/**
 * Appearance theme field backed by the shared settings draft.
 */
export function GeneralThemeField(): JSX.Element {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectDraftTheme);
  const disabled = useAppSelector(selectSettingsDraftDisabled);
  const pluginThemes = usePluginThemes();

  /**
   * Builds the theme dropdown options including plugin-provided themes.
   */
  const themeOptions = useMemo(
    () => [
      ...THEME_OPTIONS,
      ...pluginThemes.map((entry) => ({
        value: formatPluginThemeValue(entry.pluginId, entry.id) as ThemeSource,
        label: entry.title
      }))
    ],
    [pluginThemes]
  );

  return (
    <SettingField settingId="general.theme">
      <Select
        value={theme}
        disabled={disabled}
        onChange={(event) => dispatch(setDraftTheme(event.target.value as ThemeSource))}
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </SettingField>
  );
}
