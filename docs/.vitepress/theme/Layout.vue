<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HomeHeroInfo from './HomeHeroInfo.vue';
import HomeHeroScreenshot from './HomeHeroScreenshot.vue';
import SidebarBrand from './SidebarBrand.vue';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #sidebar-nav-before>
      <SidebarBrand />
    </template>
    <template #home-hero-info>
      <HomeHeroInfo />
    </template>
    <template #home-hero-actions-after>
      <HomeHeroScreenshot />
    </template>
  </Layout>
</template>
