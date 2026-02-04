import type { ExploitCard, PayloadCard, ZeroDayCard, SiphonCard, FirewallCard, PatchCard, PurgeCard } from '../types';

let cardIdCounter = 0;

export function resetCardIdCounter(): void {
  cardIdCounter = 0;
}

export function createExploit(baseDamage: number): ExploitCard {
  return { id: `exploit_${++cardIdCounter}`, type: 'exploit', baseDamage };
}

export function createPayload(): PayloadCard {
  return { id: `payload_${++cardIdCounter}`, type: 'payload' };
}

export function createZeroDay(): ZeroDayCard {
  return { id: `zeroday_${++cardIdCounter}`, type: 'zeroday' };
}

export function createSiphon(): SiphonCard {
  return { id: `siphon_${++cardIdCounter}`, type: 'siphon' };
}

export function createFirewall(blockValue: number): FirewallCard {
  return { id: `firewall_${++cardIdCounter}`, type: 'firewall', blockValue };
}

export function createPatch(): PatchCard {
  return { id: `patch_${++cardIdCounter}`, type: 'patch' };
}

export function createPurge(): PurgeCard {
  return { id: `purge_${++cardIdCounter}`, type: 'purge' };
}
