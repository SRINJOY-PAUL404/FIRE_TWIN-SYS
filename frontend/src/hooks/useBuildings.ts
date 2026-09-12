import { useResourceList } from './useResourceList';

export interface Building {
  id: number;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  blocks: string[];
}

export function useBuildings() {
  return useResourceList<Building>('buildings');
}
