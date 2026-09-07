import type { GameState, ModRegistry } from "../types.js";

export function startResearch(state: GameState, reg: ModRegistry, id: string, log: (m: string) => void): { ok: boolean; reason?: string } {
  const def = reg.research[id];
  if (!def) return { ok: false, reason: "存在しない研究" };
  if (state.research.completed.includes(id)) return { ok: false, reason: "既に完了している" };
  if (def.prerequisite && !state.research.completed.includes(def.prerequisite)) {
    return { ok: false, reason: "前提研究が未完了" };
  }
  if (state.research.inProgress) return { ok: false, reason: "他の研究が進行中" };
  state.research.inProgress = { id, remainingCost: def.cost };
  log(`研究「${def.name}」を開始した。`);
  return { ok: true };
}

// 1フェーズ経過ごとに、投入エネルギーの一部を研究に充当する
export function progressResearch(state: GameState, reg: ModRegistry, investEnergy: number, log: (m: string) => void) {
  if (!state.research.inProgress) return;
  const invest = Math.min(investEnergy, state.facility.energy, state.research.inProgress.remainingCost);
  if (invest <= 0) return;
  state.facility.energy -= invest;
  state.research.inProgress.remainingCost -= invest;
  if (state.research.inProgress.remainingCost <= 0) {
    const id = state.research.inProgress.id;
    state.research.completed.push(id);
    state.research.inProgress = undefined;
    const def = reg.research[id];
    log(`研究「${def?.name ?? id}」が完了した。`);
    applyResearchEffect(state, def?.effectKey);
  }
}

function applyResearchEffect(state: GameState, effectKey?: string) {
  if (!effectKey) return;
  switch (effectKey) {
    case "energy_cap_up":
      state.facility.maxEnergy += 200;
      break;
    case "medical_auto_heal":
      // フラグとして research.completed に残るのみ。回復処理側で参照する。
      break;
    default:
      break;
  }
}
