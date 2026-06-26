import type { JSX } from 'react';
import { Input } from '#/renderer/src/components/forms';
import { FormGroup } from '#/renderer/src/components/FormGroup';

interface Props {
  /**
   * Current sidebar search query.
   */
  value: string;

  /**
   * Called when the user edits the search field.
   */
  onChange: (value: string) => void;

  /**
   * True while collection contents are still loading for an active search.
   */
  loading?: boolean;
}

/**
 * Sidebar search field that filters collections, requests, and environments.
 */
export function SidebarSearch({ value, onChange, loading = false }: Props): JSX.Element {
  return (
    <div className="mb-3 pt-2">
      <FormGroup label="Search collections and environments" htmlFor="sidebar-search" srOnly>
        <Input
          id="sidebar-search"
          type="search"
          placeholder="Search"
          value={value}
          className="w-full"
          onChange={(event) => onChange(event.target.value)}
        />
      </FormGroup>
      {loading ? (
        <p className="mt-1.5 text-[14px] text-muted" role="status">
          Loading…
        </p>
      ) : null}
    </div>
  );
}
