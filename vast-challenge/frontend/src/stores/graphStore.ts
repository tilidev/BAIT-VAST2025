// stores/entityStore.ts
import { defineStore } from 'pinia'
import { fetchGraphSkeleton, fetchSentiment } from '../services/entityService.ts'

export const useGraphStore = defineStore('graph', {
  state: (): any => {
    return {
      skeleton: [],
      sentimentPerTopic: []
    }
  },

  actions: {
    async init() {
      this.setSkeleton(await fetchGraphSkeleton())
      this.setSentimentPerTopic(await fetchSentiment())
    },
    setSkeleton(skeleton) {
      this.skeleton = skeleton
    },
    setSentimentPerTopic(entities) {
      this.sentimentPerTopic = entities
    },
  },
})
