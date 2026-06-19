<script setup lang="ts">
import { useData, withBase } from 'vitepress';

const { frontmatter } = useData();
const hero = frontmatter.value.hero as
  | {
      text?: string;
      tagline?: string;
    }
  | undefined;

const logoSrc = withBase('/images/logo-white.png');
</script>

<template>
  <h1 class="heading">
    <img
      :src="logoSrc"
      alt="HarborClient"
      class="home-hero-logo"
      width="500"
      height="191"
      decoding="async"
    />
    <span v-if="hero?.text" v-html="hero.text" class="text" />
  </h1>
  <p v-if="hero?.tagline" v-html="hero.tagline" class="tagline" />
</template>
