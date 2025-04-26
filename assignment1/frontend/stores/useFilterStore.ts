import { create } from "zustand";

interface Filters {
  country: string[];
  continent: string[];
  region: string[];
  city: string[];
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
      },
    }),
}));
