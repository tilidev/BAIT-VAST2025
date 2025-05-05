<template>
  <div class="p-4 border rounded shadow-md bg-gray-100">
    <h2 class="text-xl font-semibold mb-2">{{ message }}</h2>
    <p>This is an example component using the Options API.</p>
    <button
      @click="incrementCounter"
      class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Click Count: {{ counter }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ExampleComponent',
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
