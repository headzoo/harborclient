import { useMemo, type JSX } from 'react';
import type { FormDataPart, FormDataPartType, Variable } from '#/shared/types';
import { emptyFormPart } from '#/shared/formData';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { VariableInput } from '#/renderer/src/components/VariableInput';
import { faXmark } from '#/renderer/src/fontawesome';
import { field } from '#/renderer/src/ui/shared/classes';

interface Props {
  /**
   * Editable multipart form rows.
   */
  parts: FormDataPart[];

  /**
   * Called when rows are added, updated, or removed.
   *
   * @param parts - Updated part list.
   */
  onChange: (parts: FormDataPart[]) => void;

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
  'border-r border-b border-separator px-1.5 py-1 text-left text-[14px] font-medium uppercase tracking-wide text-muted last:border-r-0';
const tdClass = 'border-r border-b border-separator p-1.5 align-top last:border-r-0';

/**
 * Returns the file name portion of an absolute path.
 *
 * @param filePath - Absolute file path.
 */
function fileBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

/**
 * Ensures at least one row exists and appends a trailing blank row when needed.
 *
 * @param parts - Current form parts.
 * @returns Rows safe to render in the editor.
 */
function withTrailingRow(parts: FormDataPart[]): FormDataPart[] {
  if (parts.length === 0) {
    return [emptyFormPart()];
  }
  return parts;
}

/**
 * Editable table of multipart form parts with text and file field types.
 */
export function FormDataEditor({ parts, onChange, variables, onEditVariable }: Props): JSX.Element {
  /**
   * Ensures at least one row exists for rendering, including a trailing blank row.
   */
  const rows = useMemo(() => withTrailingRow(parts), [parts]);

  /**
   * Updates a single row by index, auto-appending a blank row when the last key is filled.
   *
   * @param index - Row index to update.
   * @param patch - Partial fields to merge into the row.
   */
  const updateRow = (index: number, patch: Partial<FormDataPart>): void => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    const isLast = index === rows.length - 1;
    if (isLast && next[index].key.trim() !== '') {
      next.push(emptyFormPart());
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
      onChange([emptyFormPart()]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  /**
   * Opens the native file picker and merges selected paths into a file row.
   *
   * @param index - Row index to attach files to.
   */
  const chooseFiles = async (index: number): Promise<void> => {
    const selected = await window.api.selectFiles();
    if (selected.length === 0) {
      return;
    }

    const currentFiles = rows[index]?.files ?? [];
    const merged = [...currentFiles];
    for (const filePath of selected) {
      if (!merged.includes(filePath)) {
        merged.push(filePath);
      }
    }
    updateRow(index, { type: 'file', files: merged, value: '' });
  };

  /**
   * Removes one file path from a file row.
   *
   * @param index - Row index containing the file.
   * @param filePath - Absolute path to remove.
   */
  const removeFile = (index: number, filePath: string): void => {
    const currentFiles = rows[index]?.files ?? [];
    updateRow(index, { files: currentFiles.filter((file) => file !== filePath) });
  };

  return (
    <div className="overflow-hidden rounded-md border border-separator">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${thClass} w-6 p-0`} />
            <th className={thClass}>Key</th>
            <th className={`${thClass} w-24`}>Type</th>
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
                  placeholder="field"
                  aria-label={`Key, row ${index + 1}`}
                  onChange={(e) => updateRow(index, { key: e.target.value })}
                />
              </td>
              <td className={tdClass}>
                <select
                  className={`${field} w-full`}
                  value={row.type}
                  aria-label={`Type, row ${index + 1}`}
                  onChange={(e) => {
                    const type = e.target.value as FormDataPartType;
                    updateRow(index, {
                      type,
                      value: type === 'text' ? row.value : '',
                      files: type === 'file' ? row.files : []
                    });
                  }}
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              </td>
              <td className={tdClass}>
                {row.type === 'text' ? (
                  <div className="min-w-0 w-full overflow-hidden rounded-md border border-separator bg-control shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.06)]">
                    <VariableInput
                      className="app-no-drag"
                      value={row.value}
                      onChange={(value) => updateRow(index, { value })}
                      variables={variables}
                      placeholder="value"
                      aria-label={`Value, row ${index + 1}`}
                      onEditVariable={onEditVariable}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="self-start px-2 py-0.5 text-[14px]"
                      onClick={() => void chooseFiles(index)}
                    >
                      Choose files
                    </Button>
                    {row.files.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {row.files.map((filePath) => (
                          <span
                            key={filePath}
                            className="inline-flex max-w-full items-center gap-1 rounded-md border border-separator bg-control px-1.5 py-0.5 text-[14px] text-text"
                            title={filePath}
                          >
                            <span className="truncate">{fileBasename(filePath)}</span>
                            <button
                              type="button"
                              className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-selection hover:text-text app-no-drag"
                              onClick={() => removeFile(index, filePath)}
                              title="Remove file"
                            >
                              <FaIcon icon={faXmark} className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
