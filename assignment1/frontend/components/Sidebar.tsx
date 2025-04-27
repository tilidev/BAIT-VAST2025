"use client";

import { Card, CardHeader, CardBody, Divider, Button, Input } from "@heroui/react"; // Add Input
import { Select, SelectItem } from "@heroui/select";
import { useEffect, useState } from "react";
import { GraphOverview } from "./GraphOverview";
import { fetchFilterOptions } from "@/hooks/useFilters";
import { useFilterStore } from "@/stores/useFilterStore";
import { useGraphStore } from "@/stores/useGraphStore";

export function Sidebar() {
  const { filters, setFilters, resetFilters } = useFilterStore();
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
      // Separate degree filters from other filters
      const { minDegree, maxDegree, ...bodyFilters } = filters;

      // Construct query parameters for min/max degree
      const queryParams = new URLSearchParams();
      if (minDegree !== null && minDegree !== undefined) {
        queryParams.append("min", minDegree.toString());
      }
      if (maxDegree !== null && maxDegree !== undefined) {
        queryParams.append("max", maxDegree.toString());
      }
      const queryString = queryParams.toString();
      const url = `/api/simple-filtered-graph${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, { // Use the URL with query params
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
          </>
        ) : (
          <div>Loading filters...</div>
        )}
      </CardBody>

      {/* Add the GraphOverview component here */}
      <div className="px-4 pb-4"> {/* Add some padding */}
        <GraphOverview />
      </div>

      <Divider />
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
