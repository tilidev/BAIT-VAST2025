import { api } from '../lib/axios.ts'
import type { Entity } from '../types/entity.ts'

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
