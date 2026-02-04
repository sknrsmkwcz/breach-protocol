import type { PlayerState, Card, ExploitCard, GameEvent, PlayerIndex, ActiveFirewall } from '../types';
import { GAME_CONSTANTS } from '../types';
import { resolveExploitVsFirewall, createActiveFirewall } from './firewall';

export interface CardEffectResult {
  attacker: PlayerState;
  defender: PlayerState;
  events: GameEvent[];
}

export interface EffectContext {
  attackerIndex: PlayerIndex;
  defenderIndex: PlayerIndex;
}

export function playExploit(
  card: ExploitCard,
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  const events: GameEvent[] = [];
  const boost = attacker.boost;
  const totalDamage = card.baseDamage + boost;
  
  let newAttacker = { ...attacker, boost: 0 };
  
  if (boost > 0) {
    events.push({ type: 'boost_consumed', player: ctx.attackerIndex, amount: boost });
  }
  
  events.push({ type: 'card_played', player: ctx.attackerIndex, cardType: 'exploit', cardValue: totalDamage });
  
  const resolution = resolveExploitVsFirewall(totalDamage, defender.firewalls);
  let newDefender = { ...defender, firewalls: [...resolution.remainingFirewalls] };
  
  if (resolution.destroyedFirewalls.length > 0) {
    events.push({ type: 'firewall_destroyed', player: ctx.defenderIndex, firewalls: resolution.destroyedFirewalls });
  }
  
  if (resolution.backtraceToAttacker > 0) {
    newAttacker = { ...newAttacker, hp: newAttacker.hp - resolution.backtraceToAttacker };
    events.push({ type: 'damage', target: ctx.attackerIndex, amount: resolution.backtraceToAttacker, source: 'backtrace' });
  }
  
  if (resolution.damageToDefender > 0) {
    newDefender = { ...newDefender, hp: newDefender.hp - resolution.damageToDefender };
    events.push({ type: 'damage', target: ctx.defenderIndex, amount: resolution.damageToDefender, source: 'exploit' });
  }
  
  return { attacker: newAttacker, defender: newDefender, events };
}

export function playPayload(
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  return {
    attacker: { ...attacker, boost: GAME_CONSTANTS.PAYLOAD_BOOST_AMOUNT },
    defender,
    events: [
      { type: 'card_played', player: ctx.attackerIndex, cardType: 'payload' },
      { type: 'boost_applied', player: ctx.attackerIndex, amount: GAME_CONSTANTS.PAYLOAD_BOOST_AMOUNT },
    ],
  };
}

export function playZeroDay(
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  return {
    attacker: { ...attacker, hp: attacker.hp - GAME_CONSTANTS.ZERODAY_SELF_DAMAGE },
    defender: { ...defender, hp: defender.hp - GAME_CONSTANTS.ZERODAY_DAMAGE },
    events: [
      { type: 'card_played', player: ctx.attackerIndex, cardType: 'zeroday' },
      { type: 'damage', target: ctx.defenderIndex, amount: GAME_CONSTANTS.ZERODAY_DAMAGE, source: 'zeroday' },
      { type: 'damage', target: ctx.attackerIndex, amount: GAME_CONSTANTS.ZERODAY_SELF_DAMAGE, source: 'zeroday' },
    ],
  };
}

export function playSiphon(
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  const events: GameEvent[] = [{ type: 'card_played', player: ctx.attackerIndex, cardType: 'siphon' }];
  
  if (defender.firewalls.length > 0) {
    const targetFw = defender.firewalls[0];
    const newValue = targetFw.value - GAME_CONSTANTS.SIPHON_DRAIN_AMOUNT;
    
    let newFirewalls: ActiveFirewall[];
    if (newValue <= 0) {
      newFirewalls = defender.firewalls.slice(1);
      events.push({ type: 'firewall_destroyed', player: ctx.defenderIndex, firewalls: [targetFw] });
    } else {
      newFirewalls = [{ ...targetFw, value: newValue }, ...defender.firewalls.slice(1)];
    }
    
    events.push({ type: 'heal', target: ctx.attackerIndex, amount: GAME_CONSTANTS.SIPHON_HEAL_AMOUNT, source: 'siphon' });
    
    return {
      attacker: { ...attacker, hp: attacker.hp + GAME_CONSTANTS.SIPHON_HEAL_AMOUNT },
      defender: { ...defender, firewalls: newFirewalls },
      events,
    };
  } else {
    events.push({ type: 'damage', target: ctx.defenderIndex, amount: GAME_CONSTANTS.SIPHON_DIRECT_DAMAGE, source: 'siphon' });
    return {
      attacker,
      defender: { ...defender, hp: defender.hp - GAME_CONSTANTS.SIPHON_DIRECT_DAMAGE },
      events,
    };
  }
}

export function playFirewall(
  card: { blockValue: number },
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  const newFirewall = createActiveFirewall(card.blockValue);
  return {
    attacker: { ...attacker, firewalls: [...attacker.firewalls, newFirewall] },
    defender,
    events: [
      { type: 'card_played', player: ctx.attackerIndex, cardType: 'firewall', cardValue: card.blockValue },
      { type: 'firewall_deployed', player: ctx.attackerIndex, value: card.blockValue },
    ],
  };
}

export function playPatch(
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  const events: GameEvent[] = [{ type: 'card_played', player: ctx.attackerIndex, cardType: 'patch' }];
  
  if (attacker.hp <= GAME_CONSTANTS.PATCH_HP_THRESHOLD) {
    events.push({ type: 'heal', target: ctx.attackerIndex, amount: GAME_CONSTANTS.PATCH_HEAL_AMOUNT, source: 'patch' });
    return {
      attacker: { ...attacker, hp: attacker.hp + GAME_CONSTANTS.PATCH_HEAL_AMOUNT },
      defender,
      events,
    };
  } else {
    const drawCount = Math.min(GAME_CONSTANTS.PATCH_DRAW_AMOUNT, attacker.deck.length);
    const newDeck = [...attacker.deck];
    const drawnCards = newDeck.splice(-drawCount, drawCount);
    events.push({ type: 'draw', player: ctx.attackerIndex, count: drawCount });
    return {
      attacker: { ...attacker, deck: newDeck, hand: [...attacker.hand, ...drawnCards] },
      defender,
      events,
    };
  }
}

export function playPurge(
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  const events: GameEvent[] = [{ type: 'card_played', player: ctx.attackerIndex, cardType: 'purge' }];
  const fwCount = attacker.firewalls.length;
  
  let newAttacker = { ...attacker };
  let newDefender = { ...defender };
  
  if (fwCount > 0) {
    events.push({ type: 'firewall_destroyed', player: ctx.attackerIndex, firewalls: attacker.firewalls });
    events.push({ type: 'damage', target: ctx.defenderIndex, amount: fwCount, source: 'purge' });
    newAttacker = { ...newAttacker, firewalls: [] };
    newDefender = { ...newDefender, hp: newDefender.hp - fwCount };
  }
  
  if (newAttacker.deck.length > 0) {
    const newDeck = [...newAttacker.deck];
    const drawnCard = newDeck.pop()!;
    events.push({ type: 'draw', player: ctx.attackerIndex, count: 1 });
    newAttacker = { ...newAttacker, deck: newDeck, hand: [...newAttacker.hand, drawnCard] };
  }
  
  return { attacker: newAttacker, defender: newDefender, events };
}

export function playCard(
  card: Card,
  attacker: PlayerState,
  defender: PlayerState,
  ctx: EffectContext
): CardEffectResult {
  switch (card.type) {
    case 'exploit': return playExploit(card, attacker, defender, ctx);
    case 'payload': return playPayload(attacker, defender, ctx);
    case 'zeroday': return playZeroDay(attacker, defender, ctx);
    case 'siphon': return playSiphon(attacker, defender, ctx);
    case 'firewall': return playFirewall(card, attacker, defender, ctx);
    case 'patch': return playPatch(attacker, defender, ctx);
    case 'purge': return playPurge(attacker, defender, ctx);
  }
}
