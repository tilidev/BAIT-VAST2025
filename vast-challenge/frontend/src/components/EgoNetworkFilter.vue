<template>
  <div class="p-4 space-y-6 bg-gray-50 rounded-lg shadow-inner font-sans">
    <div>
      <h3 class="text-sm font-semibold text-gray-600 mb-2">Ego Network Node</h3>
      <div class="flex rounded-md shadow-sm mb-4">
        <label
          v-for="(type, index) in typeOptions"
          :key="type.value"
          :class="[
            'relative flex-1 px-4 py-2 text-sm font-medium text-center border-gray-200 cursor-pointer focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-base transition-colors duration-150',
            { 'bg-indigo-base text-white hover:bg-indigo-base/90': selectedType === type.value },
            { 'bg-white text-gray-700 hover:bg-gray-100': selectedType !== type.value },
            { 'rounded-l-md': index === 0 },
            { 'rounded-r-md': index === typeOptions.length - 1 },
            { 'border-r-0': index < typeOptions.length - 1 }
          ]"
        >
          <input
            type="radio"
            name="node-type-option"
            :value="type.value"
            class="sr-only"
            :checked="selectedType === type.value"
            @change="updateSelectedType(type.value)"
          />
          {{ type.label }}
        </label>
      </div>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="node in nodeOptions"
          :key="node.value"
          :class="[
            'px-3 py-1 text-sm font-medium rounded-full cursor-pointer transition-colors duration-150',
            { 'bg-indigo-base text-white hover:bg-indigo-base/90': selectedNode === node.value },
            { 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300': selectedNode !== node.value }
          ]"
        >
          <input
            type="radio"
            name="node-option"
            :value="node.value"
            class="sr-only"
            :checked="selectedNode === node.value"
            @change="updateSelectedNode(node.value)"
          />
          {{ node.label }}
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { useEntityStore } from '../stores/entityStore';
import { useLinkingStore } from '../stores/linkingStore';
import { ref, computed, watch } from 'vue';

export default {
  name: 'EgoNetworkFilter',
  setup() {
    const entityStore = useEntityStore();
    const linkingStore = useLinkingStore();

    const selectedType = ref('ENTITY_PERSON');

    const typeOptions = [
      { label: 'Person', value: 'ENTITY_PERSON' },
      { label: 'Topic', value: 'TOPIC' },
    ];

    const formatLabel = (id) => {
      if (!id) return '';
      return id.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const nodeOptions = computed(() => {
      const options = selectedType.value === 'TOPIC' 
        ? entityStore.topics 
        : entityStore.persons;
      return options.map(item => ({ label: formatLabel(item.id), value: item.id }));
    });

    const selectedNode = computed(() => {
      if (selectedType.value === 'TOPIC') {
        return linkingStore.selectedTopic;
      }
      return linkingStore.selectedPerson;
    });

    const updateSelectedType = (type) => {
      selectedType.value = type;
      if (type === 'TOPIC') {
        linkingStore.setPersonId('');
      } else {
        linkingStore.setTopicId('');
      }
    };

    const updateSelectedNode = (nodeId) => {
      if (selectedType.value === 'TOPIC') {
        linkingStore.setTopicId(nodeId);
      } else {
        linkingStore.setPersonId(nodeId);
      }
    };
    
    watch(selectedType, () => {
        updateSelectedNode('')
    })

    return {
      selectedType,
      typeOptions,
      nodeOptions,
      selectedNode,
      updateSelectedType,
      updateSelectedNode,
    };
  },
};
</script>
