export type CardType = 'exploit' | 'payload' | 'zeroday' | 'siphon' | 'firewall' | 'patch' | 'purge';

export interface BaseCard {
  readonly id: string;
  readonly type: CardType;
}

export interface ExploitCard extends BaseCard {
  readonly type: 'exploit';
  readonly baseDamage: number;
}

export interface FirewallCard extends BaseCard {
  readonly type: 'firewall';
  readonly blockValue: number;
}

export interface PayloadCard extends BaseCard { readonly type: 'payload'; }
export interface ZeroDayCard extends BaseCard { readonly type: 'zeroday'; }
export interface SiphonCard extends BaseCard { readonly type: 'siphon'; }
export interface PatchCard extends BaseCard { readonly type: 'patch'; }
export interface PurgeCard extends BaseCard { readonly type: 'purge'; }

export type Card = ExploitCard | PayloadCard | ZeroDayCard | SiphonCard | FirewallCard | PatchCard | PurgeCard;

export interface ActiveFirewall {
  readonly id: number;
  value: number;
}
