"use client";

import { Sidebar } from "@/components/Sidebar";
import { GraphContainer } from "@/components/GraphContainer";

export default function Home() {
  return (
    <div className="flex h-screen">
      <GraphContainer />
      <Sidebar />
    </div>
  );
}

