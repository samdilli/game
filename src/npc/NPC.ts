import type { Character } from '@/characters/Character';
import type { NPCBrain } from '@/npc/NPCBrain';
import type { NPCArchetypeConfig } from '@/config/npc';

export class NPC {
  constructor(
    readonly character: Character,
    readonly brain: NPCBrain,
    readonly archetype: NPCArchetypeConfig,
  ) {}

  update(dt: number): void {
    this.brain.update(dt);
  }

  dispose(): void {
    this.brain.dispose();
    this.character.dispose();
  }
}
