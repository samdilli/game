import { describe, expect, it } from 'vitest';
import { InputMapping } from '@/input/InputMapping';
import { PLAYER1_KEYBOARD_BINDINGS } from '@/config/controls';

describe('InputMapping', () => {
  it('returns bindings for a specific action', () => {
    const mapping = new InputMapping(PLAYER1_KEYBOARD_BINDINGS);
    const forward = mapping.getBindingsForAction('moveForward');
    expect(forward.length).toBeGreaterThan(0);
    expect(forward[0].keys).toContain('KeyW');
  });

  it('returns all bindings', () => {
    const mapping = new InputMapping(PLAYER1_KEYBOARD_BINDINGS);
    expect(mapping.getAllBindings().length).toBe(PLAYER1_KEYBOARD_BINDINGS.length);
  });
});
