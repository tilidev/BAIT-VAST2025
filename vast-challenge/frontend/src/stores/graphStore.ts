// stores/entityStore.ts
import { defineStore } from 'pinia'
import { fetchGraphSkeleton, fetchSentiment } from '../services/entityService.ts'
import type { EntityTopicSentiment } from '../types/entity.ts'

export const useGraphStore = defineStore('graph', {
  state: () => {
    return {
      skeleton: [] as any[],
      sentimentPerTopic: [] as EntityTopicSentiment[]
    }
  },

  actions: {
    async init() {
      this.setSkeleton(await fetchGraphSkeleton())
      this.setSentimentPerTopic(await fetchSentiment())
    },
    setSkeleton(skeleton: any) {
      this.skeleton = skeleton
    },
    setSentimentPerTopic(entities: EntityTopicSentiment[]) {
      // Sort entities by entity_type first, then by entity_id for consistent ordering
      const sortedEntities = [...entities].sort((a, b) => {
        const typeComparison = a.entity_type.localeCompare(b.entity_type);
        if (typeComparison !== 0) return typeComparison;
        return a.entity_id.localeCompare(b.entity_id);
      });
      this.sentimentPerTopic = sortedEntities;
    },
  },
})
