export const GAME_CONSTANTS = {
  ACTIONS_PER_TURN: 2,
  INITIAL_HAND_SIZE: 5,
  CARDS_DRAWN_PER_TURN: 1,
  ZERODAY_DAMAGE: 4,
  ZERODAY_SELF_DAMAGE: 2,
  PATCH_HEAL_AMOUNT: 3,
  PATCH_DRAW_AMOUNT: 2,
  PATCH_HP_THRESHOLD: 10,
  SIPHON_DRAIN_AMOUNT: 1,
  SIPHON_HEAL_AMOUNT: 1,
  SIPHON_DIRECT_DAMAGE: 2,
  PAYLOAD_BOOST_AMOUNT: 1,
} as const;

export const FACTIONS = {
  phantom: { id: 'phantom' as const, name: 'Phantom', startingHp: 22 },
  sentinel: { id: 'sentinel' as const, name: 'Sentinel', startingHp: 20 }
} as const;
