<template>
  <div class="space-y-4 font-sans">
    <label class="flex items-center gap-2">
      Active Dataset:
      <select
        v-model="activeDataset"
        @change="updateDataset"
        class="px-2 py-1 border rounded"
      >
        <option v-for="ds in datasets" :key="ds" :value="ds">{{ ds }}</option>
      </select>
    </label>

    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        v-model="excludeOrganizations"
        @change="updateExcludeOrganizations"
        class="mr-1"
      />
      Exclude ENTITY_ORGANIZATION
    </label>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useScaleStore } from '../stores/scaleStore';
import { storeToRefs } from 'pinia';

export default defineComponent({
  name: 'ScaleOptions',
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

    const updateExcludeOrganizations = (event) => {
      store.setExcludeOrganizations(event.target.checked);
    };

    return {
      activeDataset,
      excludeOrganizations,
      datasets,
      updateDataset,
      updateExcludeOrganizations,
    };
  },
});
</script>
