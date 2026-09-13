import { describe, expect, it } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { NavigationGrid } from '@/navigation/NavigationGrid';
import { buildObstacleLayout } from '@/world/CityData';

describe('NavigationGrid', () => {
  const city = buildObstacleLayout(80);
  const grid = new NavigationGrid(city, { cellSize: 2, worldHalfSize: city.halfSize });

  it('finds a path around obstacles', () => {
    const from = new Vector3(0, 0, 0);
    const to = new Vector3(20, 0, 20);
    const path = grid.findPath(from, to);
    expect(path.length).toBeGreaterThan(2);
  });

  it('has walkable plaza cells at world origin', () => {
    const cell = grid.worldToCell(0, 0);
    expect(grid.isWalkable(cell.x, cell.z)).toBe(true);
  });
});
