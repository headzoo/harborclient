import type { JSX } from 'react';
import { field } from '#/renderer/src/ui/shared/classes';

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Collection name input for the General tab.
 */
export function GeneralSection({ name, onNameChange, onSave, onClose }: Props): JSX.Element {
  return (
    <div className="mb-6">
      <label className="mb-1 block text-[13px] text-muted">Name</label>
      <input
        className={`${field} w-full`}
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
          if (e.key === 'Escape') onClose();
        }}
      />
    </div>
  );
}
