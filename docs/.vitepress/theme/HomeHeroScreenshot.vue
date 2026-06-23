<script setup lang="ts">
import { useData, withBase } from 'vitepress';

const { frontmatter } = useData();
const hero = frontmatter.value.hero as
  | {
      screenshot?: {
        src: string;
        alt?: string;
      };
    }
  | undefined;

const screenshot = hero?.screenshot;
const screenshotSrc = screenshot?.src ? withBase(screenshot.src) : undefined;
</script>

<template>
  <figure v-if="screenshotSrc" class="home-hero-screenshot">
    <img
      :src="screenshotSrc"
      :alt="screenshot?.alt ?? 'HarborClient screenshot'"
      width="1280"
      height="720"
      decoding="async"
      loading="eager"
    />
  </figure>
</template>
