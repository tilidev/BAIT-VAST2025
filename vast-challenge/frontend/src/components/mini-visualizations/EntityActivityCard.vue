<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Entity Activity Summary</h3>
    <div v-if="!entityId" class="text-center text-gray-500">Please provide an Entity ID.</div>
    <div v-else-if="isLoading" class="text-center text-gray-500">Loading activity data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error: {{ error }}</div>
    <div v-else>
      <div v-if="entity">
        <p class="text-md font-medium text-indigo-600">{{ entityName }} ({{ entityTypeDisplay }})</p>
        <ul class="mt-2 space-y-1 text-sm text-gray-600">
          <li v-if="entityType === 'ENTITY_PERSON'">
            <span class="font-semibold">Trips Taken:</span> {{ activityData.tripsCount }}
          </li>
          <li>
            <span class="font-semibold">Meetings Attended:</span> {{ activityData.meetingsCount }}
          </li>
          <li>
            <span class="font-semibold">Plans Participated In:</span> {{ activityData.plansCount }}
          </li>
          <li>
            <span class="font-semibold">Topics Discussed/Sentiments:</span> {{ activityData.topicsCount }}
          </li>
          <!-- Add more stats as relevant for different entity types -->
        </ul>
      </div>
      <div v-else class="text-center text-gray-500">Entity not found.</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed, PropType } from 'vue';
import { useEntityStore } from '../../stores/entityStore';
import { useGraphStore } from '../../stores/graphStore';
import type { Entity, EntityTopicSentiment } from '../../types/entity'; // Corrected import
import type { Person, Organization, Meeting, Plan, Topic, Trip } from '../../types/nodeTypes'; // Specific node types
import { api as axiosInstance } from '../../lib/axios'; // Corrected import


interface IActivityData {
  tripsCount: number;
  meetingsCount: number;
  plansCount: number;
  topicsCount: number; // Number of unique topics this entity has sentiment towards
}

export default defineComponent({
  name: 'EntityActivityCard',
  props: {
    entityId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const entityStore = useEntityStore();
    const graphStore = useGraphStore(); // For topic sentiments

    const entity = computed(() => {
      // Find entity from any of the store arrays
      const person = entityStore.persons.find(p => p.id === props.entityId);
      if (person) return { ...person, type: 'ENTITY_PERSON' as Entity };
      const org = entityStore.organizations.find(o => o.id === props.entityId);
      if (org) return { ...org, type: 'ENTITY_ORGANIZATION' as Entity };
      // Add other entity types if needed for this card
      return null;
    });

    const entityType = computed(() => entity.value?.type || null);
    const entityName = computed(() => {
        if (!entity.value) return 'Unknown Entity';
        // Person has 'name', Organization might have 'name' or use 'id'
        return (entity.value as Person)?.name || (entity.value as Organization)?.id || entity.value.id;
    });
    
    const entityTypeDisplay = computed(() => {
        if (!entityType.value) return '';
        return entityType.value.replace('ENTITY_', '').charAt(0) + entityType.value.replace('ENTITY_', '').slice(1).toLowerCase();
    });


    const activityData = ref<IActivityData>({
      tripsCount: 0,
      meetingsCount: 0,
      plansCount: 0,
      topicsCount: 0,
    });

    async function fetchAndProcessActivityData() {
      if (!props.entityId) {
        isLoading.value = false;
        return;
      }
      isLoading.value = true;
      error.value = null;

      try {
        // Ensure stores are initialized (typically done by a parent or App.vue)
        if (entityStore.persons.length === 0 && entityStore.organizations.length === 0) {
          // await entityStore.init(); // Avoid re-init if managed globally
        }
        if (graphStore.sentimentPerTopic.length === 0) {
          // await graphStore.init();
        }

        let trips = 0;
        if (entityType.value === 'ENTITY_PERSON') {
          // Option 1: Use dedicated endpoint if available and more detailed
          // const response = await axiosInstance.get(`/trip-activity-by-person?person_id=${props.entityId}`);
          // trips = response.data.length; // Assuming response is an array of trips

          // Option 2: Filter from entityStore.trips (simpler if all trips are loaded)
          trips = entityStore.trips.filter(trip => trip.person_id === props.entityId).length;
        }

        const meetings = entityStore.meetings.filter(meeting => 
          meeting.participants_persons?.includes(props.entityId) || meeting.participants_orgs?.includes(props.entityId)
        ).length;

        const plans = entityStore.plans.filter(plan => 
          plan.participants_persons?.includes(props.entityId) || plan.participants_orgs?.includes(props.entityId)
        ).length;
        
        const entitySentimentData = graphStore.sentimentPerTopic.find(
            (ets: EntityTopicSentiment) => ets.entity_id === props.entityId
        );
        const topics = entitySentimentData ? entitySentimentData.topic_sentiments.length : 0;


        activityData.value = {
          tripsCount: trips,
          meetingsCount: meetings,
          plansCount: plans,
          topicsCount: topics,
        };

      } catch (e) {
        console.error(`Error fetching activity data for ${props.entityId}:`, e);
        error.value = (e as Error).message || 'Failed to load activity data.';
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(fetchAndProcessActivityData);
    watch(() => props.entityId, fetchAndProcessActivityData);
    // Watch stores if their initialization is not guaranteed before mount
    watch([() => entityStore.persons, () => graphStore.sentimentPerTopic], () => {
        if(!isLoading.value) fetchAndProcessActivityData(); // Re-process if stores update
    }, {deep: true});


    return {
      isLoading,
      error,
      entity,
      entityType,
      entityName,
      entityTypeDisplay,
      activityData,
    };
  },
});
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
