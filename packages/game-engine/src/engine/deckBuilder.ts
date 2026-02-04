import type { Card, FactionId } from '../types';
import { SeededRandom } from '../utils/random';
import { createExploit, createPayload, createZeroDay, createSiphon, createFirewall, createPatch, createPurge } from './cardFactory';

export function buildDeck(faction: FactionId, rng: SeededRandom): Card[] {
  const cards: Card[] = [];
  
  if (faction === 'phantom') {
    // 12 Exploits (random 2-5 damage)
    for (let i = 0; i < 12; i++) cards.push(createExploit(rng.nextInt(2, 5)));
    // 10 Payloads
    for (let i = 0; i < 10; i++) cards.push(createPayload());
    // 4 Zero-Days
    for (let i = 0; i < 4; i++) cards.push(createZeroDay());
    // 4 Siphons
    for (let i = 0; i < 4; i++) cards.push(createSiphon());
  } else {
    // 12 Firewalls (random 2-5 block)
    for (let i = 0; i < 12; i++) cards.push(createFirewall(rng.nextInt(2, 5)));
    // 8 Exploits (fixed 2 damage)
    for (let i = 0; i < 8; i++) cards.push(createExploit(2));
    // 6 Patches
    for (let i = 0; i < 6; i++) cards.push(createPatch());
    // 3 Purges
    for (let i = 0; i < 3; i++) cards.push(createPurge());
  }
  
  return rng.shuffle(cards);
}

export function getDeckSize(faction: FactionId): number {
  return faction === 'phantom' ? 30 : 29;
}
