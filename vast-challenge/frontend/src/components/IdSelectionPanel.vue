<template>
  <div class="flex flex-col space-y-4">
    <div>
      <label for="person-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select
        Person:</label>
      <Select id="person-select" :modelValue="filterStore.selectedPersonId" @update:modelValue="updatePersonId"
        :options="personOptions" optionLabel="label" optionValue="value" placeholder="Select a Person" class="w-full" />
    </div>
    <div>
      <label for="entity-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select
        Entity:</label>
      <Select id="entity-select" :modelValue="filterStore.selectedEntityId" @update:modelValue="updateEntityId"
        :options="organizationOptions" optionLabel="label" optionValue="value" placeholder="Select an Entity"
        class="w-full" />
    </div>
    <div>
      <label for="industry-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select
        Industry:</label>
      <Select id="industry-select" :modelValue="filterStore.selectedIndustry" @update:modelValue="updateIndustry"
        :options="industryOptions" optionLabel="label" optionValue="value" placeholder="Select an Industry"
        class="w-full" />
    </div>
  </div>
</template>

<script>
import Select from 'primevue/select';
import { useFilterStore } from '../stores/filterStore';
import { useEntityStore } from '../stores/entityStore';
import { useVisualizationDataStore } from '../stores/visualizationDataStore';

export default {
  components: {
    Select,
  },
  data() {
    return {
      filterStore: useFilterStore(),
      entityStore: useEntityStore(),
      visualizationDataStore: useVisualizationDataStore()
    };
  },
  computed: {
    personOptions() {
      return this.entityStore.persons.map(person => ({
        label: person.name,
        value: person.id
      }));
    },
    organizationOptions() {
      return this.entityStore.organizations.map(org => ({
        label: org.id,
        value: org.id
      }));
    },
    industryOptions() {
      return [...new Set(this.visualizationDataStore.industrySentimentRawData.map((item) => item.industry))].map(industry => ({
        label: industry.charAt(0).toUpperCase() + industry.slice(1),
        value: industry
      }));
    }
  },
  methods: {
    updatePersonId(value) {
      this.filterStore.setPersonId(value);
    },
    updateEntityId(value) {
      this.filterStore.setEntityId(value);
    },
    updateIndustry(value) {
      this.filterStore.setIndustry(value);
    }
  },
  async mounted() {
    try {
      if (this.entityStore.persons.length === 0) {
        await this.entityStore.init();
      }
      if (this.visualizationDataStore.industrySentimentRawData.length === 0) {
        await this.visualizationDataStore.init();
      }
    } catch (error) {
      console.error("Error initializing stores in IdSelectionPanel.vue:", error);
    }
  }
};
</script>
