"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardBody, Divider, Button } from "@heroui/react";
import { Select, SelectItem } from "@heroui/select";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);

  const [region, setRegion] = useState<string>("");
  const [country, setCountry] = useState<string>("");

  // Initialize or re-init Sigma with graph data
  const initSigma = async (data: any) => {
    if (!containerRef.current) return;

    // Clear previous contents
    containerRef.current.innerHTML = "";

    // Dynamic imports (client only)
    const [{ default: Sigma }, GraphModule, leafletLayer] = await Promise.all([
      import("sigma"),
      import("graphology"),
      import("@sigma/layer-leaflet"),
    ]);
    const Graph = (GraphModule as any).default || GraphModule;
    const bindLeafletLayer = leafletLayer.default;

    // Build graph
    const graph = Graph.from(data);
    graph.updateEachNodeAttributes((node: string, attrs: any) => ({
      ...attrs,
      label: attrs.fullName,
      x: attrs.longitude / 10,
      y: attrs.latitude / 10,
    }));

    // Cleanup old renderer
    rendererRef.current?.kill();

    // Instantiate Sigma
    const renderer = new Sigma(graph, containerRef.current!, {
      defaultNodeColor: "#e22352",
      defaultEdgeColor: "#ffaeaf",
      minEdgeThickness: 1,
      nodeReducer: (n, a) => ({ ...a, size: Math.sqrt(graph.degree(n)) + 2 }),
    });
    renderer.getCamera().animatedReset();

    // Bind Leaflet background
    bindLeafletLayer(renderer, {
      getNodeLatLng: (attrs: any) => ({ lat: attrs.latitude, lng: attrs.longitude }),
    });

    rendererRef.current = renderer;
  };

  // Load default graph on mount
  useEffect(() => {
    const defaultData = {
      attributes: { name: "Airport Graph" },
      nodes: [
        { key: "JFK", attributes: { fullName: "JFK Airport", latitude: 40.6413, longitude: -73.7781 } },
        { key: "LAX", attributes: { fullName: "LAX Airport", latitude: 33.9416, longitude: -118.4085 } },
        { key: "ORD", attributes: { fullName: "ORD Airport", latitude: 41.9742, longitude: -87.9073 } },
      ],
      edges: [
        { source: "JFK", target: "LAX" },
        { source: "LAX", target: "ORD" },
        { source: "ORD", target: "JFK" },
      ],
      options: {},
    };
    initSigma(defaultData);
    return () => rendererRef.current?.kill();
  }, []);

  // Fetch and apply filters
  const handleApply = async () => {
    try {
      const response = await fetch("/api/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, country }),
      });
      const newData = await response.json();
      initSigma(newData);
    } catch (err) {
      console.error("Failed to fetch graph:", err);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Map container */}
      <div ref={containerRef} className="flex-1 relative" />

      {/* Sidebar with HeroUI components */}
      <Card className="w-72 h-full flex flex-col">
        <CardHeader>
          <h2 className="text-lg font-semibold">Filters</h2>
        </CardHeader>
        <Divider />
        <CardBody className="flex-grow flex flex-col space-y-4">
          <Select
            label="Region"
            placeholder="All Regions"
            selectedKey={region}
            onSelectionChange={(key) => setRegion(key as string)}
          >
            <SelectItem key="">All Regions</SelectItem>
            <SelectItem key="EMEA">EMEA</SelectItem>
            <SelectItem key="Americas">Americas</SelectItem>
            <SelectItem key="APAC">APAC</SelectItem>
          </Select>

          <Select
            label="Country"
            placeholder="All Countries"
            selectedKey={country}
            onSelectionChange={(key) => setCountry(key as string)}
          >
            <SelectItem key="">All Countries</SelectItem>
            <SelectItem key="USA">USA</SelectItem>
            <SelectItem key="Germany">Germany</SelectItem>
            <SelectItem key="Japan">Japan</SelectItem>
          </Select>
        </CardBody>
        <Divider />
        <div className="p-4">
          <Button onPress={handleApply} className="w-full" color="primary">
            Apply Filters
          </Button>
        </div>
      </Card>
    </div>
  );
}
