"use client";

import { Card, CardHeader, CardBody, Divider, Button, Input, Switch } from "@heroui/react"; 
import { Select, SelectItem } from "@heroui/select";
import { useEffect, useState } from 'react';
import { GraphStats } from './GraphStats'; 
import { fetchFilterOptions } from '@/hooks/useFilters';
import { useFilterStore } from '@/stores/useFilterStore';
import { useGraphStore } from "@/stores/useGraphStore";
import { useHighlightStore } from "@/stores/useHighlightStore"; 
import type { NodeColorAttribute, EdgeColorAttribute } from "@/stores/useHighlightStore"; 

// Define the attributes available for coloring (reduced)
const nodeColorableAttributes: NodeColorAttribute[] = ["region", "continent"];
const edgeColorableAttributes: EdgeColorAttribute[] = ["none", "national", "international", "intercontinental"]; 

export function Sidebar() {
  const { filters, setFilters, resetFilters } = useFilterStore();
  // Get state and actions from highlight store
  const {
    // Get state and actions from highlight store
    colorAttribute,
    edgeColorAttribute, // Get edge color state
    sizeByDegree,
    hoveredNodeData,
    setColorAttribute,
    setEdgeColorAttribute, // Get edge color action
    setSizeByDegree,
  } = useHighlightStore();
  const setGraph = useGraphStore((state) => state.setGraph);

  const [filterOptions, setFilterOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await fetchFilterOptions();
        setFilterOptions(data);
      } catch (error) {
        console.error(error);
      }
    }
    loadOptions();
  }, []);

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      // Separate query param filters from body filters
      const { minDegree, maxDegree, minRunways, maxRunways, topN, ...bodyFilters } = filters; // Add topN here

      // Construct query parameters
      const queryParams = new URLSearchParams();
      if (minDegree !== null && minDegree !== undefined) {
        queryParams.append("min", minDegree.toString());
      }
      if (maxDegree !== null && maxDegree !== undefined) {
        queryParams.append("max", maxDegree.toString());
      }
      if (minRunways !== null && minRunways !== undefined) {
        queryParams.append("min_runways", minRunways.toString()); // Use snake_case for backend
      }
      if (maxRunways !== null && maxRunways !== undefined) {
        queryParams.append("max_runways", maxRunways.toString()); // Use snake_case for backend
      }
      if (topN !== null && topN !== undefined && topN > 0) { // Add topN query param if valid
        queryParams.append("top_n", topN.toString()); // Use snake_case for backend
      }
      const queryString = queryParams.toString();
      const url = `/api/simple-filtered-graph${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyFilters), // Send only other filters in the body
      });
      const data = await response.json();
      setGraph(data);
    } catch (err) {
      console.error("Failed to apply filters:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-72 h-full flex flex-col">
      <CardHeader>
        <h2 className="text-lg font-semibold">Filters</h2>
      </CardHeader>
      <Divider />
      <CardBody className="flex-grow flex flex-col space-y-4">
        {filterOptions ? (
          <>
            <Select
              label="Region"
              placeholder="All Regions"
              selectionMode="multiple"
              selectedKeys={filters.region}
              onSelectionChange={(keys) => setFilters({ region: Array.from(keys) as string[] })}
            >
              {filterOptions.region.map((region: string) => (
                <SelectItem key={region}>{region || "Unknown"}</SelectItem>
              ))}
            </Select>

            <Select
              label="Country"
              placeholder="All Countries"
              selectionMode="multiple"
              selectedKeys={filters.country}
              onSelectionChange={(keys) => setFilters({ country: Array.from(keys) as string[] })}
            >
              {filterOptions.country.map((country: string) => (
                <SelectItem key={country}>{country || "Unknown"}</SelectItem>
              ))}
            </Select>

            <Select
              label="City"
              placeholder="All Cities"
              selectionMode="multiple"
              selectedKeys={filters.city}
              onSelectionChange={(keys) => setFilters({ city: Array.from(keys) as string[] })}
            >
              {filterOptions.city.map((city: string) => (
                <SelectItem key={city}>{city || "Unknown"}</SelectItem>
              ))}
            </Select>

            <Select
              label="Continent"
              placeholder="All Continents"
              selectionMode="multiple"
              selectedKeys={filters.continent}
              onSelectionChange={(keys) => setFilters({ continent: Array.from(keys) as string[] })}
            >
              {filterOptions.continent.map((continent: string) => (
                <SelectItem key={continent}>{continent || "Unknown"}</SelectItem>
              ))}
            </Select>

            {/* Add Min/Max Degree Inputs */}
            <div className="flex space-x-2">
              <Input
                label="Min Degree"
                type="number"
                placeholder="Min"
                value={filters.minDegree?.toString() ?? ""}
                onValueChange={(value) => setFilters({ minDegree: value ? parseInt(value, 10) : null })}
                min={0}
              />
              <Input
                label="Max Degree"
                type="number"
                placeholder="Max"
                value={filters.maxDegree?.toString() ?? ""}
                onValueChange={(value) => setFilters({ maxDegree: value ? parseInt(value, 10) : null })}
                min={0}
              />
            </div>

            {/* Add Top N Input */}
             <Input
                label="Top N Airports (by Degree)"
                type="number"
                placeholder="All"
                value={filters.topN?.toString() ?? ""}
                onValueChange={(value) => setFilters({ topN: value ? parseInt(value, 10) : null })}
                min={1} // Top N should be at least 1
              />

            {/* Add Min/Max Runway Inputs */}
            <div className="flex space-x-2">
              <Input
                label="Min Runways"
                type="number"
                placeholder="Min"
                value={filters.minRunways?.toString() ?? ""}
                onValueChange={(value) => setFilters({ minRunways: value ? parseInt(value, 10) : null })}
                min={0}
              />
              <Input
                label="Max Runways"
                type="number"
                placeholder="Max"
                value={filters.maxRunways?.toString() ?? ""}
                onValueChange={(value) => setFilters({ maxRunways: value ? parseInt(value, 10) : null })}
                min={0}
              />
            </div>


            <Divider className="my-2" /> {/* Separator */}

            {/* --- Visual Encoding Controls --- */}
            <h3 className="text-md font-semibold mb-1">Visual Encodings</h3>

            <Select
              label="Color Nodes By"
              placeholder="Default Node Color"
              selectedKeys={colorAttribute ? [colorAttribute] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as NodeColorAttribute | 'none' | undefined;
                // Cast selected key to the expected type
                setColorAttribute(selected === 'none' || !selected ? null : selected);
              }}
            >
              <SelectItem key="none">None</SelectItem>
              {nodeColorableAttributes.map((attr) => (
                <SelectItem key={attr} className="capitalize">{attr}</SelectItem>
              ))}
            </Select>

            {/* @ts-expect-error Re-adding to suppress persistent type error */}
            <Select
              label="Color Edges By"
              placeholder="Default Edge Color"
              selectionMode="single" // Explicitly set selection mode
              selectedKeys={edgeColorAttribute ? [edgeColorAttribute] : []} // Mirror node select logic
              onSelectionChange={(keys) => {
                 const selected = Array.from(keys)[0] as EdgeColorAttribute | undefined;
                 // Ensure 'none' is treated as null/cleared selection if needed by the store,
                 // or handle 'none' explicitly if it's a valid selection key.
                 // Assuming the store handles 'none' appropriately.
                 setEdgeColorAttribute(selected || 'none');
              }}
            >
              {edgeColorableAttributes.map((attr) => (
                <SelectItem key={attr} className="capitalize">{attr}</SelectItem>
              ))}
            </Select>

            {/* Associate label with Switch using htmlFor/id */}
            {/* Remove unused @ts-expect-error */}
            <div className="flex items-center space-x-2"> {/* Container for layout */}
              <Switch
                id="size-by-degree-switch" // Add id
                isSelected={sizeByDegree}
                onValueChange={setSizeByDegree}
              />
              <label htmlFor="size-by-degree-switch" className="text-sm cursor-pointer"> {/* Use standard label */}
                Size Nodes by Degree
              </label>
            </div>

            {/* --- Color Legend --- */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold mb-2">Edge Color Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#ffaeaf' }}></span> {/* Default */}
                  <span>Default / Within Same Country (if National not selected)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#f59e0b' }}></span> {/* National */}
                  <span>National (Same Country)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#3b82f6' }}></span> {/* International */}
                  <span>International (Different Country)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#10b981' }}></span> {/* Intercontinental */}
                  <span>Intercontinental (Different Continent)</span>
                </div>
                 <p className="pt-1 text-gray-500 dark:text-gray-400">
                   Node colors represent selected 'Color Nodes By' attribute (if any).
                 </p>
              </div>
            </div>
            {/* --- End Color Legend --- */}

          </>
        ) : (
          <div>Loading filters...</div>
        )}
      </CardBody>

      {/* Hovered Node Details */}
      <div className="px-4 py-3">
        <h3 className="text-md font-semibold mb-2">Node Details</h3>
        {hoveredNodeData ? (
          <div className="text-xs space-y-1">
            {Object.entries(hoveredNodeData).map(([key, value]) => (
              <p key={key}>
                <span className="font-medium capitalize">{key}: </span>
                {/* Ensure value is displayable */}
                {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                  ? String(value)
                  : JSON.stringify(value)}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">Hover over a node for details.</p>
        )}
      </div>

      <Divider />

      {/* Graph Statistics */}
      <div className="px-4 pb-4">
        <GraphStats /> {/* Replace GraphOverview with GraphStats */}
      </div>

      <Divider />

      {/* Action Buttons */}
      <div className="p-4 flex flex-col space-y-2">
        <Button onPress={handleApplyFilters} className="w-full" color="primary" isLoading={loading}>
          Apply Filters
        </Button>
        <Button onPress={resetFilters} className="w-full" variant="bordered">
          Reset Filters
        </Button>
      </div>
    </Card>
  );
}
