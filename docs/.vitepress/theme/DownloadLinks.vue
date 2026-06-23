<script setup lang="ts">
import downloadLinks from '../static/download_links.json';

/**
 * Extracts the filename segment from a GitHub release asset URL for display.
 *
 * @param url Absolute browser download URL.
 * @returns Decoded filename, or the full URL when parsing fails.
 */
const filenameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').pop();
    return segment ? decodeURIComponent(segment) : url;
  } catch {
    return url;
  }
};

/** Platform rows rendered in the download table. */
const rows = [
  { platform: 'Windows', url: downloadLinks.assets.windows },
  { platform: 'macOS (Apple Silicon)', url: downloadLinks.assets.macArm64 },
  { platform: 'macOS (Intel)', url: downloadLinks.assets.macX64 },
  { platform: 'Linux (Debian/Ubuntu)', url: downloadLinks.assets.linuxDeb },
  { platform: 'Linux (portable)', url: downloadLinks.assets.linuxAppImage },
] as const;
</script>

<template>
  <p>
    Download <strong>v{{ downloadLinks.version }}</strong> for your operating system. See
    <a :href="downloadLinks.releaseUrl" target="_blank" rel="noopener noreferrer"
      >all releases on GitHub</a
    >
    for older versions.
  </p>

  <table>
    <thead>
      <tr>
        <th scope="col">Platform</th>
        <th scope="col">Download</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.platform">
        <td>{{ row.platform }}</td>
        <td>
          <a :href="row.url" target="_blank" rel="noopener noreferrer">{{
            filenameFromUrl(row.url)
          }}</a>
        </td>
      </tr>
    </tbody>
  </table>
</template>
