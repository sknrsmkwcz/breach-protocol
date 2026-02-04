import { describe, it, expect } from 'vitest';
import { resolveExploitVsFirewall } from '../../src/engine/firewall';
import { SeededRandom } from '../../src/utils/random';

describe('Integration', () => {
  it('should have working imports', () => {
    const result = resolveExploitVsFirewall(5, []);
    expect(result.damageToDefender).toBe(5);
  });

  it('should have deterministic random', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);
    expect(rng1.next()).toBe(rng2.next());
  });
});
