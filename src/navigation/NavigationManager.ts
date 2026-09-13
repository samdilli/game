import { Vector3 } from '@babylonjs/core';
import { NavigationGrid, pathLength } from '@/navigation/NavigationGrid';
import type { CityBuildResult } from '@/world/CityData';

export interface PathRequest {
  id: string;
  from: Vector3;
  to: Vector3;
}

export class NavigationManager {
  readonly grid: NavigationGrid;
  private readonly paths = new Map<string, Vector3[]>();

  constructor(city: CityBuildResult) {
    this.grid = new NavigationGrid(city, { worldHalfSize: city.halfSize });
  }

  requestPath(request: PathRequest): Vector3[] {
    const path = this.grid.findPath(request.from, request.to);
    this.paths.set(request.id, path);
    return path;
  }

  getPath(id: string): Vector3[] {
    return this.paths.get(id) ?? [];
  }

  recalculate(id: string, from: Vector3, to: Vector3): Vector3[] {
    return this.requestPath({ id, from, to });
  }

  estimateCost(from: Vector3, to: Vector3): number {
    return pathLength(this.grid.findPath(from, to));
  }

  clear(): void {
    this.paths.clear();
  }
}
