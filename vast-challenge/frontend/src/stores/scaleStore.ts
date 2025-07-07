import { defineStore } from 'pinia';

export const useScaleStore = defineStore('scale', {
  state: () => ({
    activeDataset: 'all',
    excludeOrganizations: false,
    leftIndustry: 'large vessel',
    rightIndustry: 'tourism',
    datasets: [] as string[],
    industries: [] as string[],
  }),
  actions: {
    setDatasets(datasets: string[]) {
      this.datasets = datasets;
    },
    setIndustries(industries: string[]) {
      this.industries = industries;
    },
    setActiveDataset(dataset: string) {
      this.activeDataset = dataset;
    },
    setExcludeOrganizations(exclude: boolean) {
      this.excludeOrganizations = exclude;
    },
    setLeftIndustry(industry: string) {
      this.leftIndustry = industry;
    },
    setRightIndustry(industry: string) {
      this.rightIndustry = industry;
    },
  },
});
