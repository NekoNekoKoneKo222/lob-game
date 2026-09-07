import type { ModRegistry, AbnormalityDef, Rarity, DamageAttr, WorkType } from "../types.js";
import { RNG } from "../rng.js";

const RISK_ORDER: Rarity[] = ["ZAYIN", "TETH", "HE", "WAW", "ALEPH"];
const ATTRS: DamageAttr[] = ["RED", "WHITE", "BLACK", "PALE"];
const WORKS: WorkType[] = ["instinct", "insight", "attachment", "repression"];

interface GenSource {
  category: "concept" | "fear" | "wish" | "urbanLegend" | "animal" | "machine";
  value: string;
}

export function generateOriginalAbnormality(reg: ModRegistry, rng: RNG, seedIdCounter: number): AbnormalityDef | null {
  const parts = reg.generatorParts;
  if (!parts) return null;

  const pickAll: GenSource[] = [
    { category: "concept", value: rng.pick(parts.concepts) },
    { category: "fear", value: rng.pick(parts.fears) },
    { category: "wish", value: rng.pick(parts.wishes) },
    { category: "urbanLegend", value: rng.pick(parts.urbanLegends) },
    { category: "animal", value: rng.pick(parts.animals) },
    { category: "machine", value: rng.pick(parts.machines) },
  ];
  // 2〜3要素をランダムに組み合わせて名前・特徴を生成
  const n = rng.int(2, 3);
  const chosen: GenSource[] = [];
  const pool = [...pickAll];
  for (let i = 0; i < n; i++) {
    const idx = rng.int(0, pool.length - 1);
    chosen.push(pool.splice(idx, 1)[0]);
  }

  const template = rng.pick(parts.nameTemplates);
  const name = template
    .replace("{a}", chosen[0]?.value ?? "")
    .replace("{b}", chosen[1]?.value ?? chosen[0]?.value ?? "")
    .replace("{c}", chosen[2]?.value ?? "");

  const risk = RISK_ORDER[Math.min(RISK_ORDER.length - 1, rng.int(0, 3))];
  const riskIdx = RISK_ORDER.indexOf(risk);
  const affinityBase = 30 + riskIdx * 5;

  const workAffinity: Record<WorkType, number> = { instinct: 0, insight: 0, attachment: 0, repression: 0 };
  for (const w of WORKS) workAffinity[w] = affinityBase + rng.int(-10, 20);

  const def: AbnormalityDef = {
    id: `original_${Date.now()}_${seedIdCounter}`,
    name,
    risk,
    damageAttr: rng.pick(ATTRS),
    maxCounter: 3 + riskIdx * 2,
    workAffinity,
    description: `${chosen.map((c) => c.value).join(" + ")} から生まれた未知の異常存在。`,
    breachDanger: 10 + riskIdx * 8,
    workDamage: { hp: 5 + riskIdx * 3, sanity: 5 + riskIdx * 3 },
    isOriginal: true,
  };
  reg.abnormalities[def.id] = def;
  return def;
}
