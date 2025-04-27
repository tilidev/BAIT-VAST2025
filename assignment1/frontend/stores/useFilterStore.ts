import { create } from "zustand";

interface Filters {
  country: string[];
  continent: string[];
  region: string[];
  city: string[];
  minDegree?: number | null;
  maxDegree?: number | null;
  minRunways?: number | null;
  maxRunways?: number | null;
  topN?: number | null;
}

interface FilterStore {
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: {
    country: [],
    continent: [],
    region: [],
    city: [],
    minDegree: null,
    maxDegree: null,
    minRunways: null,
    maxRunways: null,
    topN: null,
  },
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () =>
    set({
      filters: {
        country: [],
        continent: [],
        region: [],
        city: [],
        minDegree: null,
        maxDegree: null,
        minRunways: null,
        maxRunways: null,
        topN: null,
      },
    }),
}));
