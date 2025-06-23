<template>
  <div class="flex flex-col space-y-4">
    <div>
      <label for="person-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select
        Person:</label>
      <Select id="person-select" :modelValue="selectedPersonId" @update:modelValue="updatePersonId"
        :options="personOptions" optionLabel="label" optionValue="value" placeholder="Select a Person" class="w-full" />
    </div>
    <div>
      <label for="entity-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select
        Entity:</label>
      <Select id="entity-select" :modelValue="selectedEntityId" @update:modelValue="updateEntityId"
        :options="organizationOptions" optionLabel="label" optionValue="value" placeholder="Select an Entity"
        class="w-full" />
    </div>
    <div>
      <label for="industry-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select
        Industry:</label>
      <Select id="industry-select" :modelValue="selectedIndustry" @update:modelValue="updateIndustry"
        :options="industryOptions" optionLabel="label" optionValue="value" placeholder="Select an Industry"
        class="w-full" />
    </div>
  </div>
</template>

<script>
import Select from 'primevue/select';

export default {
  components: {
    Select,
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
    },
    industryOptions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedIndustry: ''
    };
  },
  methods: {
    updatePersonId(value) {
      this.$emit('update:selectedPersonId', value);
    },
    updateEntityId(value) {
      this.$emit('update:selectedEntityId', value);
    },
    updateIndustry(value) {
      this.$emit('update:selectedIndustry', value);
    }
  }
};
</script>
