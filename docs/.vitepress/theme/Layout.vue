<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HomeHeroInfo from './HomeHeroInfo.vue';
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
  </Layout>
</template>
