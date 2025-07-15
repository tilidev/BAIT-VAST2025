<template>
  <div class="p-4 space-y-6 bg-gray-50 rounded-lg shadow-inner font-sans">
    <IndustrySimilarityHeatmap :width="250" :height="250" />
    <!-- Dataset Selection -->
    <div>
      <h3 class="text-sm font-semibold text-gray-600 mb-2">Active Dataset</h3>
      <div class="flex rounded-md shadow-sm">
        <label
          v-for="(ds, index) in datasets"
          :key="ds"
          :class="[
            'relative flex-1 px-4 py-2 text-sm font-medium text-center border-gray-200 cursor-pointer focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-base transition-colors duration-150',
            { 'bg-indigo-base text-white hover:bg-indigo-base/90': activeDataset === ds },
            { 'bg-white text-gray-700 hover:bg-gray-100': activeDataset !== ds },
            { 'rounded-l-md': index === 0 },
            { 'rounded-r-md': index === datasets.length - 1 },
            { 'border-r-0': index < datasets.length - 1 }
          ]"
        >
          <input
            type="radio"
            name="dataset-option"
            :value="ds"
            class="sr-only"
            :checked="activeDataset === ds"
            @change="updateDataset"
          />
          {{ ds }}
        </label>
      </div>
    </div>

    <!-- Exclude Organizations Toggle -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Filter out organizations</span>
      <button
        type="button"
        @click="toggleExcludeOrganizations"
        :class="[
          'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-base',
          excludeOrganizations ? 'bg-indigo-base' : 'bg-gray-200'
        ]"
        role="switch"
        :aria-checked="excludeOrganizations"
      >
        <span
          :class="[
            'inline-block w-5 h-5 bg-white rounded-full shadow transform ring-0 transition ease-in-out duration-200',
            excludeOrganizations ? 'translate-x-5' : 'translate-x-0'
          ]"
        ></span>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useScaleStore } from '../stores/scaleStore';
import { storeToRefs } from 'pinia';
import IndustrySimilarityHeatmap from './IndustrySimilarityHeatmap.vue';

export default defineComponent({
  name: 'ScaleOptions',
  components: {
    IndustrySimilarityHeatmap,
  },
  setup() {
    const store = useScaleStore();
    const {
      activeDataset,
      excludeOrganizations,
      datasets,
    } = storeToRefs(store);

    const updateDataset = (event) => {
      store.setActiveDataset(event.target.value);
    };

    const toggleExcludeOrganizations = () => {
      store.setExcludeOrganizations(!excludeOrganizations.value);
    };

    return {
      activeDataset,
      excludeOrganizations,
      datasets,
      updateDataset,
      toggleExcludeOrganizations,
    };
  },
});
</script>
