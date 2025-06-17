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

<script>
import { useEntityStore } from '../../stores/entityStore';
import { useGraphStore } from '../../stores/graphStore';
import { api as axiosInstance } from '../../lib/axios';

export default {
  name: 'EntityActivityCard',
  props: {
    entityId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isLoading: true,
      error: null,
      entityStore: useEntityStore(),
      graphStore: useGraphStore(),
      activityData: {
        tripsCount: 0,
        meetingsCount: 0,
        plansCount: 0,
        topicsCount: 0,
      },
    };
  },
  computed: {
    entity() {
      const person = this.entityStore.persons.find(p => p.id === this.entityId);
      if (person) return { ...person, type: 'ENTITY_PERSON' };
      const org = this.entityStore.organizations.find(o => o.id === this.entityId);
      if (org) return { ...org, type: 'ENTITY_ORGANIZATION' };
      return null;
    },
    entityType() {
      return this.entity?.type || null;
    },
    entityName() {
      if (!this.entity) return 'Unknown Entity';
      return this.entity.name || this.entity.id;
    },
    entityTypeDisplay() {
      if (!this.entityType) return '';
      return this.entityType.replace('ENTITY_', '').charAt(0) + this.entityType.replace('ENTITY_', '').slice(1).toLowerCase();
    },
  },
  methods: {
    async fetchAndProcessActivityData() {
      if (!this.entityId) {
        this.isLoading = false;
        return;
      }
      this.isLoading = true;
      this.error = null;

      try {
        if (this.entityStore.persons.length === 0 && this.entityStore.organizations.length === 0) {
          // await this.entityStore.init();
        }
        if (this.graphStore.sentimentPerTopic.length === 0) {
          // await this.graphStore.init();
        }

        let trips = 0;
        if (this.entityType === 'ENTITY_PERSON') {
          trips = this.entityStore.trips.filter(trip => trip.person_id === this.entityId).length;
        }

        const meetings = this.entityStore.meetings.filter(meeting =>
          meeting.participants_persons?.includes(this.entityId) || meeting.participants_orgs?.includes(this.entityId)
        ).length;

        const plans = this.entityStore.plans.filter(plan =>
          plan.participants_persons?.includes(this.entityId) || plan.participants_orgs?.includes(this.entityId)
        ).length;
        
        const entitySentimentData = this.graphStore.sentimentPerTopic.find(
            (ets) => ets.entity_id === this.entityId
        );
        const topics = entitySentimentData ? entitySentimentData.topic_sentiments.length : 0;

        this.activityData = {
          tripsCount: trips,
          meetingsCount: meetings,
          plansCount: plans,
          topicsCount: topics,
        };

      } catch (e) {
        console.error(`Error fetching activity data for ${this.entityId}:`, e);
        this.error = e.message || 'Failed to load activity data.';
      } finally {
        this.isLoading = false;
      }
    },
  },
  mounted() {
    this.fetchAndProcessActivityData();
  },
  watch: {
    entityId: {
      handler: 'fetchAndProcessActivityData',
      immediate: true, // Fetch data immediately when component mounts or entityId changes
    },
    // Watch stores if their initialization is not guaranteed before mount
    'entityStore.persons': {
      handler() {
        // Re-process if stores update and not currently loading (to avoid re-fetching during initial load)
        if(!this.isLoading) this.fetchAndProcessActivityData();
      },
      deep: true,
    },
    'graphStore.sentimentPerTopic': {
      handler() {
        // Re-process if stores update and not currently loading
        if(!this.isLoading) this.fetchAndProcessActivityData();
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
