import { defineStore } from 'pinia';
import { fetchIndustryInterestAlignment } from '../services/entityService';

export const useIndustrySimilarityStore = defineStore('industrySimilarity', {
  state: () => ({
    industrySimilarityMatrix: {},
  }),
  actions: {
    async init() {
      this.setIndustrySimilarityMatrix(await fetchIndustryInterestAlignment());
    },
    setIndustrySimilarityMatrix(matrix: any) {
      this.industrySimilarityMatrix = matrix;
    },
  },
});
