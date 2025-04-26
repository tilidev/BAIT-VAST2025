"use client";

import { Card, CardHeader, CardBody, Divider, Button } from "@heroui/react";
import { useState } from "react";
import { FilterSelect } from "./FilterSelect";
import { useGraphStore } from "@/stores/useGraphStore";

export const Sidebar = () => {
  const [region, setRegion] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const setGraph = useGraphStore((state) => state.setGraph);

  const handleApply = async () => {
    try {
      const response = await fetch("/api/dummydata", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const newData = await response.json();
      newData['nodes'].forEach(node => {
        node.attributes.x = 0;
        node.attributes.y = 0;        
      });
      setGraph(newData);
    } catch (err) {
      console.error("Failed to fetch graph:", err);
    }
  };

  return (
    <Card className="w-72 h-full flex flex-col">
      <CardHeader>
        <h2 className="text-lg font-semibold">Filters</h2>
      </CardHeader>
      <Divider />
      <CardBody className="flex-grow flex flex-col space-y-4">
        <FilterSelect
          label="Region"
          placeholder="All Regions"
          selectedKey={region}
          onChange={setRegion}
          options={[
            { label: "All Regions", value: "" },
            { label: "EMEA", value: "EMEA" },
            { label: "Americas", value: "Americas" },
            { label: "APAC", value: "APAC" },
          ]}
        />
        <FilterSelect
          label="Country"
          placeholder="All Countries"
          selectedKey={country}
          onChange={setCountry}
          options={[
            { label: "All Countries", value: "" },
            { label: "USA", value: "USA" },
            { label: "Germany", value: "Germany" },
            { label: "Japan", value: "Japan" },
          ]}
        />
      </CardBody>
      <Divider />
      <div className="p-4">
        <Button onPress={handleApply} className="w-full" color="primary">
          Apply Filters
        </Button>
      </div>
    </Card>
  );
};

