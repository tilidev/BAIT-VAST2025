import React from 'react';
import { useGraphStore } from '../stores/useGraphStore';
import { useFilterStore } from '../stores/useFilterStore';

export function GraphOverview() {
  const graph = useGraphStore((state) => state.graph);
  const filters = useFilterStore((state) => state.filters);

  const activeFilterCounts = Object.entries(filters)
    .map(([key, value]) => ({ key, count: value.length }))
    .filter(f => f.count > 0);

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
        {activeFilterCounts.length > 0 ? (
          <ul className="list-disc list-inside pl-1">
            {activeFilterCounts.map(filter => (
              <li key={filter.key} className="text-xs capitalize">
                {/* Simple display of category and count */}
                {filter.key}: {filter.count} selected
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
