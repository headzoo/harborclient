import type { JSX } from 'react';
import type { KeyValue, Variable } from '#/shared/types';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { VariableInput } from '#/renderer/src/components/VariableInput';
import { faXmark } from '#/renderer/src/fontawesome';
import { field } from '#/renderer/src/ui/shared/classes';

interface Props {
  /**
   * Editable key-value rows.
   */
  rows: KeyValue[];

  /**
   * Called when rows are added, updated, or removed.
   *
   * @param rows - Updated row list.
   */
  onChange: (rows: KeyValue[]) => void;

  /**
   * Placeholder text for the key column.
   */
  placeholderKey?: string;

  /**
   * Placeholder text for the value column.
   */
  placeholderValue?: string;

  /**
   * Collection-scoped variables for value highlighting and tooltips.
   */
  variables: Variable[];

  /**
   * Opens collection settings to edit a hovered variable.
   */
  onEditVariable?: () => void;
}

const thClass =
  'border-r border-b border-separator px-1.5 py-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted last:border-r-0';
const tdClass = 'border-r border-b border-separator p-1.5 last:border-r-0';

/**
 * Editable table of key-value rows with enable toggles for headers and params.
 */
export function KeyValueEditor({
  rows,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
  variables,
  onEditVariable
}: Props): JSX.Element {
  /**
   * Updates a single row by index.
   *
   * @param index - Row index to update.
   * @param patch - Partial fields to merge into the row.
   */
  const updateRow = (index: number, patch: Partial<KeyValue>): void => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    const isLast = index === rows.length - 1;
    if (isLast && next[index].key.trim() !== '') {
      next.push({ key: '', value: '', enabled: true });
    }
    onChange(next);
  };

  /**
   * Removes a row, keeping at least one empty row.
   *
   * @param index - Row index to remove.
   */
  const removeRow = (index: number): void => {
    if (rows.length === 1) {
      onChange([{ key: '', value: '', enabled: true }]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="overflow-hidden rounded-md border border-separator">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${thClass} w-6 p-0`} />
            <th className={thClass}>Key</th>
            <th className={thClass}>Value</th>
            <th className={`${thClass} w-7 p-0`} />
          </tr>
        </thead>
        <tbody className="[&_tr:last-child_td]:border-b-0">
          {rows.map((row, index) => (
            <tr className="group" key={index}>
              <td className={`${tdClass} w-6 p-1 text-center`}>
                <input
                  type="checkbox"
                  className="app-no-drag"
                  checked={row.enabled}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                  aria-label={`Enable row ${index + 1}`}
                  title="Enable"
                />
              </td>
              <td className={tdClass}>
                <input
                  type="text"
                  className={`${field} w-full`}
                  value={row.key}
                  placeholder={placeholderKey}
                  aria-label={`Key, row ${index + 1}`}
                  onChange={(e) => updateRow(index, { key: e.target.value })}
                />
              </td>
              <td className={tdClass}>
                <div className="min-w-0 w-full overflow-hidden rounded-md border border-separator bg-control shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.06)]">
                  <VariableInput
                    className="app-no-drag"
                    value={row.value}
                    onChange={(value) => updateRow(index, { value })}
                    variables={variables}
                    placeholder={placeholderValue}
                    aria-label={`Value, row ${index + 1}`}
                    onEditVariable={onEditVariable}
                  />
                </div>
              </td>
              <td className={`${tdClass} w-7 p-1 text-center`}>
                <Button
                  type="button"
                  variant="iconDanger"
                  onClick={() => removeRow(index)}
                  title="Remove"
                >
                  <FaIcon icon={faXmark} className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
