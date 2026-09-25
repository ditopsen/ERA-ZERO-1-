/**
 * Types and definitions for INK BATTLE 3D and GDevelop 5 Engine Architecture
 */

export type TeamId = 'cyan' | 'magenta' | 'yellow' | 'green';

export interface PlayerCustomization {
  name: string;
  gender: 'male' | 'female';
  outfit: 'tactical' | 'cyberpunk' | 'chroma_armor';
  hairColor: string;
  teamColor: TeamId;
  teamHex: string;
}

export type MapId = 'nexus_citadel' | 'void_gardens' | 'chroma_factory';

export interface MapData {
  id: MapId;
  name: string;
  theme: string;
  description: string;
  skyColor: number;
  fogColor: number;
  groundColor: number;
  accentColor: number;
  hazardsDescription: string;
  jumpPadsCount: number;
  hazardsCount: number;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotConfig {
  id: string;
  name: string;
  team: TeamId;
  difficulty: BotDifficulty;
  speed: number;
  reactionTime: number; // in seconds
  accuracy: number; // 0 to 1
  hp: number;
  maxHp: number;
  isAlive: boolean;
  respawnTime: number;
  targetCore: boolean;
}

export type CraftedItemType = 'sword' | 'shield' | 'cannon';

export interface CraftedItem {
  id: string;
  type: CraftedItemType;
  name: string;
  description: string;
  durability: number;
  maxDurability: number;
  power: number;
  color: string;
  icon: string;
  perk: string;
  createdAt: number;
  drawingPaths?: DrawingPoint[][];
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface BaseCoreState {
  team: TeamId;
  name: string;
  hp: number;
  maxHp: number;
  canRespawn: boolean;
  position: [number, number, number];
  isDestroyed: boolean;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  timestamp: number;
}

export interface MatchStats {
  scoreTeamA: number;
  scoreTeamB: number;
  playerKills: number;
  playerDeaths: number;
  coreDamageDealt: number;
  craftedCount: number;
  matchTime: number;
  winner: TeamId | null;
}

// GDevelop 5 Architecture Types for Interactive Event Sheets
export interface GDevelopCondition {
  type: 'condition';
  text: string;
  icon?: string;
  parameters: { name: string; value: string }[];
  inverted?: boolean;
}

export interface GDevelopAction {
  type: 'action';
  text: string;
  icon?: string;
  parameters: { name: string; value: string }[];
}

export interface GDevelopEventBlock {
  id: string;
  title: string;
  comment?: string;
  conditions: GDevelopCondition[];
  actions: GDevelopAction[];
  subEvents?: GDevelopEventBlock[];
}

export interface GDevelopModuleGuide {
  moduleId: number;
  title: string;
  category: string;
  description: string;
  requiredExtensions: { name: string; author: string; purpose: string }[];
  requiredBehaviors: { objectName: string; behaviorName: string; purpose: string }[];
  variables: { scope: 'Global' | 'Scene' | 'Object'; name: string; type: 'Number' | 'String' | 'Boolean' | 'Structure'; initialValue: string; description: string }[];
  eventBlocks: GDevelopEventBlock[];
  expertTips: string[];
}
