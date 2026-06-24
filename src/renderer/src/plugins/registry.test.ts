import { describe, expect, it } from 'vitest';
import {
  clearPluginContributions,
  getRegisteredPluginThemes,
  getRegisteredRequestTabs,
  getRegisteredSettingsSections,
  registerRequestTabContribution,
  registerSettingsSectionContribution
} from '#/renderer/src/plugins/registry';

/**
 * Minimal React component stub for registry tests.
 */
function StubSection(): null {
  return null;
}

/**
 * Minimal request tab stub for registry tests.
 */
function StubRequestTab(): null {
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

  it('keeps stable references for request tab snapshots', () => {
    const first = getRegisteredRequestTabs();
    const second = getRegisteredRequestTabs();
    expect(second).toBe(first);

    const disposable = registerRequestTabContribution('com.example.test', {
      id: 'plugin:com.example.test:tab',
      title: 'Tab',
      Component: StubRequestTab
    });

    const third = getRegisteredRequestTabs();
    expect(third).not.toBe(first);
    expect(third).toHaveLength(1);

    disposable.dispose();
    expect(getRegisteredRequestTabs()).not.toBe(third);
  });

  it('clearPluginContributions removes one plugin from every bucket', () => {
    registerSettingsSectionContribution('com.example.a', {
      id: 'plugin:com.example.a:general',
      title: 'A Settings',
      Component: StubSection
    });
    registerRequestTabContribution('com.example.a', {
      id: 'plugin:com.example.a:tab',
      title: 'A Tab',
      Component: StubRequestTab
    });
    registerSettingsSectionContribution('com.example.b', {
      id: 'plugin:com.example.b:general',
      title: 'B Settings',
      Component: StubSection
    });

    clearPluginContributions('com.example.a');

    expect(
      getRegisteredSettingsSections().every((section) => section.pluginId !== 'com.example.a')
    ).toBe(true);
    expect(getRegisteredRequestTabs().every((tab) => tab.pluginId !== 'com.example.a')).toBe(true);
    expect(
      getRegisteredSettingsSections().some((section) => section.pluginId === 'com.example.b')
    ).toBe(true);

    clearPluginContributions('com.example.b');
  });
});
