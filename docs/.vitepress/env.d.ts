declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

/** Generated at docs build time by `scripts/generate-download-links.mjs`. */
declare module '../static/download_links.json' {
  const downloadLinks: {
    version: string;
    releaseUrl: string;
    assets: {
      windows: string;
      macArm64: string;
      macX64: string;
      linuxDeb: string;
      linuxAppImage: string;
    };
  };

  export default downloadLinks;
}
