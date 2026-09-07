import type { GameState, ModRegistry, Department } from "../types.js";
import { RNG } from "../rng.js";
import { createStaff } from "./staff.js";

const DEPARTMENTS: Department[] = ["info", "safety", "training", "welfare", "record", "hq"];

export function newGame(reg: ModRegistry, seed: number): GameState {
  const rng = new RNG(seed);

  const state: GameState = {
    day: 1,
    phase: "morning",
    facility: {
      level: 1,
      energy: 300,
      maxEnergy: 1000,
      departments: DEPARTMENTS.reduce((acc, d) => {
        acc[d] = {};
        return acc;
      }, {} as Record<Department, { headStaffId?: string }>),
    },
    staff: [],
    abnormalities: [],
    ownedEGO: { weapons: [], armors: [], gifts: [] },
    research: { completed: [] },
    unlockedSephirah: [],
    log: ["施設 TSG Corporation の運用を開始した。"],
    endgame: { day50Triggered: false, day100Triggered: false, trueEndingCleared: false },
    seed,
    version: 1,
  };

  // 初期職員を数名雇用
  const jobIds = Object.keys(reg.jobs);
  for (let i = 0; i < 5; i++) {
    const jobId = jobIds.length > 0 ? rng.pick(jobIds) : "researcher";
    const dept = rng.pick(DEPARTMENTS);
    const staff = createStaff(`staff_init_${i}`, jobId, dept, rng, reg);
    state.staff.push(staff);
  }

  // 初期異常存在: 最も危険度の低いものを2〜3体収容済みとして開始
  const lowRisk = Object.values(reg.abnormalities)
    .filter((a) => a.risk === "ZAYIN")
    .slice(0, 3);
  for (const def of lowRisk) {
    state.abnormalities.push({
      defId: def.id,
      containedCounter: def.maxCounter,
      discovered: true,
      inBreach: false,
      breachHp: 0,
    });
  }

  return state;
}
