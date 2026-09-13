import { Vector3, type Scene } from '@babylonjs/core';
import type { CharacterFactory } from '@/characters/CharacterFactory';
import type { ResolvedCharacterAssets } from '@/config/assets';
import type { EventBus } from '@/core/EventBus';
import type { NavigationManager } from '@/navigation/NavigationManager';
import {
  CIVILIAN_ARCHETYPE,
  CIVILIAN_PATROL_ROUTES,
  NPC_SPAWN_CONFIG,
  THIEF_NPC_ARCHETYPE,
} from '@/config/npc';
import { NPCBrain } from '@/npc/NPCBrain';
import { NPC } from '@/npc/NPC';
import type { PerceivableTarget } from '@/npc/NPCPerception';
import type { Character } from '@/characters/Character';

export class NPCManager {
  private npcs: NPC[] = [];
  private nextId = 1000;

  constructor(
    private readonly scene: Scene,
    private readonly navigation: NavigationManager,
    private readonly eventBus: EventBus,
    private readonly characterFactory: CharacterFactory,
  ) {}

  async spawnPopulation(
    assets: ResolvedCharacterAssets,
    worldHalfSize: number,
    playerCharacters: Character[],
  ): Promise<void> {
    this.dispose();

    for (let i = 0; i < NPC_SPAWN_CONFIG.civilianCount; i++) {
      const route = CIVILIAN_PATROL_ROUTES[i % CIVILIAN_PATROL_ROUTES.length];
      const angle = (i / NPC_SPAWN_CONFIG.civilianCount) * Math.PI * 2;
      const radius = 10 + (i % 3) * 4;
      const npc = await this.spawnOne(assets, worldHalfSize, {
        ...CIVILIAN_ARCHETYPE,
        displayName: `Sivil ${i + 1}`,
      }, new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius), route, playerCharacters);
      this.npcs.push(npc);
    }

    if (NPC_SPAWN_CONFIG.includeThiefNpc) {
      const thief = await this.spawnOne(assets, worldHalfSize, THIEF_NPC_ARCHETYPE, new Vector3(24, 0, 6), undefined, playerCharacters);
      this.npcs.push(thief);
    }
  }

  update(dt: number, playerCharacters: Character[]): void {
    const playerPositions = playerCharacters.map((c) => c.mesh.position);

    for (const npc of this.npcs) {
      const dist = nearestPlayerDistance(npc.character.mesh.position, playerPositions);
      const lod =
        dist <= NPC_SPAWN_CONFIG.lod0Distance
          ? 0
          : dist <= NPC_SPAWN_CONFIG.lod1Distance
            ? 1
            : 2;
      npc.brain.setLod(lod);
      npc.update(dt);
    }
  }

  getActiveCount(): number {
    return this.npcs.length;
  }

  getNpcs(): readonly NPC[] {
    return this.npcs;
  }

  dispose(): void {
    for (const npc of this.npcs) npc.dispose();
    this.npcs = [];
  }

  private async spawnOne(
    assets: ResolvedCharacterAssets,
    worldHalfSize: number,
    archetype: typeof CIVILIAN_ARCHETYPE,
    position: Vector3,
    patrolRoute: (typeof CIVILIAN_PATROL_ROUTES)[number] | undefined,
    playerCharacters: Character[],
  ): Promise<NPC> {
    const id = this.nextId++;
    const character = await this.characterFactory.spawnNpc(this.scene, assets, {
      id,
      name: archetype.displayName,
      role: archetype.role,
      instanceName: `npc_${id}`,
      position,
      moveSpeed: archetype.moveSpeed,
      sprintMultiplier: archetype.sprintMultiplier,
      worldHalfSize,
      tint: archetype.tint,
    });

    const getTargets = (): PerceivableTarget[] => [
      ...playerCharacters.map((c) => ({
        id: c.id,
        mesh: c.mesh,
        role: c.role,
        isSprinting: c.movement.isSprinting,
      })),
      ...this.npcs.map((n) => ({
        id: n.character.id,
        mesh: n.character.mesh,
        role: n.character.role,
        isSprinting: n.character.movement.isSprinting,
      })),
    ];

    const brain = new NPCBrain({
      character,
      archetype,
      navigation: this.navigation,
      eventBus: this.eventBus,
      patrolRoute,
      getTargets,
    });

    return new NPC(character, brain, archetype);
  }
}

function nearestPlayerDistance(pos: Vector3, players: Vector3[]): number {
  if (players.length === 0) return Infinity;
  let min = Infinity;
  for (const p of players) {
    const d = Vector3.Distance(pos, p);
    if (d < min) min = d;
  }
  return min;
}
