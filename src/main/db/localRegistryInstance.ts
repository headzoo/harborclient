import { LocalRegistry } from '#/main/db/LocalRegistry';

let instance: LocalRegistry | null = null;

/**
 * Opens the local registry singleton and returns it.
 *
 * @param userDataPath - Electron app userData path for the registry file.
 */
export async function initLocalRegistry(userDataPath: string): Promise<LocalRegistry> {
  if (instance) return instance;

  const registry = new LocalRegistry(userDataPath);
  await registry.init();
  instance = registry;
  return registry;
}

/**
 * Returns the initialized local registry singleton.
 */
export function getLocalRegistry(): LocalRegistry {
  if (!instance) {
    throw new Error('Local registry not initialized');
  }
  return instance;
}

/**
 * Installs a registry instance for unit tests.
 *
 * @param registry - Registry to use as the singleton.
 */
export function setLocalRegistryForTesting(registry: LocalRegistry): void {
  instance = registry;
}

/**
 * Clears the registry singleton for unit tests.
 */
export function clearLocalRegistryForTesting(): void {
  instance = null;
}
