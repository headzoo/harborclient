import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Returns visible, enabled focusable descendants of a container, excluding
 * elements inside `aria-hidden` subtrees.
 *
 * @param container - Dialog panel element to search within.
 * @returns Focusable elements in document order.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

  return candidates.filter((element) => {
    if (element.closest('[aria-hidden="true"]')) return false;
    if (element.offsetParent === null && getComputedStyle(element).position !== 'fixed') {
      return false;
    }
    return true;
  });
}

/**
 * Traps keyboard focus within a dialog panel and restores focus on unmount.
 *
 * @param panelRef - Ref attached to the dialog panel element.
 */
export function useDialogFocus(panelRef: RefObject<HTMLElement | null>): void {
  /**
   * Moves initial focus into the panel, traps Tab/Shift+Tab, and restores
   * focus to the element that opened the dialog when the panel unmounts.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const previousFocus = document.activeElement;

    if (!panel.contains(document.activeElement)) {
      const focusables = getFocusableElements(panel);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.tabIndex = -1;
        panel.focus();
      }
    }

    /**
     * Wraps Tab and Shift+Tab at the edges of the panel focusables.
     *
     * @param event - Document keydown event.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      const focusables = getFocusableElements(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [panelRef]);
}
