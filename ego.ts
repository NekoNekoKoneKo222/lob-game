import type { GameState, ModRegistry, StaffMember } from "../types.js";
import { RNG } from "../rng.js";

const EXTRACT_COST_BY_RARITY: Record<string, number> = {
  ZAYIN: 60, TETH: 120, HE: 220, WAW: 400, ALEPH: 700,
};

export function extractEGO(
  state: GameState, reg: ModRegistry, abnormalityDefId: string, kind: "weapon" | "armor", rng: RNG, log: (m: string) => void
): { ok: boolean; reason?: string } {
  const def = reg.abnormalities[abnormalityDefId];
  const inst = state.abnormalities.find((a) => a.defId === abnormalityDefId);
  if (!def || !inst) return { ok: false, reason: "対象異常存在が見つからない" };
  if (inst.inBreach) return { ok: false, reason: "収容違反中は抽出できない" };
  const targetId = kind === "weapon" ? def.egoReward?.weaponId : def.egoReward?.armorId;
  if (!targetId) return { ok: false, reason: "この異常存在からは抽出できない" };

  const rarity = kind === "weapon" ? reg.weapons[targetId]?.rarity : reg.armors[targetId]?.rarity;
  const cost = EXTRACT_COST_BY_RARITY[rarity ?? "ZAYIN"] ?? 100;
  if (state.facility.energy < cost) return { ok: false, reason: "エネルギーが不足している" };

  const successRate = 55 + (def.maxCounter - inst.containedCounter < 0 ? 0 : 5);
  if (!rng.chance(successRate)) {
    state.facility.energy -= Math.round(cost * 0.4);
    log(`「${def.name}」からのE.G.O抽出に失敗した。(エネルギー消費のみ)`);
    return { ok: true };
  }

  state.facility.energy -= cost;
  if (kind === "weapon") {
    if (!state.ownedEGO.weapons.includes(targetId)) state.ownedEGO.weapons.push(targetId);
    log(`E.G.O武器「${reg.weapons[targetId]?.name}」を抽出した。`);
  } else {
    if (!state.ownedEGO.armors.includes(targetId)) state.ownedEGO.armors.push(targetId);
    log(`E.G.O防具「${reg.armors[targetId]?.name}」を抽出した。`);
  }
  return { ok: true };
}

export function equipWeapon(state: GameState, staffId: string, weaponId: string | undefined) {
  const s = state.staff.find((x) => x.id === staffId);
  if (s) s.equippedWeaponId = weaponId;
}
export function equipArmor(state: GameState, staffId: string, armorId: string | undefined) {
  const s = state.staff.find((x) => x.id === staffId);
  if (s) s.equippedArmorId = armorId;
}
export function equipGift(state: GameState, staffId: string, giftId: string) {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s) return;
  if (s.equippedGiftIds.includes(giftId)) {
    s.equippedGiftIds = s.equippedGiftIds.filter((g) => g !== giftId);
  } else if (s.equippedGiftIds.length < 3) {
    s.equippedGiftIds.push(giftId);
  }
}

// 装備改造: 研究「ego_mod」完了後に使用可能。武器の発動率/威力を段階強化する。
export function modifyWeapon(reg: ModRegistry, weaponId: string, modId: string, log: (m: string) => void): boolean {
  const weapon = reg.weapons[weaponId];
  const mod = weapon?.mods?.find((m) => m.id === modId);
  if (!weapon || !mod) return false;
  if (mod.effects.triggerRateBonus) {
    weapon.triggerRate = (weapon.triggerRate ?? 0) + mod.effects.triggerRateBonus;
  }
  if (mod.effects.damageBonus) {
    weapon.baseDamage += mod.effects.damageBonus;
  }
  log(`「${weapon.name}」を改造: ${mod.name} (${mod.description})`);
  return true;
}
