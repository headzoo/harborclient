/**
 * Parses owner and repository name from a public GitHub repository URL.
 *
 * @param repoUrl - HTTPS GitHub repository URL, optionally ending in `.git`.
 * @returns Owner and repo slug when the URL targets github.com.
 */
export function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(repoUrl.trim());
  } catch {
    return null;
  }

  if (parsed.hostname !== 'github.com') {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const owner = segments[0];
  const repo = segments[1]?.replace(/\.git$/, '');
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

/**
 * Builds a raw.githubusercontent.com URL for a file in a public GitHub repository.
 *
 * @param repoUrl - HTTPS GitHub repository URL.
 * @param ref - Branch, tag, or commit ref.
 * @param relativePath - Repository-relative file path.
 * @returns Raw content URL, or null when the repository URL is not GitHub-hosted.
 */
export function buildGitHubRawContentUrl(
  repoUrl: string,
  ref: string,
  relativePath: string
): string | null {
  const repo = parseGitHubRepo(repoUrl);
  if (!repo) {
    return null;
  }

  const normalizedPath = relativePath.replace(/^\/+/, '');
  if (!normalizedPath || normalizedPath.includes('..')) {
    return null;
  }

  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${ref}/${normalizedPath}`;
}
