import { api } from '../lib/axios.ts'
import type { Entity, DatasetNodeCount, IndustrySentimentRaw, GraphMembership } from '../types/entity.ts'

export async function fetchEntity(entityType: Entity): Promise<any> {
  try {
    const res = await api.get<any[]>(`/entities`, {
      params: { entity: entityType },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching graph data:', error);
    throw error;
  }
}

export async function fetchDatasetNodeCounts(datasets: GraphMembership[]): Promise<DatasetNodeCount[]> {
  try {
    const results: DatasetNodeCount[] = [];
    for (const dataset of datasets) {
      const response = await api.get(
        `/dataset-specific-nodes-edges?dataset=${dataset}`
      );
      results.push({
        dataset: dataset,
        nodeCount: response.data.nodes.length,
      });
    }
    return results;
  } catch (error) {
    console.error('Error fetching dataset node counts:', error);
    throw error;
  }
}

export async function fetchIndustrySentimentBreakdown(): Promise<IndustrySentimentRaw[]> {
  try {
    const response = await api.get('/industry-pro-contra-sentiments');
    return response.data;
  } catch (error) {
    console.error('Error fetching industry sentiment breakdown:', error);
    throw error;
  }
}

export async function fetchGraphSkeleton(): Promise<any> {
  try {
    const res = await api.get<any[]>(`/graph-skeleton`, {
      params: {},
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching graph data:', error);
    throw error;
  }
}

export async function fetchSentiment(): Promise<any> {
  try {
    const res = await api.get<any[]>(`/retrieve-sentiments`, {
      params: {},
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    throw error;
  }
}
