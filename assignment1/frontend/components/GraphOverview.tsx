import React from 'react';
import { useGraphStore } from '../stores/useGraphStore';
import { useFilterStore } from '../stores/useFilterStore';

export function GraphOverview() {
  const graph = useGraphStore((state) => state.graph);
  const filters = useFilterStore((state) => state.filters);

  // Updated logic to handle different filter types
  const activeFilters = Object.entries(filters)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        // For array filters, count the number of selected items
        return { key, count: value.length, value: null };
      } else if ((key === 'minDegree' || key === 'maxDegree') && value !== null && value !== undefined) {
        // For degree filters, check if a value is set
        return { key, count: 1, value: value }; // Store the actual value
      }
      // Ignore other types or null/undefined values
      return { key, count: 0, value: null };
    })
    .filter(f => f.count > 0); // Keep only active filters

  return (
    <div className="p-3 border rounded shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-sm">
      <h3 className="text-base font-semibold mb-2">Overview</h3>

      {/* Graph Info */}
      <div className="mb-2">
        <h4 className="text-sm font-medium mb-1">Graph</h4>
        {graph ? (
          <>
            <p className="text-xs">Nodes: {graph.nodes.length}</p>
            <p className="text-xs">Edges: {graph.edges.length}</p>
          </>
        ) : (
          <p className="text-xs text-gray-500">Loading graph data...</p>
        )}
      </div>

      {/* Filter Info */}
      <div>
        <h4 className="text-sm font-medium mb-1">Active Filters</h4>
        {activeFilters.length > 0 ? (
          <ul className="list-disc list-inside pl-1">
            {activeFilters.map(filter => (
              <li key={filter.key} className="text-xs capitalize">
                {/* Display count for array filters, value for degree filters */}
                {filter.key === 'minDegree' || filter.key === 'maxDegree'
                  ? `${filter.key}: ${filter.value}` // Show the degree value
                  : `${filter.key}: ${filter.count} selected` // Show the count for arrays
                }
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">No filters applied.</p>
        )}
      </div>
    </div>
  );
}
