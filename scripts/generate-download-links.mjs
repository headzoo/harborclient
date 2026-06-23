import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoUrl } from './docs-site.config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, '..');
const outputPath = path.join(repoDir, 'docs/.vitepress/static/download_links.json');

/**
 * Parses `owner/repo` from a GitHub repository URL.
 *
 * @param {string} url Public GitHub repository URL.
 * @returns {string} Repository slug used by the GitHub API.
 */
const parseRepoSlug = (url) => {
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!match) {
    throw new Error(`Could not parse GitHub repo from ${url}`);
  }

  return match[1];
};

/**
 * Resolves the release version from CLI flags, environment, or package.json.
 *
 * @returns {Promise<string>} Semver without a leading `v`.
 */
const resolveVersion = async () => {
  const flagIndex = process.argv.indexOf('--version');
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) {
    return process.argv[flagIndex + 1].replace(/^v/, '');
  }

  if (process.env.INPUT_VERSION) {
    return process.env.INPUT_VERSION.replace(/^v/, '');
  }

  const pkg = JSON.parse(await readFile(path.join(repoDir, 'package.json'), 'utf8'));
  return pkg.version;
};

/**
 * Finds the first release asset whose filename ends with the given suffix.
 *
 * @param {{ assets?: { name: string; browser_download_url: string }[] } | null | undefined} release GitHub release payload.
 * @param {string} suffix Filename suffix to match (for example `.exe`).
 * @returns {string} Browser download URL, or an empty string when no asset matches.
 */
const assetUrl = (release, suffix) => {
  if (!release?.assets?.length) {
    return '';
  }

  const asset = release.assets.find((entry) => entry.name.endsWith(suffix));
  return asset?.browser_download_url ?? '';
};

/**
 * Builds tag-form fallback download URLs when the GitHub API is unavailable.
 *
 * @param {string} repo Repository slug (`owner/name`).
 * @param {string} version Semver without a leading `v`.
 * @returns {{ releaseUrl: string; assets: Record<string, string> }} Fallback URLs keyed like the generated JSON schema.
 */
const fallbackUrls = (repo, version) => {
  const base = `https://github.com/${repo}/releases`;

  return {
    releaseUrl: `${base}/tag/v${version}`,
    assets: {
      windows: `${base}/download/v${version}/harborclient-${version}.exe`,
      macArm64: `${base}/download/v${version}/harborclient-${version}-arm64.dmg`,
      macX64: `${base}/download/v${version}/harborclient-${version}-x64.dmg`,
      linuxDeb: `${base}/download/v${version}/harborclient-${version}.deb`,
      linuxAppImage: `${base}/download/v${version}/harborclient-${version}.AppImage`,
    },
  };
};

/**
 * Loads the GitHub release for `v{version}` when an API token is available.
 *
 * @param {string} repo Repository slug (`owner/name`).
 * @param {string} version Semver without a leading `v`.
 * @returns {Promise<{ tag_name: string; html_url: string; assets: { name: string; browser_download_url: string }[] } | null>}
 */
const fetchRelease = async (repo, version) => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('No GH_TOKEN/GITHUB_TOKEN set; using fallback download URLs.');
    return null;
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`,
      { headers },
    );

    if (!response.ok) {
      console.warn(`GitHub API returned ${response.status}; using fallback download URLs.`);
      return null;
    }

    /** @type {{ tag_name: string; html_url: string; assets: { name: string; browser_download_url: string }[] }[]} */
    const releases = await response.json();
    if (releases.length === 0) {
      break;
    }

    const match = releases.find((entry) => entry.tag_name === `v${version}`);
    if (match) {
      return match;
    }
  }

  console.warn(`No published release found for v${version}; using fallback download URLs.`);
  return null;
};

/**
 * Writes `download_links.json` for the docs site from GitHub release assets.
 */
const main = async () => {
  const repo = parseRepoSlug(repoUrl);
  const version = await resolveVersion();
  const release = await fetchRelease(repo, version);
  const fallback = fallbackUrls(repo, version);

  const assets = {
    windows: assetUrl(release, '.exe') || fallback.assets.windows,
    macArm64: assetUrl(release, '-arm64.dmg') || fallback.assets.macArm64,
    macX64: assetUrl(release, '-x64.dmg') || fallback.assets.macX64,
    linuxDeb: assetUrl(release, '.deb') || fallback.assets.linuxDeb,
    linuxAppImage: assetUrl(release, '.AppImage') || fallback.assets.linuxAppImage,
  };

  const payload = {
    version,
    releaseUrl: release?.html_url ?? fallback.releaseUrl,
    assets,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${path.relative(repoDir, outputPath)} for v${version}`);
  for (const [key, url] of Object.entries(assets)) {
    console.log(`  ${key}: ${url}`);
  }
  console.log(`  releaseUrl: ${payload.releaseUrl}`);
};

await main();
