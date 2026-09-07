import type { GameState, ModRegistry, StaffMember, AbnormalityInstance, WorkType } from "../types.js";
import { RNG } from "../rng.js";
import { applyDamage, gainExp } from "./staff.js";

const WORK_STAT_MAP: Record<WorkType, "courage" | "prudence" | "temperance" | "justice"> = {
  instinct: "courage",
  insight: "prudence",
  attachment: "temperance",
  repression: "justice",
};

export interface WorkResult {
  success: boolean;
  energyGained: number;
  giftFound: boolean;
  message: string;
}

export function assignWork(
  state: GameState, staffId: string, abnormalityDefId: string
): { ok: boolean; reason?: string } {
  const staff = state.staff.find((s) => s.id === staffId);
  const ab = state.abnormalities.find((a) => a.defId === abnormalityDefId);
  if (!staff || !ab) return { ok: false, reason: "対象が見つからない" };
  if (staff.status !== "active") return { ok: false, reason: "この職員は現在作業できない状態" };
  if (ab.inBreach) return { ok: false, reason: "収容違反中は作業を指示できない" };
  staff.assignedAbnormalityId = abnormalityDefId;
  return { ok: true };
}

export function resolveWork(
  state: GameState, reg: ModRegistry, staff: StaffMember, workType: WorkType, rng: RNG, log: (m: string) => void
): WorkResult | null {
  if (!staff.assignedAbnormalityId) return null;
  const instance = state.abnormalities.find((a) => a.defId === staff.assignedAbnormalityId);
  const def = instance ? reg.abnormalities[instance.defId] : undefined;
  if (!instance || !def) return null;

  const statKey = WORK_STAT_MAP[workType];
  const statValue = staff.stats[statKey];
  const affinity = def.workAffinity[workType]; // 0-100 基礎値
  const rankBonus = ["I", "II", "III", "IV", "V", "EX"].indexOf(staff.rank) * 4;
  const successRate = Math.max(5, Math.min(95, affinity + statValue * 0.8 + rankBonus - 20));

  const success = rng.chance(successRate);
  let energyGained = 0;
  let giftFound = false;

  if (success) {
    energyGained = Math.round(8 + statValue * 0.3 + rng.int(0, 6));
    state.facility.energy = Math.min(state.facility.maxEnergy, state.facility.energy + energyGained);
    gainExp(staff, 15, log);
    if (def.egoReward?.giftIds && def.egoReward.giftIds.length > 0 && rng.chance(12)) {
      const giftId = rng.pick(def.egoReward.giftIds);
      if (!state.ownedEGO.gifts.includes(giftId)) {
        state.ownedEGO.gifts.push(giftId);
        giftFound = true;
      }
    }
    if (instance.containedCounter < def.maxCounter && rng.chance(20)) {
      instance.containedCounter = Math.min(def.maxCounter, instance.containedCounter + 1);
    }
    const msg = `${staff.name} は「${def.name}」への${workLabel(workType)}作業に成功した。(+${energyGained} エネルギー)`;
    log(msg);
    staff.assignedAbnormalityId = undefined;
    return { success: true, energyGained, giftFound, message: msg };
  } else {
    const hpDmg = def.workDamage.hp + rng.int(0, 5);
    const sanDmg = def.workDamage.sanity + rng.int(0, 5);
    applyDamage(staff, hpDmg, sanDmg, log);
    instance.containedCounter = Math.max(0, instance.containedCounter - 1);
    const msg = `${staff.name} は「${def.name}」への${workLabel(workType)}作業に失敗した。(カウンター -1)`;
    log(msg);
    staff.assignedAbnormalityId = undefined;
    if (instance.containedCounter <= 0) {
      instance.inBreach = true;
      instance.breachHp = 80 + def.breachDanger * 4;
      log(`⚠ 「${def.name}」のQliphothカウンターが0になった。収容違反発生!`);
    }
    return { success: false, energyGained: 0, giftFound: false, message: msg };
  }
}

function workLabel(w: WorkType): string {
  switch (w) {
    case "instinct": return "本能";
    case "insight": return "洞察";
    case "attachment": return "愛着";
    case "repression": return "抑圧";
  }
}

// フェーズ経過時、カウンターが未対応の異常存在は自然減少する
export function decayCounters(state: GameState, reg: ModRegistry, log: (m: string) => void) {
  for (const inst of state.abnormalities) {
    if (inst.inBreach) continue;
    const def = reg.abnormalities[inst.defId];
    if (!def) continue;
    if (Math.random() < 0.15 && inst.containedCounter > 0) {
      inst.containedCounter -= 1;
      if (inst.containedCounter <= 0) {
        inst.inBreach = true;
        inst.breachHp = 80 + def.breachDanger * 4;
        log(`⚠ 「${def.name}」が放置により収容違反を起こした!`);
      }
    }
  }
}
