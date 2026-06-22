import { tmpdir } from 'os';
import { vi } from 'vitest';

/**
 * Stubs Electron for the Node-based vitest runner.
 *
 * Main-process modules import `electron` at load time. The npm package throws
 * when its binary was not downloaded (common in CI with a warm pnpm cache), and
 * even when installed it only exports the executable path—not `app` or
 * `safeStorage`. Tests that exercise those modules under vitest need this stub.
 */
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData' || name === 'appData') {
        return tmpdir();
      }
      return tmpdir();
    })
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((value: string) => Buffer.from(value, 'utf8')),
    decryptString: vi.fn((buffer: Buffer) => buffer.toString('utf8'))
  },
  BrowserWindow: class {},
  screen: { getAllDisplays: () => [] }
}));
