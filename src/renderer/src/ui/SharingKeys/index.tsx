import { useState, type JSX } from 'react';
import { SharingKeysSidebar } from './SharingKeysSidebar';
import { IdentitySection } from './IdentitySection';
import { TrustedKeysSection } from './TrustedKeysSection';
import type { SharingKeysSection } from './types';

interface Props {
  /**
   * Closes the sharing keys view.
   */
  onClose: () => void;
}

/**
 * Full-area sharing key management with sidebar navigation.
 */
export function SharingKeys({ onClose }: Props): JSX.Element {
  const [section, setSection] = useState<SharingKeysSection>('identity');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <SharingKeysSidebar section={section} onSectionChange={setSection} />

        <div className="flex-1 overflow-y-auto p-6">
          {section === 'identity' && <IdentitySection onClose={onClose} />}
          {section === 'trusted' && <TrustedKeysSection onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}
