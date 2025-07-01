// stores/visualizationDataStore.ts
// TODO: Refactor this naming mess and combine store functionality with the other stores
import { defineStore } from 'pinia';
import { fetchDatasetNodeCounts, fetchIndustrySentimentBreakdown } from '../services/entityService';

export const useVisualizationDataStore = defineStore('visualizationData', {
  state: () => ({
    datasetNodeCounts: [],
    isLoadingDatasetNodeCounts: false,
    errorDatasetNodeCounts: null,
    industrySentimentRawData: [],
    isLoadingIndustrySentimentRawData: false,
    errorIndustrySentimentRawData: null,
    datasetsToFetch: ['jo', 'fi', 'tr'],
  }),

  actions: {
    async init() {
      await Promise.all([
        this.loadDatasetNodeCounts(),
        this.loadIndustrySentimentRawData(),
      ]);
    },

    async loadDatasetNodeCounts() {
      this.isLoadingDatasetNodeCounts = true;
      this.errorDatasetNodeCounts = null;
      try {
        this.datasetNodeCounts = await fetchDatasetNodeCounts(this.datasetsToFetch);
      } catch (e) {
        console.error("Error loading dataset node counts:", e);
        this.errorDatasetNodeCounts = e.message || "Failed to load dataset node counts";
      } finally {
        this.isLoadingDatasetNodeCounts = false;
      }
    },

    async loadIndustrySentimentRawData() {
      this.isLoadingIndustrySentimentRawData = true;
      this.errorIndustrySentimentRawData = null;
      try {
        this.industrySentimentRawData = await fetchIndustrySentimentBreakdown();
      } catch (e) {
        console.error("Error loading industry sentiment breakdown:", e);
        this.errorIndustrySentimentRawData = e.message || "Failed to load industry sentiment breakdown";
      } finally {
        this.isLoadingIndustrySentimentRawData = false;
      }
    },
  },
});
