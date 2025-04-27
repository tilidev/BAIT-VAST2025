import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type EdgeColorAttribute = 'none' | 'national' | 'international' | 'intercontinental'; // Export type - Added 'national'
export type NodeColorAttribute = 'region' | 'continent'; // Export type // Reduced node coloring options

// Define the state structure
export interface HighlightState { // Export interface
  colorAttribute: NodeColorAttribute | null; // Attribute used for node coloring (updated type)
  edgeColorAttribute: EdgeColorAttribute; // **NEW**: Attribute used for edge coloring
  sizeByDegree: boolean; // Whether to size nodes by degree
  hoveredNodeId: string | null; // ID of the node currently hovered
  hoveredNodeData: Record<string, any> | null; // Attributes of the hovered node
  highlightedNodes: Set<string>; // IDs of nodes to highlight (hovered + neighbors)
  highlightedEdges: Set<string>; // IDs of edges to highlight (connected to hovered)
}

// Define the actions
export interface HighlightActions { // Export interface
  setColorAttribute: (attribute: NodeColorAttribute | null) => void; // Updated type
  setEdgeColorAttribute: (attribute: EdgeColorAttribute) => void; // **NEW**
  setSizeByDegree: (enabled: boolean) => void;
  setHighlight: (
    nodeId: string | null,
    data: Record<string, any> | null,
    nodesToHighlight: Set<string>,
    edgesToHighlight: Set<string>
  ) => void;
  clearHighlight: () => void;
}

// Initial state values
const initialState: HighlightState = {
  colorAttribute: null,
  edgeColorAttribute: 'none', // **NEW**: Default to 'none'
  sizeByDegree: true,
  hoveredNodeId: null,
  hoveredNodeData: null,
  highlightedNodes: new Set(),
  highlightedEdges: new Set(),
};

export const useHighlightStore = create<HighlightState & HighlightActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setColorAttribute: (attribute) => set({ colorAttribute: attribute }),

      setEdgeColorAttribute: (attribute) => set({ edgeColorAttribute: attribute }), // **NEW**

      setSizeByDegree: (enabled) => set({ sizeByDegree: enabled }),

      setHighlight: (nodeId, data, nodesToHighlight, edgesToHighlight) =>
        set({
          hoveredNodeId: nodeId,
          hoveredNodeData: data,
          highlightedNodes: nodesToHighlight,
          highlightedEdges: edgesToHighlight,
        }),

      clearHighlight: () =>
        set({
          hoveredNodeId: null,
          hoveredNodeData: null,
          highlightedNodes: new Set(),
          highlightedEdges: new Set(),
        }),
    }),
    { name: 'HighlightStore' } // Name for Redux DevTools extension
  )
);
