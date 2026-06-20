import { useState, type JSX } from 'react';
import type { DatabaseProvider } from '#/shared/types';
import { SegmentedTabs } from '#/renderer/src/components/SegmentedTabs';
import { PROVIDER_OPTIONS } from './constants';
import { FirestoreSection } from './FirestoreSection';
import { MySqlSection } from './MySqlSection';
import { PostgresSection } from './PostgresSection';
import { SqliteSection } from './SqliteSection';

/**
 * Database settings with tabs for each supported provider.
 */
export function DatabasesSection(): JSX.Element {
  const [provider, setProvider] = useState<DatabaseProvider>('sqlite');

  return (
    <div>
      <div className="mb-4">
        <SegmentedTabs value={provider} onChange={setProvider} tabs={PROVIDER_OPTIONS} />
      </div>

      {provider === 'sqlite' && <SqliteSection />}
      {provider === 'firestore' && <FirestoreSection />}
      {provider === 'mysql' && <MySqlSection />}
      {provider === 'postgres' && <PostgresSection />}
    </div>
  );
}
