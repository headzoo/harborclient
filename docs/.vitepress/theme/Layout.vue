<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HomeHeroInfo from './HomeHeroInfo.vue';
import HomeScreenshot from './HomeScreenshot.vue';
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
    <template #home-features-before>
      <HomeScreenshot />
    </template>
  </Layout>
</template>
