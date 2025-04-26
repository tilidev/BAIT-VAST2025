// This automatically re-renders Sigma when graph changes
//
import { useEffect, useRef } from "react";
import { useGraphStore } from "@/stores/useGraphStore";

export const useSigmaGraph = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { graph } = useGraphStore();
  const rendererRef = useRef<any>(null);

  useEffect(() => {
    const initSigma = async () => {
      if (!containerRef.current || !graph) return;

      // Clear previous contents
      containerRef.current.innerHTML = "";

      const [{ default: Sigma }, GraphModule, leafletLayer] = await Promise.all([
        import("sigma"),
        import("graphology"),
        import("@sigma/layer-leaflet"),
      ]);
      const Graph = (GraphModule as any).default || GraphModule;
      const bindLeafletLayer = leafletLayer.default;

      // Ensure all nodes have x and y coordinates for Sigma.js
      const processedGraph = {
        ...graph,
        nodes: graph.nodes.map(node => ({
          ...node,
          attributes: {
            ...node.attributes,
            // Assign random coordinates if x or y are missing or not numbers
            x: typeof node.attributes?.x === 'number' ? node.attributes.x : Math.random() * 1000,
            y: typeof node.attributes?.y === 'number' ? node.attributes.y : Math.random() * 1000,
          }
        }))
      };

      const builtGraph = Graph.from(processedGraph); // Use processed graph data

      rendererRef.current?.kill();

      const renderer = new Sigma(builtGraph, containerRef.current!, {
        defaultNodeColor: "#e22352",
        defaultEdgeColor: "#ffaeaf",
        minEdgeThickness: 1,
        nodeReducer: (n, a) => ({ ...a, size: Math.sqrt(Math.sqrt(builtGraph.degree(n))) + 1}),
      });
      renderer.getCamera().animatedReset();

      bindLeafletLayer(renderer, {
        getNodeLatLng: (attrs: any) => ({ lat: attrs.lat, lng: attrs.lon }),
      });

      rendererRef.current = renderer;
    };

    initSigma();
    return () => {
      rendererRef.current?.kill();
    };
  }, [graph, containerRef]);
};
