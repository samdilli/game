import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { EventBus } from '@/core/EventBus';
import { CaseManager } from '@/cases/CaseManager';
import { POLICE_VS_THIEF_CASE } from '@/cases/CaseDefinition';

describe('CaseManager', () => {
  it('completes case on arrest', () => {
    const bus = new EventBus();
    const completed = vi.fn();
    bus.on('CaseCompleted', completed);

    const mgr = new CaseManager(bus);
    mgr.start(POLICE_VS_THIEF_CASE);

    mgr.update(1, {
      policePosition: new Vector3(0, 0, 0),
      thiefPosition: new Vector3(1, 0, 0),
      arrestCompleted: true,
      thiefEscaped: false,
    });

    expect(mgr.getSnapshot()?.status).toBe('completed');
    expect(completed).toHaveBeenCalled();
  });

  it('fails when thief escapes', () => {
    const bus = new EventBus();
    const failed = vi.fn();
    bus.on('CaseFailed', failed);

    const mgr = new CaseManager(bus);
    mgr.start(POLICE_VS_THIEF_CASE);

    mgr.update(1, {
      policePosition: new Vector3(0, 0, 0),
      thiefPosition: new Vector3(26, 0, -22),
      arrestCompleted: false,
      thiefEscaped: true,
    });

    expect(mgr.getSnapshot()?.status).toBe('failed');
    expect(failed).toHaveBeenCalled();
  });
});
