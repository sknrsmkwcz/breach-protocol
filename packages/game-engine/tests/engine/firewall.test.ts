import { describe, it, expect, beforeEach } from 'vitest';
import { resolveExploitVsFirewall, resetFirewallIdCounter, getTotalFirewallValue, createActiveFirewall } from '../../src/engine/firewall';
import type { ActiveFirewall } from '../../src/types';

describe('Firewall System', () => {
  beforeEach(() => {
    resetFirewallIdCounter();
  });

  describe('createActiveFirewall', () => {
    it('should create firewall with unique IDs', () => {
      const fw1 = createActiveFirewall(3);
      const fw2 = createActiveFirewall(4);
      expect(fw1.value).toBe(3);
      expect(fw2.value).toBe(4);
      expect(fw1.id).not.toBe(fw2.id);
    });
  });

  describe('getTotalFirewallValue', () => {
    it('should return 0 for empty array', () => {
      expect(getTotalFirewallValue([])).toBe(0);
    });

    it('should sum all values', () => {
      const fws: ActiveFirewall[] = [
        { id: 1, value: 3 },
        { id: 2, value: 4 },
        { id: 3, value: 2 },
      ];
      expect(getTotalFirewallValue(fws)).toBe(9);
    });
  });

  describe('resolveExploitVsFirewall', () => {
    it('should deal full damage with no firewalls', () => {
      const result = resolveExploitVsFirewall(5, []);
      expect(result.damageToDefender).toBe(5);
      expect(result.backtraceToAttacker).toBe(0);
      expect(result.fullyBlocked).toBe(false);
    });

    it('should block exploit less than firewall total', () => {
      const fws: ActiveFirewall[] = [{ id: 1, value: 3 }, { id: 2, value: 4 }];
      const result = resolveExploitVsFirewall(5, fws);

      expect(result.damageToDefender).toBe(0);
      expect(result.backtraceToAttacker).toBe(0);
      expect(result.fullyBlocked).toBe(true);
      expect(result.destroyedFirewalls).toHaveLength(2);
    });

    it('should BACKTRACE when exploit exceeds firewall', () => {
      const fws: ActiveFirewall[] = [{ id: 1, value: 3 }, { id: 2, value: 4 }];
      const result = resolveExploitVsFirewall(10, fws);

      expect(result.damageToDefender).toBe(0);
      expect(result.backtraceToAttacker).toBe(3);
      expect(result.fullyBlocked).toBe(false);
      expect(result.destroyedFirewalls).toHaveLength(2);
    });

    it('should handle zero exploit', () => {
      const fws: ActiveFirewall[] = [{ id: 1, value: 3 }];
      const result = resolveExploitVsFirewall(0, fws);

      expect(result.damageToDefender).toBe(0);
      expect(result.remainingFirewalls).toHaveLength(1);
      expect(result.fullyBlocked).toBe(true);
    });
  });
});
