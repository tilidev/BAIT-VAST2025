import { defineStore } from 'pinia';
import type { MatrixCell } from '../types/matrixTypes';

export const FilterType = {
  ISLAND: 'island',
  ZONE: 'zone',
  IN_GRAPH: 'in_graph',
  PLACE: 'place',
  PERSON: 'person',
  TOPIC: 'topic',
  INDUSTRY: 'industry',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];

export interface Filter {
  type: FilterType;
  value: string;
}

export const HighlightType = {
  PLACE: 'place',
  TRIP: 'trip',
  PERSON: 'person',
  TOPIC: 'topic',
  INDUSTRY: 'industry',
  CELL: 'cell',
  PLAN: 'plan',
} as const;

export type HighlightType = typeof HighlightType[keyof typeof HighlightType];

export interface Highlight {
  type: HighlightType;
  value: string | MatrixCell;
}

interface LinkingState {
  activeFilters: Filter[];
  excludedFilters: Filter[];
  hoverHighlights: Highlight[];
  selectedEntityId: string;
}

export const useLinkingStore = defineStore('linking', {
  state: (): LinkingState => ({
    activeFilters: [],
    excludedFilters: [],
    hoverHighlights: [],
    selectedEntityId: '',
  }),
  getters: {
    highlightedPeople(state): string[] {
      return state.activeFilters.filter(f => f.type === 'person').map(f => f.value);
    },
    highlightedTopics(state): string[] {
      return state.activeFilters.filter(f => f.type === 'topic').map(f => f.value);
    },
    selectedIndustries(state): string[] {
      return state.activeFilters.filter(f => f.type === 'industry').map(f => f.value);
    },
    selectedPerson(state): string {
      const person = state.activeFilters.find(f => f.type === 'person');
      return person ? person.value : '';
    },
    selectedTopic(state): string {
      const topic = state.activeFilters.find(f => f.type === 'topic');
      return topic ? topic.value : '';
    },
    selectedOrganization(state): string {
      const org = state.activeFilters.find(f => f.type === 'industry');
      return org ? org.value : '';
    },
    selectedIndustry(state): string {
      const industry = state.activeFilters.find(f => f.type === 'industry');
      return industry ? industry.value : '';
    },
    selectedInGraphs(state): string[] {
      return state.activeFilters.filter(f => f.type === FilterType.IN_GRAPH).map(f => f.value);
    },
  },
  actions: {
    setPersonId(personId: string) {
      this.activeFilters = this.activeFilters.filter(f => f.type !== 'person');
      if (personId) {
        this.activeFilters.push({ type: 'person', value: personId });
      }
    },
    setTopicId(topicId: string) {
      this.activeFilters = this.activeFilters.filter(f => f.type !== 'topic');
      if (topicId) {
        this.activeFilters.push({ type: 'topic', value: topicId });
      }
    },
    setOrganizationId(organizationId: string) {
      this.activeFilters = this.activeFilters.filter(f => f.type !== 'industry');
      if (organizationId) {
        this.activeFilters.push({ type: 'industry', value: organizationId });
      }
    },
    setIndustry(industry: string) {
      this.activeFilters = this.activeFilters.filter(f => f.type !== 'industry');
      if (industry) {
        this.activeFilters.push({ type: 'industry', value: industry });
      }
    },
    toggleFilter(newFilter: Filter) {
      const index = this.activeFilters.findIndex(
        (f) => f.type === newFilter.type && f.value === newFilter.value
      );
      if (index === -1) {
        this.activeFilters.push(newFilter);
      } else {
        this.activeFilters.splice(index, 1);
      }
    },
    toggleExcludeFilter(newFilter: Filter) {
      const index = this.excludedFilters.findIndex(
        (f) => f.type === newFilter.type && f.value === newFilter.value
      );
      if (index === -1) {
        this.excludedFilters.push(newFilter);
      } else {
        this.excludedFilters.splice(index, 1);
      }
    },
    setFilters(type: FilterType, values: string[]) {
      this.activeFilters = this.activeFilters.filter(f => f.type !== type);
      values.forEach(value => {
        this.activeFilters.push({ type, value });
      });
    },
    setHoverHighlights(highlights: Highlight[]) {
      this.hoverHighlights = highlights;
    },
    addHoverHighlight(highlight: Highlight) {
      if (!this.hoverHighlights.some(h => h.type === highlight.type && h.value === highlight.value)) {
        this.hoverHighlights.push(highlight);
      }
    },
    removeHoverHighlight(highlight: Highlight) {
      const index = this.hoverHighlights.findIndex(h => h.type === highlight.type && h.value === highlight.value);
      if (index > -1) {
        this.hoverHighlights.splice(index, 1);
      }
    },
    setEntityId(id: string) {
      this.selectedEntityId = id;
    },
    clearAllFilters() {
      this.activeFilters = [];
      this.excludedFilters = [];
      this.hoverHighlights = [];
      this.selectedEntityId = '';
    },
  },
});
