import { Vector3 } from '@babylonjs/core';
import type { CityBuildResult } from '@/world/CityData';

export interface GridCoord {
  x: number;
  z: number;
}

export interface NavigationGridConfig {
  cellSize: number;
  worldHalfSize: number;
}

interface AStarNode {
  x: number;
  z: number;
  g: number;
  f: number;
  parent?: AStarNode;
}

export class NavigationGrid {
  readonly cellCount: number;
  readonly cellSize: number;
  readonly worldHalfSize: number;
  private readonly walkable: boolean[];

  constructor(city: CityBuildResult, config: Partial<NavigationGridConfig> = {}) {
    this.cellSize = config.cellSize ?? 2;
    this.worldHalfSize = config.worldHalfSize ?? city.halfSize;
    this.cellCount = Math.floor((this.worldHalfSize * 2) / this.cellSize);
    this.walkable = new Array(this.cellCount * this.cellCount).fill(true);
    this.markObstacles(city);
  }

  worldToCell(x: number, z: number): GridCoord {
    const localX = x + this.worldHalfSize;
    const localZ = z + this.worldHalfSize;
    return {
      x: clamp(Math.floor(localX / this.cellSize), 0, this.cellCount - 1),
      z: clamp(Math.floor(localZ / this.cellSize), 0, this.cellCount - 1),
    };
  }

  cellToWorld(cx: number, cz: number): Vector3 {
    const x = cx * this.cellSize - this.worldHalfSize + this.cellSize * 0.5;
    const z = cz * this.cellSize - this.worldHalfSize + this.cellSize * 0.5;
    return new Vector3(x, 0, z);
  }

  isWalkable(cx: number, cz: number): boolean {
    if (cx < 0 || cz < 0 || cx >= this.cellCount || cz >= this.cellCount) return false;
    return this.walkable[cz * this.cellCount + cx];
  }

  findPath(from: Vector3, to: Vector3): Vector3[] {
    const start = this.worldToCell(from.x, from.z);
    const goal = this.worldToCell(to.x, to.z);

    if (!this.isWalkable(goal.x, goal.z)) {
      const nearest = this.findNearestWalkable(goal.x, goal.z);
      if (!nearest) return [];
      goal.x = nearest.x;
      goal.z = nearest.z;
    }

    const path = this.aStar(start, goal);
    if (path.length === 0) return [];

    return path.map((c) => this.cellToWorld(c.x, c.z));
  }

  private markObstacles(city: CityBuildResult): void {
    for (const obs of city.obstacles) {
      const min = this.worldToCell(obs.minX, obs.minZ);
      const max = this.worldToCell(obs.maxX, obs.maxZ);
      for (let z = min.z; z <= max.z; z++) {
        for (let x = min.x; x <= max.x; x++) {
          if (this.inBounds(x, z)) {
            this.walkable[z * this.cellCount + x] = false;
          }
        }
      }
    }
  }

  private aStar(start: GridCoord, goal: GridCoord): GridCoord[] {
    const open: AStarNode[] = [];
    const closed = new Set<string>();
    const startNode: AStarNode = { x: start.x, z: start.z, g: 0, f: heuristic(start, goal) };
    open.push(startNode);

    const neighbors = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const key = nodeKey(current.x, current.z);

      if (current.x === goal.x && current.z === goal.z) {
        return reconstruct(current);
      }

      closed.add(key);

      for (const [dx, dz] of neighbors) {
        const nx = current.x + dx;
        const nz = current.z + dz;
        if (!this.isWalkable(nx, nz)) continue;

        const nKey = nodeKey(nx, nz);
        if (closed.has(nKey)) continue;

        const stepCost = dx !== 0 && dz !== 0 ? 1.414 : 1;
        const g = current.g + stepCost;
        const existing = open.find((n) => n.x === nx && n.z === nz);
        if (existing && g >= existing.g) continue;

        const node: AStarNode = {
          x: nx,
          z: nz,
          g,
          f: g + heuristic({ x: nx, z: nz }, goal),
          parent: current,
        };

        if (existing) {
          existing.g = node.g;
          existing.f = node.f;
          existing.parent = current;
        } else {
          open.push(node);
        }
      }
    }

    return [];
  }

  private findNearestWalkable(cx: number, cz: number): GridCoord | undefined {
    for (let r = 1; r < 8; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          const z = cz + dz;
          if (this.isWalkable(x, z)) return { x, z };
        }
      }
    }
    return undefined;
  }

  private inBounds(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.cellCount && cz < this.cellCount;
  }
}

function heuristic(a: GridCoord, b: GridCoord): number {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return dx + dz + (1.414 - 2) * Math.min(dx, dz);
}

function nodeKey(x: number, z: number): string {
  return `${x},${z}`;
}

function reconstruct(node: AStarNode): GridCoord[] {
  const path: GridCoord[] = [];
  let cur: AStarNode | undefined = node;
  while (cur) {
    path.unshift({ x: cur.x, z: cur.z });
    cur = cur.parent;
  }
  return path;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function pathLength(points: Vector3[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Vector3.Distance(points[i - 1], points[i]);
  }
  return total;
}
