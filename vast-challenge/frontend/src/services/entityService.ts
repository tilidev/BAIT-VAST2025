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
