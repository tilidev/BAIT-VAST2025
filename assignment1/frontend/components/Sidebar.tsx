"use client";

import { Card, CardHeader, CardBody, Divider, Button } from "@heroui/react";
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
      const response = await fetch("/api/simple-filtered-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
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
