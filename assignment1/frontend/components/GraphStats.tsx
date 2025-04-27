'use client';

import React, { useMemo, useState } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useFilterStore } from '@/stores/useFilterStore'; // Import filter store
import { Card, CardHeader, CardBody } from '@heroui/react';
import { Select, SelectItem } from '@heroui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Define an interface for node attributes
interface NodeAttributes {
  continent?: string;
  region?: string;
  country?: string; // Add country
  [key: string]: any;
}

// Type for the selectable attributes
type ChartAttribute = 'continent' | 'region' | 'country'; // Add country

interface ChartData {
  name: string;
  count: number;
}

// Add country to the list of attributes
const chartableAttributes: ChartAttribute[] = ['continent', 'region', 'country'];

export function GraphStats() {
  const graph = useGraphStore((state) => state.graph);
  const { filters, setFilters } = useFilterStore(); // Get filter state and actions
  const [selectedAttribute, setSelectedAttribute] = useState<ChartAttribute>('continent');

  const nodeCount = graph?.nodes?.length ?? 0;
  const edgeCount = graph?.edges?.length ?? 0;

  // Calculate node distribution based on the selected attribute
  const chartData = useMemo<ChartData[]>(() => {
    if (!graph?.nodes) return [];

    const counts: Record<string, number> = {};
    graph.nodes.forEach((node) => {
      // Adjust the path 'node.attributes[selectedAttribute]' if needed
      const attributes = node.attributes as NodeAttributes | undefined;
      const attributeValue = attributes?.[selectedAttribute] ?? 'Unknown';
      counts[attributeValue] = (counts[attributeValue] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [graph?.nodes, selectedAttribute]);

  const handleSelectionChange = (keys: Set<React.Key> | any) => {
    const selectedKey = Array.from(keys)[0] as ChartAttribute | undefined;
    if (selectedKey && chartableAttributes.includes(selectedKey)) {
      setSelectedAttribute(selectedKey);
    }
  };

  // Handler for clicking a bar
  const handleBarClick = (data: ChartData) => {
    const clickedValue = data.name;
    if (clickedValue === 'Unknown') return; // Don't filter by 'Unknown'

    // Get the current filter array for the selected attribute
    const currentFilterArray = filters[selectedAttribute] || [];

    // Add the clicked value to the filter if it's not already there
    if (!currentFilterArray.includes(clickedValue)) {
      setFilters({
        [selectedAttribute]: [...currentFilterArray, clickedValue],
      });
    }

    // Switch the view to 'country'
    setSelectedAttribute('country');
  };


  return (
    <Card className="mt-4">
      {/* Header remains the same */}
      <CardHeader>
        <h3 className="text-lg font-semibold">Graph Statistics</h3>
      </CardHeader>
      <CardBody>
        {/* Node/Edge counts remain the same */}
        <div className="space-y-2 mb-4">
          <p>
            <span className="font-medium">Nodes:</span> {nodeCount}
          </p>
          <p>
            <span className="font-medium">Edges:</span> {edgeCount}
          </p>
        </div>

        {/* Add Select dropdown for choosing attribute */}
        <Select
          label="Visualize Node Distribution By"
          placeholder="Select Attribute"
          selectedKeys={[selectedAttribute]}
          onSelectionChange={handleSelectionChange}
          className="mb-4"
          size="sm" // Make the select smaller
        >
          {chartableAttributes.map((attr) => (
            <SelectItem key={attr} className="capitalize">
              {attr}
            </SelectItem>
          ))}
        </Select>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <div>
            {/* Dynamic Chart Title */}
            <h4 className="text-md font-semibold mb-2 capitalize">
              Nodes per {selectedAttribute}
            </h4>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData} // Use dynamic chartData
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  {/* Add onClick handler and cursor style to the Bar */}
                  <Bar
                    dataKey="count"
                    fill="#8884d8"
                    name="Node Count"
                    onClick={handleBarClick}
                    style={{ cursor: 'pointer' }} // Add pointer cursor
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
