import { create } from 'zustand';

interface GraphData {
  nodes: any[];
  edges: any[];
}

interface GraphStore {
  graph: GraphData | null;
  setGraph: (graph: GraphData) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  graph: null,
  setGraph: (graph) => set({ graph }),
}));

