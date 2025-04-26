export async function fetchFilterOptions() {
    const res = await fetch("/api/airport_attributes");
    if (!res.ok) {
      throw new Error("Failed to fetch filter options");
    }
    return res.json();
  }
  