<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Main App</h1>
    <ExampleComponent />
    <hr class="my-4" />
    <h2 class="text-xl font-semibold mb-2">Router View:</h2>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ExampleComponent from './components/ExampleComponent.vue';
</script>

<style>
/* Add global styles if needed, or ensure Tailwind base styles are included in main.ts/style.css */
</style>
