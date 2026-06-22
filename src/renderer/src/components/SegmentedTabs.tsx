import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type JSX,
  type KeyboardEvent,
  type ReactNode
} from 'react';
import { resolveTabListKeyAction } from '#/renderer/src/components/tabListKeyboard';
import { segment, segmentGroup } from '#/renderer/src/ui/shared/classes';

export interface TabItem<T extends string> {
  /**
   * Unique tab identifier.
   */
  value: T;

  /**
   * Tab label or custom content.
   */
  label: ReactNode;

  /**
   * When true, the tab is not rendered.
   */
  hidden?: boolean;

  /**
   * When true, the tab button is disabled.
   */
  disabled?: boolean;

  /**
   * When true, renders a small dot indicating the tab has values set.
   */
  indicator?: boolean;
}

interface SegmentedTabsContextValue {
  /**
   * Currently selected tab value.
   */
  value: string;

  /**
   * Selects a tab by value.
   */
  onChange: (value: string) => void;

  /**
   * Accessible name for the tab list.
   */
  ariaLabel: string;

  /**
   * Stable DOM id for a tab control.
   */
  getTabId: (value: string) => string;

  /**
   * Stable DOM id for a tab panel linked to a tab.
   */
  getPanelId: (value: string) => string;
}

const SegmentedTabsContext = createContext<SegmentedTabsContextValue | null>(null);

interface GroupProps<T extends string> {
  /**
   * Currently selected tab value.
   */
  value: T;

  /**
   * Called when the user selects a different tab.
   *
   * @param value - Newly selected tab value.
   */
  onChange: (value: T) => void;

  /**
   * Accessible name for the tab list.
   */
  ariaLabel: string;

  /**
   * Tab list and linked tab panels.
   */
  children: ReactNode;
}

/**
 * Provides tab selection state and stable ids for `SegmentedTabs` and
 * `SegmentedTabPanel` children.
 */
export function SegmentedTabsGroup<T extends string>({
  value,
  onChange,
  ariaLabel,
  children
}: GroupProps<T>): JSX.Element {
  const baseId = useId();

  /**
   * Memoizes context so tab ids stay stable across renders while value updates
   * propagate to list and panel children.
   */
  const contextValue = useMemo(
    (): SegmentedTabsContextValue => ({
      value,
      onChange: (nextValue) => onChange(nextValue as T),
      ariaLabel,
      getTabId: (tabValue) => `${baseId}-tab-${tabValue}`,
      getPanelId: (tabValue) => `${baseId}-panel-${tabValue}`
    }),
    [value, onChange, ariaLabel, baseId]
  );

  return (
    <SegmentedTabsContext.Provider value={contextValue}>{children}</SegmentedTabsContext.Provider>
  );
}

interface PanelProps<T extends string> {
  /**
   * Tab value that controls visibility of this panel.
   */
  value: T;

  /**
   * Panel content shown when this tab is selected.
   */
  children: ReactNode;

  /**
   * Additional CSS classes for the panel container.
   */
  className?: string;
}

/**
 * Renders a WAI-ARIA tab panel linked to the matching tab in the parent group.
 */
export function SegmentedTabPanel<T extends string>({
  value,
  children,
  className
}: PanelProps<T>): JSX.Element | null {
  const context = useContext(SegmentedTabsContext);
  if (!context) {
    throw new Error('SegmentedTabPanel must be used within SegmentedTabsGroup');
  }

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      id={context.getPanelId(value)}
      aria-labelledby={context.getTabId(value)}
      className={className}
    >
      {children}
    </div>
  );
}

interface Props<T extends string> {
  /**
   * Tab definitions to render.
   */
  tabs: TabItem<T>[];

  /**
   * Currently selected tab value. Omit when used inside `SegmentedTabsGroup`.
   */
  value?: T;

  /**
   * Called when the user selects a different tab. Omit when used inside
   * `SegmentedTabsGroup`.
   *
   * @param value - Newly selected tab value.
   */
  onChange?: (value: T) => void;

  /**
   * When true, the group and each tab stretch to full width.
   */
  fullWidth?: boolean;

  /**
   * Additional CSS classes for the tab group container.
   */
  className?: string;

  /**
   * ARIA pattern for the control. Use `radiogroup` for single-choice settings
   * pickers; use `tabs` with `SegmentedTabsGroup` for content switchers.
   */
  pattern?: 'tabs' | 'radiogroup';

  /**
   * Accessible name for the tab list or radio group. Omit when used inside
   * `SegmentedTabsGroup`.
   */
  ariaLabel?: string;
}

/**
 * macOS-style segmented tab control with WAI-ARIA tabs or radiogroup semantics.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value: valueProp,
  onChange: onChangeProp,
  fullWidth = false,
  className,
  pattern = 'tabs',
  ariaLabel: ariaLabelProp
}: Props<T>): JSX.Element {
  const context = useContext(SegmentedTabsContext);
  const standaloneId = useId();
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());

  const value = (context?.value as T | undefined) ?? valueProp;

  /**
   * Resolves the change handler from group context or standalone props so the
   * keyboard handler dependency stays stable across renders.
   */
  const onChange = useMemo((): ((nextValue: T) => void) | undefined => {
    if (context) return (nextValue) => context.onChange(nextValue);
    return onChangeProp;
  }, [context, onChangeProp]);
  const ariaLabel = context?.ariaLabel ?? ariaLabelProp;

  if (value === undefined || onChange === undefined) {
    throw new Error(
      'SegmentedTabs requires value and onChange, or must be used within SegmentedTabsGroup'
    );
  }

  const getTabId = context
    ? (tabValue: T) => context.getTabId(tabValue)
    : (tabValue: T) => `${standaloneId}-tab-${tabValue}`;
  const getPanelId = context
    ? (tabValue: T) => context.getPanelId(tabValue)
    : (tabValue: T) => `${standaloneId}-panel-${tabValue}`;

  const visibleTabs = tabs.filter((tab) => !tab.hidden);

  const groupClassName = [segmentGroup, fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');

  /**
   * Moves selection with arrow, Home, and End keys and focuses the newly
   * selected tab or radio control.
   *
   * @param event - Keyboard event from the tab list or radio group container.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const currentIndex = visibleTabs.findIndex((tab) => tab.value === value);
      const disabledIndices = visibleTabs
        .map((tab, index) => (tab.disabled ? index : -1))
        .filter((index) => index >= 0);

      const nextIndex = resolveTabListKeyAction(event.key, currentIndex, visibleTabs.length, {
        disabledIndices
      });
      if (nextIndex === null) return;

      event.preventDefault();
      const nextTab = visibleTabs[nextIndex];
      if (nextTab.value !== value) {
        onChange(nextTab.value);
      }

      requestAnimationFrame(() => {
        tabRefs.current.get(nextTab.value)?.focus();
      });
    },
    [visibleTabs, value, onChange]
  );

  const isRadiogroup = pattern === 'radiogroup';

  return (
    <div
      className={groupClassName}
      role={isRadiogroup ? 'radiogroup' : 'tablist'}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {visibleTabs.map((tab) => {
        const selected = value === tab.value;
        const tabClassName = `${segment(selected)}${fullWidth ? ' flex-1' : ''}`;

        return (
          <button
            key={tab.value}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.value, element);
              else tabRefs.current.delete(tab.value);
            }}
            type="button"
            className={tabClassName}
            disabled={tab.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            {...(isRadiogroup
              ? { role: 'radio', 'aria-checked': selected }
              : {
                  role: 'tab',
                  id: getTabId(tab.value),
                  'aria-selected': selected,
                  'aria-controls': getPanelId(tab.value)
                })}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.indicator && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
