// ============================================================
// TSG Corporation - 共通型定義
// データ駆動設計の中核。新しい異常存在やE.G.O等はJSONを追加するだけで
// ここに定義された形に沿っていれば取り込める。
// ============================================================

export type Rarity = "ZAYIN" | "TETH" | "HE" | "WAW" | "ALEPH";

export type DamageAttr = "RED" | "WHITE" | "BLACK" | "PALE";

export type WorkType = "instinct" | "insight" | "attachment" | "repression";

export type StatKey = "courage" | "prudence" | "temperance" | "justice";

export type Phase = "morning" | "day" | "evening" | "night";

export type Department =
  | "info"      // 情報部
  | "safety"    // 安全部
  | "training"  // 訓練部
  | "welfare"   // 福祉部
  | "record"    // 記録部
  | "hq";       // 中央本部

export type StaffRank = "I" | "II" | "III" | "IV" | "V" | "EX";

export interface StatBlock {
  courage: number;
  prudence: number;
  temperance: number;
  justice: number;
}

export interface WorkAffinity {
  instinct: number;
  insight: number;
  attachment: number;
  repression: number;
}

export interface EGOReward {
  weaponId?: string;
  armorId?: string;
  giftIds?: string[];
}

export interface AbnormalityDef {
  id: string;
  name: string;
  risk: Rarity;
  damageAttr: DamageAttr;
  maxCounter: number;
  workAffinity: WorkAffinity; // 作業ごとの成功しやすさ(0-100の基礎値)
  description?: string;
  specialAbility?: string;
  egoReward?: EGOReward;
  breachDanger: number; // 収容違反時の脅威度(職員被害の基礎値)
  workDamage: { hp: number; sanity: number }; // 作業失敗時の基礎ダメージ
  isOriginal?: boolean; // プレイヤー生成物か
}

export interface EGOWeaponMod {
  id: string;
  name: string;
  description: string;
  effects: Partial<{ triggerRateBonus: number; damageBonus: number; aoeBonus: number }>;
}

export interface EGOWeaponDef {
  id: string;
  name: string;
  rarity: Rarity;
  damageAttr: DamageAttr;
  baseDamage: number;
  specialName: string;
  specialDescription: string;
  triggerRate?: number; // 特殊能力発動率(%)
  mods?: EGOWeaponMod[];
}

export interface EGOArmorDef {
  id: string;
  name: string;
  rarity: Rarity;
  resistances: Partial<Record<DamageAttr, number>>; // 耐性値(%軽減)
  description?: string;
}

export interface GiftDef {
  id: string;
  name: string;
  rarity: Rarity;
  statBonus: Partial<StatBlock>;
  description?: string;
}

export interface JobClassDef {
  id: string;
  name: string;
  description: string;
  ability: string; // 例: 指揮官/処刑人/医療班
  statWeights: Partial<StatBlock>;
}

export interface ResearchDef {
  id: string;
  name: string;
  category: "staff" | "medical" | "ego" | "alarm" | "containment";
  cost: number;
  description: string;
  prerequisite?: string;
  effectKey: string; // 適用される効果の識別子(systems側で解釈)
}

export interface SephirahDef {
  id: string;
  name: string;
  unlockDay: number;
  description: string;
  eventPoolId: string;
}

export interface GameEventDef {
  id: string;
  name: string;
  type: "disaster" | "sephirah" | "special";
  description: string;
  weight: number;
  effectKey: string;
  minDay?: number;
}

export interface UIThemeDef {
  id: string;
  name: string;
  vars: Record<string, string>; // CSS変数
}

// ---- ランタイム状態 ----

export interface StaffMember {
  id: string;
  name: string;
  rank: StaffRank;
  jobId: string;
  department: Department;
  stats: StatBlock;
  exp: number;
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  status: "active" | "resting" | "dead" | "broken";
  equippedWeaponId?: string;
  equippedArmorId?: string;
  equippedGiftIds: string[];
  assignedAbnormalityId?: string;
}

export interface AbnormalityInstance {
  defId: string;
  containedCounter: number;
  discovered: boolean;
  inBreach: boolean;
  breachHp: number;
}

export interface OwnedEGO {
  weapons: string[];
  armors: string[];
  gifts: string[];
}

export interface ResearchState {
  completed: string[];
  inProgress?: { id: string; remainingCost: number };
}

export interface FacilityState {
  level: number;
  energy: number;
  maxEnergy: number;
  departments: Record<Department, { headStaffId?: string }>;
}

export interface GameState {
  day: number;
  phase: Phase;
  facility: FacilityState;
  staff: StaffMember[];
  abnormalities: AbnormalityInstance[];
  ownedEGO: OwnedEGO;
  research: ResearchState;
  unlockedSephirah: string[];
  log: string[];
  endgame: { day50Triggered: boolean; day100Triggered: boolean; trueEndingCleared: boolean };
  seed: number;
  version: number;
}

export interface ModRegistry {
  abnormalities: Record<string, AbnormalityDef>;
  weapons: Record<string, EGOWeaponDef>;
  armors: Record<string, EGOArmorDef>;
  gifts: Record<string, GiftDef>;
  jobs: Record<string, JobClassDef>;
  research: Record<string, ResearchDef>;
  sephirah: Record<string, SephirahDef>;
  events: Record<string, GameEventDef>;
  themes: Record<string, UIThemeDef>;
  generatorParts?: GeneratorParts;
}

export interface GeneratorParts {
  concepts: string[];
  fears: string[];
  wishes: string[];
  urbanLegends: string[];
  animals: string[];
  machines: string[];
  nameTemplates: string[]; // "{a} の {b}" のようなテンプレート
}
