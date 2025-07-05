import { defineStore } from 'pinia';
import type { MatrixCell } from '../types/matrixTypes';

interface LinkingState {
  activeFilters: any[];
  excludedFilters: any[];
  hoveredFilters: any[];
  highlightedPlaceIds: string[];
  brushedPlaces: string[];
  highlightedTrips: string[];
  hoveredPlaceId: string | null;
  hoveredCell: MatrixCell | null;
  highlightedPeople: string[];
  highlightedTopics: string[];
  selectedEntityId: string;
  selectedIndustry: string;
}

export const useLinkingStore = defineStore('linking', {
  state: (): LinkingState => ({
    activeFilters: [], // Stores filter options as objects { type: 'island' | 'zone' | 'in_graph', value: string }
    excludedFilters: [], // Stores filter options as objects { type: 'island' | 'zone' | 'in_graph', value: string }
    hoveredFilters: [], // Stores filter options for previewing
    highlightedPlaceIds: [], // Stores place IDs for cross-component highlighting
    brushedPlaces: [], // Stores place names selected by the brush tool
    highlightedTrips: [], // Stores trip IDs for cross-component highlighting
    hoveredPlaceId: null, // Stores the ID of the hovered place on the map
    hoveredCell: null, // Stores the currently hovered cell in a matrix { rowId, colId }
    highlightedPeople: [], // Stores IDs of highlighted people
    highlightedTopics: [], // Stores IDs of highlighted topics
    selectedEntityId: '',
    selectedIndustry: ''
  }),
  actions: {
    setBrushedPlaces(places: string[]) {
      this.brushedPlaces = places;
    },
    toggleFilter(newFilter: any) {
      const index = this.activeFilters.findIndex(
        (f) => f.type === newFilter.type && f.value === newFilter.value
      );
      if (index === -1) {
        this.activeFilters.push(newFilter);
      } else {
        this.activeFilters.splice(index, 1);
      }
    },
    toggleExcludeFilter(newFilter: any) {
      const index = this.excludedFilters.findIndex(
        (f) => f.type === newFilter.type && f.value === newFilter.value
      );
      if (index === -1) {
        this.excludedFilters.push(newFilter);
      } else {
        this.excludedFilters.splice(index, 1);
      }
    },
    setHighlightedPlaceIds(placeIds: string[]) {
      this.highlightedPlaceIds = placeIds;
    },
    setHoveredFilters(filters: any[]) {
      this.hoveredFilters = filters;
    },
    setHighlightedTrips(tripIds: string[]) {
      this.highlightedTrips = tripIds;
    },
    setHoveredPlaceId(placeId: string | null) {
      this.hoveredPlaceId = placeId;
    },
    setHoveredCell(cell: MatrixCell | null) {
      this.hoveredCell = cell;
    },
    togglePersonHighlight(personId: string) {
      const index = this.highlightedPeople.indexOf(personId);
      if (index > -1) {
        this.highlightedPeople.splice(index, 1);
      } else {
        this.highlightedPeople.push(personId);
      }
    },
    toggleTopicHighlight(topicId: string) {
      const index = this.highlightedTopics.indexOf(topicId);
      if (index > -1) {
        this.highlightedTopics.splice(index, 1);
      } else {
        this.highlightedTopics.push(topicId);
      }
    },
    setEntityId(id: string) {
      this.selectedEntityId = id;
    },
    setIndustry(industry: string) {
      this.selectedIndustry = industry;
    },
    setPersonId(id: string) {
      if (!this.highlightedPeople.includes(id)) {
        this.highlightedPeople = [id];
      }
    },
    clearAllFilters() {
      this.activeFilters = [];
      this.excludedFilters = [];
      this.brushedPlaces = [];
      this.highlightedPeople = [];
      this.highlightedTopics = [];
      this.selectedEntityId = '';
      this.selectedIndustry = '';
    },
  },
});
