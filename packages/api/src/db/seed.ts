import 'dotenv/config';
import { getDb, closeDb } from './client.js';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('🌱 Seeding database...');
  
  const db = getDb();
  
  // Seed factions
  const factions = [
    { id: 'phantom', name: 'Phantom', description: 'Aggressive hackers focused on exploits and damage', starting_hp: 22 },
    { id: 'sentinel', name: 'Sentinel', description: 'Defensive security experts with firewalls and healing', starting_hp: 20 },
  ];
  
  for (const faction of factions) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO factions (id, name, description, starting_hp) VALUES (?, ?, ?, ?)`,
      args: [faction.id, faction.name, faction.description, faction.starting_hp],
    });
    console.log('✓ Faction:', faction.name);
  }
  
  // Seed cards
  const cards = [
    // Phantom cards
    { type: 'exploit', faction: 'phantom', name: 'Exploit', description: 'Deal base damage to opponent. Boosted by Payload.', base_value: null },
    { type: 'payload', faction: 'phantom', name: 'Payload', description: 'Boost next Exploit by +1 damage.', base_value: 1 },
    { type: 'zeroday', faction: 'phantom', name: 'Zero-Day', description: 'Deal 4 damage bypassing firewalls. Take 2 self-damage.', base_value: 4 },
    { type: 'siphon', faction: 'phantom', name: 'Siphon', description: 'Drain 1 from firewall and heal 1. Or deal 2 if no firewalls.', base_value: 1 },
    
    // Sentinel cards
    { type: 'firewall', faction: 'sentinel', name: 'Firewall', description: 'Deploy a firewall that blocks damage. Excess damage backtraces!', base_value: null },
    { type: 'patch', faction: 'sentinel', name: 'Patch', description: 'Heal 3 HP if at 10 or below. Otherwise draw 2 cards.', base_value: 3 },
    { type: 'purge', faction: 'sentinel', name: 'Purge', description: 'Destroy all own firewalls. Deal damage equal to count. Draw 1.', base_value: null },
    { type: 'exploit', faction: 'sentinel', name: 'Counter-Strike', description: 'Basic exploit for Sentinel. Fixed 2 damage.', base_value: 2 },
  ];
  
  for (const card of cards) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO cards (id, type, faction, name, description, base_value, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      args: [randomUUID(), card.type, card.faction, card.name, card.description, card.base_value],
    });
    console.log('✓ Card:', card.name);
  }
  
  console.log('✅ Seeding complete!');
  await closeDb();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
