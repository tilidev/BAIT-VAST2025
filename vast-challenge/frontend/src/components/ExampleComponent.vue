<template>
  <div class="p-4"> 
    <h2 class="text-2xl font-semibold mb-3 text-gray-700 dark:text-gray-200">{{ message }}</h2>
    <p class="text-gray-600 dark:text-gray-400 mb-4">moin moin moin moin</p>
    <Button
      @click="incrementCounter"
      :label="`Click Count: ${counter}`"
      severity="info"
      class="mt-2"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Button from 'primevue/button'; // Import PrimeVue Button

export default defineComponent({
  name: 'ExampleComponent',
  components: { // Register the Button component
    Button,
  },
  data() {
    return {
      message: 'Hello from ExampleComponent!',
      counter: 0,
    };
  },
  methods: {
    incrementCounter() {
      this.counter++;
    },
  },
  mounted() {
    console.log('ExampleComponent mounted!');
  },
});
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
