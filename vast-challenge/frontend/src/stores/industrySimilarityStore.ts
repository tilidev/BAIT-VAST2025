import { defineStore } from 'pinia';
import { fetchIndustryInterestAlignment } from '../services/entityService';

export const useIndustrySimilarityStore = defineStore('industrySimilarity', {
  state: () => ({
    industrySimilarityMatrix: {},
  }),
  actions: {
    async init(useWeightedMean: boolean = false) {
      try {
        const data = await fetchIndustryInterestAlignment(useWeightedMean);
        this.industrySimilarityMatrix = data;
      } catch (error) {
        console.error('Error initializing industry similarity store:', error);
      }
    },
  },
});
