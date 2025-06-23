<template>
  <Panel header="Dynamic ID Selection" class="shadow-xl rounded-lg overflow-hidden mt-8">
    <template #header>
      <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Select Entity and Person</h2>
    </template>
    <div class="p-4 sm:p-6 flex gap-4">
      <div>
        <label for="person-dropdown" class="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-100">Select
          Person:</label>
        <Dropdown id="person-dropdown" :modelValue="selectedPersonId" @update:modelValue="updatePersonId" :options="personOptions" optionLabel="label"
          optionValue="value" placeholder="Select a Person"
          class="w-full md:w-20rem" />
      </div>
      <div>
        <label for="entity-dropdown" class="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-100">Select
          Entity:</label>
        <Dropdown id="entity-dropdown" :modelValue="selectedEntityId" @update:modelValue="updateEntityId" :options="organizationOptions"
          optionLabel="label" optionValue="value" placeholder="Select an Entity"
          class="w-full md:w-20rem" />
      </div>
    </div>
  </Panel>
</template>

<script>
import Panel from 'primevue/panel';
import Dropdown from 'primevue/dropdown';

export default {
  components: {
    Panel,
    Dropdown,
  },
  props: {
    selectedPersonId: {
      type: String,
      default: ''
    },
    selectedEntityId: {
      type: String,
      default: ''
    },
    personOptions: {
      type: Array,
      default: () => []
    },
    organizationOptions: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    updatePersonId(value) {
      this.$emit('update:selectedPersonId', value);
    },
    updateEntityId(value) {
      this.$emit('update:selectedEntityId', value);
    }
  }
};
</script>
