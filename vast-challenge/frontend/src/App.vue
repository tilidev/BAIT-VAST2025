<template>
  <div> <!--
    class="min-h-screen bg-gradient-to-br from-teal-100 via-sky-100 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-neutral-900 p-4 sm:p-8 transition-colors duration-300">
    -->

    <div class="container mx-auto">
      <div class="flex justify-end mb-4">
        <ThemeSwitcher />
      </div>
      <Card class="shadow-xl rounded-lg overflow-hidden">
        <template #title>
          <h1 class="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 py-4">Main Application</h1>
        </template>
        <template #content>
          <div class="p-4 sm:p-6">
            <ExampleComponent />
          </div>
          <!-- <GeoJsonMap></GeoJsonMap> -->
          <!-- <EntityComponent></EntityComponent> -->
          <GraphView></GraphView>
          <IndustrySimilarityHeatmap></IndustrySimilarityHeatmap>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import ExampleComponent from './components/ExampleComponent.vue';
import Card from 'primevue/card'; // Import PrimeVue Card
import ThemeSwitcher from './components/ThemeSwitcher.vue'; // Import the new component
import GeoJsonMap from './components/GeoJsonMap.vue';
import EntityComponent from './components/EntityComponent.vue';
import GraphView from './components/GraphView.vue';
import IndustrySimilarityHeatmap from './components/IndustrySimilarityHeatmap.vue';
</script>

<style>
/* Add global styles if needed, or ensure Tailwind base styles are included in main.ts/style.css */
</style>
