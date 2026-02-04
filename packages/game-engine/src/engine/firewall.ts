import type { ActiveFirewall } from '../types';

let firewallIdCounter = 0;

export function resetFirewallIdCounter(): void {
  firewallIdCounter = 0;
}

export function createActiveFirewall(value: number): ActiveFirewall {
  return { id: ++firewallIdCounter, value };
}

export interface FirewallResolution {
  readonly damageToDefender: number;
  readonly backtraceToAttacker: number;
  readonly remainingFirewalls: ActiveFirewall[];
  readonly destroyedFirewalls: ReadonlyArray<ActiveFirewall>;
  readonly fullyBlocked: boolean;
}

export function resolveExploitVsFirewall(
  exploitValue: number,
  firewalls: readonly ActiveFirewall[]
): FirewallResolution {
  if (firewalls.length === 0) {
    return {
      damageToDefender: exploitValue,
      backtraceToAttacker: 0,
      remainingFirewalls: [],
      destroyedFirewalls: [],
      fullyBlocked: false,
    };
  }

  if (exploitValue === 0) {
    return {
      damageToDefender: 0,
      backtraceToAttacker: 0,
      remainingFirewalls: firewalls.map(fw => ({ ...fw })),
      destroyedFirewalls: [],
      fullyBlocked: true,
    };
  }

  let remainingExploit = exploitValue;
  const destroyed: ActiveFirewall[] = [];
  const remaining: ActiveFirewall[] = [];

  for (const fw of firewalls) {
    if (remainingExploit <= 0) {
      remaining.push({ ...fw });
    } else {
      destroyed.push({ ...fw });
      remainingExploit -= fw.value;
    }
  }

  if (remainingExploit > 0) {
    return {
      damageToDefender: 0,
      backtraceToAttacker: remainingExploit,
      remainingFirewalls: remaining,
      destroyedFirewalls: destroyed,
      fullyBlocked: false,
    };
  }

  return {
    damageToDefender: 0,
    backtraceToAttacker: 0,
    remainingFirewalls: remaining,
    destroyedFirewalls: destroyed,
    fullyBlocked: true,
  };
}

export function getTotalFirewallValue(firewalls: readonly ActiveFirewall[]): number {
  return firewalls.reduce((sum, fw) => sum + fw.value, 0);
}
