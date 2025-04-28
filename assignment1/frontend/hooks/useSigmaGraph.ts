import { useEffect, useRef, useState } from "react";
import { useGraphStore } from "@/stores/useGraphStore";
import { useHighlightStore } from "@/stores/useHighlightStore"; // Import highlight store
import Sigma from "sigma"; // Import Sigma type if needed elsewhere
import Graph from "graphology"; // Import Graph type

// Helper function for color generation (simple example)
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Define default colors and highlight colors
const DEFAULT_NODE_COLOR = "#e22352";
const DEFAULT_EDGE_COLOR = "#ffaeaf";
const HIDDEN_NODE_COLOR = "#e5e7eb"; // Lighter grey for dimmed nodes
const HIDDEN_EDGE_COLOR = "#f3f4f6"; // Very light grey for dimmed/hidden edges
const DEFAULT_NODE_SIZE = 5;
const NATIONAL_EDGE_COLOR = "#f59e0b"; // Amber/Orange
const INTERNATIONAL_EDGE_COLOR = "#3b82f6"; // Blue
const INTERCONTINENTAL_EDGE_COLOR = "#10b981"; // Green

export const useSigmaGraph = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { graph } = useGraphStore();
  // Get state and actions from highlight store
  const {
    colorAttribute,
    edgeColorAttribute, // Get edge coloring state
    sizeByDegree,
    highlightedNodes,
    highlightedEdges,
    setHighlight,
    clearHighlight,
  } = useHighlightStore();

  const rendererRef = useRef<Sigma | null>(null); // Use Sigma type
  const graphRef = useRef<Graph | null>(null); // Ref to store the graphology instance
  const [colorMap, setColorMap] = useState<Record<string, string>>({}); // Map attribute values to colors

  useEffect(() => {
    // Build color map when colorAttribute or graph changes
    if (graph && colorAttribute) {
      const newColorMap: Record<string, string> = {};
      graph.nodes.forEach(node => {
        const value = node.attributes?.[colorAttribute];
        if (value && typeof value === 'string' && !newColorMap[value]) {
          newColorMap[value] = stringToColor(value);
        }
      });
      setColorMap(newColorMap);
    } else {
      setColorMap({}); // Clear map if no attribute selected
    }
  }, [graph, colorAttribute]);


  useEffect(() => {
    let sigmaInstance: Sigma | null = null;
    let graphInstance: Graph | null = null;

    const initSigma = async () => {
      if (!containerRef.current || !graph) return;

      // --- Ensure container is ready ---
      // Clear previous contents if necessary (Sigma usually handles this)
      // containerRef.current.innerHTML = "";

      // --- Dynamically import Sigma, Graphology, and Leaflet Layer ---
      const [{ default: Sigma }, { default: Graphology }, leafletLayer] = await Promise.all([
        import("sigma"),
        import("graphology"),
        import("@sigma/layer-leaflet"), // Re-add leaflet import
      ]);
      const bindLeafletLayer = leafletLayer.default; // Get the binding function

      // --- Process Graph Data ---
      // Ensure all nodes have x, y, lat, lon coordinates
      const processedNodes = graph.nodes.map(node => ({
        key: node.key, // Ensure key is explicitly passed
        attributes: {
          ...node.attributes,
          // Assign random screen coordinates if x or y are missing/invalid
          x: typeof node.attributes?.x === 'number' ? node.attributes.x : Math.random() * 1000,
          y: typeof node.attributes?.y === 'number' ? node.attributes.y : Math.random() * 1000,
          // Ensure lat/lon exist for Leaflet, provide defaults if necessary
          // Note: Defaulting lat/lon might place nodes incorrectly on the map if data is missing.
          // Consider how missing geo-coordinates should be handled.
          lat: typeof node.attributes?.lat === 'number' ? node.attributes.lat : 0, // Default to 0,0 if missing
          lon: typeof node.attributes?.lon === 'number' ? node.attributes.lon : 0,
        }
      }));

      const processedEdges = graph.edges.map(edge => ({
        ...edge, // Pass edge data (source, target, key, etc.)
        attributes: {
          ...(edge.attributes || {}), // Spread edge attributes if they exist
        }
      }));

      // Construct the object expected by Graphology.from()
      const graphDataForGraphology = {
        attributes: {}, // Add required top-level attributes
        options: { type: 'undirected' as const, multi: true, allowSelfLoops: true }, // Explicitly cast type to literal
        nodes: processedNodes,
        edges: processedEdges,
      };

      graphInstance = Graphology.from(graphDataForGraphology); // Pass the correctly structured object
      graphRef.current = graphInstance; // Store instance

      // --- Kill previous Sigma instance ---
      rendererRef.current?.kill();

      // --- Create new Sigma instance with reducers ---
      sigmaInstance = new Sigma(graphInstance, containerRef.current!, {
        allowInvalidContainer: true, // Useful if container visibility changes
        defaultNodeColor: DEFAULT_NODE_COLOR,
        defaultEdgeColor: DEFAULT_EDGE_COLOR,
        minEdgeThickness: 0.5, // Slightly thinner default
        edgeReducer: (edge, attributes) => {
          const state = useHighlightStore.getState(); // Get latest state
          const graph = graphRef.current; // Access graph instance
          const newState = { ...attributes };

          let edgeTypeColor = DEFAULT_EDGE_COLOR; // Start with default

          // 1. Determine base color based on edge type (if selected and graph exists)
          if (graph && state.edgeColorAttribute !== 'none') {
            try {
              const source = graph.source(edge);
              const target = graph.target(edge);
              const sourceAttrs = graph.getNodeAttributes(source);
              const targetAttrs = graph.getNodeAttributes(target);

              if (sourceAttrs && targetAttrs) {
                if (state.edgeColorAttribute === 'national') {
                  if (sourceAttrs.country && targetAttrs.country && sourceAttrs.country === targetAttrs.country) {
                    edgeTypeColor = NATIONAL_EDGE_COLOR;
                  }
                } else if (state.edgeColorAttribute === 'international') {
                  // Ensure it's not also national
                  if (sourceAttrs.country && targetAttrs.country && sourceAttrs.country !== targetAttrs.country) {
                    edgeTypeColor = INTERNATIONAL_EDGE_COLOR;
                  }
                } else if (state.edgeColorAttribute === 'intercontinental') {
                   // Ensure it's not also national or international within same continent
                  if (sourceAttrs.continent && targetAttrs.continent && sourceAttrs.continent !== targetAttrs.continent) {
                    edgeTypeColor = INTERCONTINENTAL_EDGE_COLOR;
                  }
                }
              }
            } catch (e) {
              // console.error(`Error getting attributes for edge ${edge}:`, e); // Optional logging
              edgeTypeColor = DEFAULT_EDGE_COLOR; // Fallback on error
            }
          }

          // 2. Apply hover highlighting/dimming logic
          if (state.highlightedNodes.size > 0) {
            if (state.highlightedEdges.has(edge)) {
              newState.color = edgeTypeColor; // Use the type-based color
              newState.zIndex = 1;
              newState.hidden = false;
            } else {
              // Keep color for potential un-dimming, but hide
              newState.color = HIDDEN_EDGE_COLOR; // Use hidden color
              newState.zIndex = 0;
              newState.hidden = true; // Hide non-highlighted edges
            }
          } else {
            // Reset to type-based color if no highlight
            newState.color = edgeTypeColor;
            newState.zIndex = 0;
            newState.hidden = false;
          }
          return newState;
        },
        nodeReducer: (node, attributes) => {
          const state = useHighlightStore.getState(); // Get latest state
          const graph = graphRef.current; // Access graph instance
          const nodeAttributes = graph?.getNodeAttributes(node) || {};
          const newState = { ...attributes };

          // Highlighting
          if (state.highlightedNodes.size > 0) {
            if (state.highlightedNodes.has(node)) {
              newState.zIndex = 1;
              newState.hidden = false;
            } else {
              newState.color = HIDDEN_NODE_COLOR; // Dim non-highlighted nodes
              newState.zIndex = 0;
              newState.hidden = false; // Keep dimmed nodes visible
            }
          } else {
            // Reset zIndex if no highlight
            newState.zIndex = 0;
            newState.hidden = false;
          }

          // Color Encoding (only if not dimmed by highlighting)
          if (newState.zIndex === 1 || state.highlightedNodes.size === 0) {
            if (state.colorAttribute && nodeAttributes[state.colorAttribute]) {
              const value = nodeAttributes[state.colorAttribute];
              newState.color = colorMap[value] || DEFAULT_NODE_COLOR; // Use mapped color or default
            } else {
              newState.color = DEFAULT_NODE_COLOR; // Default color
            }
          }

          // Size Encoding
          if (state.sizeByDegree && graph) {
            const degree = graph.degree(node);
            // Adjust sizing formula if needed
            newState.size = Math.max(1, Math.pow(degree, 1/3)) + DEFAULT_NODE_SIZE / 2;
          } else {
            newState.size = DEFAULT_NODE_SIZE; // Default size
          }

          return newState;
        },
      });

      // --- Event Listeners ---
      sigmaInstance.on("enterNode", (event) => {
        const graph = graphRef.current;
        if (!graph) return;
        const nodeId = event.node;
        const nodeAttributes = graph.getNodeAttributes(nodeId);
        const neighbors = new Set(graph.neighbors(nodeId));
        const nodesToHighlight = new Set(neighbors).add(nodeId);
        const edgesToHighlight = new Set<string>();
        graph.forEachEdge(nodeId, (edge, _edgeAttributes, _source, _target, sourceAttributes, targetAttributes) => {
            if (nodesToHighlight.has(sourceAttributes.id) && nodesToHighlight.has(targetAttributes.id)) {
                edgesToHighlight.add(edge);
            }
        });


        setHighlight(nodeId, nodeAttributes, nodesToHighlight, edgesToHighlight);
      });

      sigmaInstance.on("leaveNode", () => {
        clearHighlight();
      });

      // --- Camera Reset & Leaflet Binding ---
      sigmaInstance.getCamera().animatedReset(); // Reset camera view
      bindLeafletLayer(sigmaInstance, { // Bind the leaflet layer
        getNodeLatLng: (attrs: any) => ({ lat: attrs.lat, lng: attrs.lon }), // Use lon for lng
      });

      rendererRef.current = sigmaInstance;
    }

    initSigma();

    // --- Cleanup ---
    return () => {
      sigmaInstance?.kill(); // Use the local instance variable
      rendererRef.current = null;
      graphRef.current = null;
    };
  // Add store state/actions and colorMap to dependencies
  }, [graph, containerRef, colorAttribute, edgeColorAttribute, sizeByDegree, setHighlight, clearHighlight, colorMap]); // Add edgeColorAttribute
};
