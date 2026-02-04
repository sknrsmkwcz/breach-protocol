import type { PlayerState, Card } from '../types';
import { getTotalFirewallValue } from '../engine/firewall';

export function chooseCard(self: PlayerState, opponent: PlayerState): number {
  if (self.hand.length === 0) return -1;

  const enemyFW = getTotalFirewallValue(opponent.firewalls);
  
  const scored = self.hand.map((card, index) => {
    let score = 0;
    
    if (self.faction === 'phantom') {
      switch (card.type) {
        case 'zeroday': score = opponent.hp <= 4 ? 100 : (self.hp > 10 ? 15 : 5); break;
        case 'siphon': score = enemyFW > 0 ? 40 : 30; break;
        case 'exploit': 
          const dmg = card.baseDamage + self.boost;
          score = enemyFW === 0 ? 60 + dmg : (dmg <= enemyFW ? 40 : 20 - (dmg - enemyFW));
          break;
        case 'payload': score = self.boost === 0 ? 30 : 0; break;
      }
    } else {
      switch (card.type) {
        case 'purge': 
          const fwCount = self.firewalls.length;
          score = fwCount >= 3 && opponent.hp <= fwCount + 3 ? 90 : (fwCount >= 4 ? 50 : 5);
          break;
        case 'patch': score = self.hp <= 10 ? 70 : 15; break;
        case 'firewall': score = opponent.boost > 0 ? 55 : 30; break;
        case 'exploit': score = enemyFW === 0 ? 45 : 15; break;
      }
    }
    
    return { index, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.index ?? -1;
}
