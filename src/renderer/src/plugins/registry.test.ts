import { describe, expect, it } from 'vitest';
import {
  getRegisteredPluginThemes,
  getRegisteredSettingsSections,
  registerSettingsSectionContribution
} from '#/renderer/src/plugins/registry';

/**
 * Minimal React component stub for registry tests.
 */
function StubSection(): null {
  return null;
}

describe('plugin registry', () => {
  it('returns stable snapshot references until contributions change', () => {
    const first = getRegisteredSettingsSections();
    const second = getRegisteredSettingsSections();
    expect(second).toBe(first);

    const disposable = registerSettingsSectionContribution('com.example.test', {
      id: 'plugin:com.example.test:general',
      title: 'Example',
      Component: StubSection
    });

    const third = getRegisteredSettingsSections();
    expect(third).not.toBe(first);
    expect(third).toHaveLength(1);

    const fourth = getRegisteredSettingsSections();
    expect(fourth).toBe(third);

    disposable.dispose();
    expect(getRegisteredSettingsSections()).not.toBe(third);
    expect(getRegisteredPluginThemes()).toBe(getRegisteredPluginThemes());
  });
});
