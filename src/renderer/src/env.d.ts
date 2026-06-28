/// <reference types="vite/client" />

declare global {
  interface Window {
    platform: NodeJS.Platform;
  }
}

export {};
