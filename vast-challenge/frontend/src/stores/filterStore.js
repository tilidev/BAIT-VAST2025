import { defineStore } from 'pinia';

export const useFilterStore = defineStore('filter', {
  state: () => ({
    selectedPersonId: '',
    selectedEntityId: '',
    selectedIndustry: ''
  }),
  actions: {
    setPersonId(id) {
      this.selectedPersonId = id;
    },
    setEntityId(id) {
      this.selectedEntityId = id;
    },
    setIndustry(industry) {
      this.selectedIndustry = industry;
    }
  }
});
