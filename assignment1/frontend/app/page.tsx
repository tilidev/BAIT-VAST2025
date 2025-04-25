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

    // Cleanup old renderer
    rendererRef.current?.kill();

    // Instantiate Sigma
    const renderer = new Sigma(graph, containerRef.current!, {
      defaultNodeColor: "#e22352",
      defaultEdgeColor: "#ffaeaf",
      minEdgeThickness: 1,
      nodeReducer: (n, a) => ({ ...a, size: Math.sqrt(Math.sqrt(graph.degree(n))) + 1}),
    });
    renderer.getCamera().animatedReset();

    // Bind Leaflet background
    bindLeafletLayer(renderer, {
      getNodeLatLng: (attrs: any) => ({ lat: attrs.lat, lng: attrs.lon }),
    });

    rendererRef.current = renderer;
  };

  // Fetch and apply filters
  const handleApply = async () => {
    try {
      const response = await fetch("/api/dummydata", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      const newData = await response.json();
      newData['nodes'].forEach(node => {
        node.attributes.x = 0;
        node.attributes.y = 0;        
      });
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
