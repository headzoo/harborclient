import { generateKeyPairSync } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const PRIVATE_KEY_FILENAME = 'invite-key.pem';
const PUBLIC_KEY_FILENAME = 'invite-pub.pem';

export interface InviteKeyPair {
  privateKey: string;
  publicKey: string;
}

let cachedKeys: InviteKeyPair | null = null;

/**
 * Reads a PEM file from userData, returning undefined when missing.
 *
 * @param filePath - Absolute path to the PEM file.
 */
async function readPem(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

/**
 * Ensures an RSA key pair exists for signing invite JWTs.
 *
 * Keys are stored in userData as invite-key.pem and invite-pub.pem.
 *
 * @param userDataPath - Electron userData directory.
 */
export async function ensureInviteKeys(userDataPath: string): Promise<InviteKeyPair> {
  if (cachedKeys) return cachedKeys;

  const privatePath = join(userDataPath, PRIVATE_KEY_FILENAME);
  const publicPath = join(userDataPath, PUBLIC_KEY_FILENAME);

  const existingPrivate = await readPem(privatePath);
  const existingPublic = await readPem(publicPath);

  if (existingPrivate && existingPublic) {
    cachedKeys = { privateKey: existingPrivate, publicKey: existingPublic };
    return cachedKeys;
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  await writeFile(privatePath, privateKey, 'utf-8');
  await writeFile(publicPath, publicKey, 'utf-8');

  cachedKeys = { privateKey, publicKey };
  return cachedKeys;
}
