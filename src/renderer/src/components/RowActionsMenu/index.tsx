import { useEffect, useRef, type JSX } from 'react';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faBars } from '#/renderer/src/fontawesome';

export type MenuItem = {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'danger';
};

interface Props {
  /**
   * Grouped menu entries shown when the trigger is open. Each inner array is
   * one visual group separated by a divider line.
   */
  groups: MenuItem[][];

  /**
   * Unique id for this menu instance (e.g. "collection-3").
   */
  menuId: string;

  /**
   * Id of the currently open menu, or null when all are closed.
   */
  openMenuId: string | null;

  /**
   * Called when the user opens or closes a menu.
   *
   * @param id - Open menu id, or null to close.
   */
  onOpenChange: (id: string | null) => void;
}

/**
 * Tailwind classes for a single menu item button.
 *
 * @param variant - Visual variant for default or destructive actions.
 */
function menuItemClass(variant: MenuItem['variant']): string {
  const base =
    'block w-full cursor-pointer border-none bg-transparent px-3.5 py-1.5 text-left text-[14px] app-no-drag';

  return variant === 'danger'
    ? `${base} text-text hover:bg-danger/15 hover:text-danger`
    : `${base} text-text hover:bg-selection`;
}

/**
 * Hamburger-triggered dropdown for row-level actions (rename, delete, etc.).
 */
export function RowActionsMenu({ groups, menuId, openMenuId, onOpenChange }: Props): JSX.Element {
  const isOpen = openMenuId === menuId;
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Closes the menu on outside click or Escape while it is open.
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onOpenChange(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onOpenChange(null);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="icon"
        className={isOpen ? 'opacity-100' : undefined}
        title="Actions"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(isOpen ? null : menuId);
        }}
      >
        <FaIcon icon={faBars} className="h-3.5 w-3.5" />
      </Button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-0.5 min-w-[120px] rounded-md border border-separator bg-surface py-1 shadow-md app-no-drag"
        >
          {groups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              role="group"
              className={groupIndex > 0 ? 'border-t border-separator' : undefined}
            >
              {group.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={menuItemClass(item.variant)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(null);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
